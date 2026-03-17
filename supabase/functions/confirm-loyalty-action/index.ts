import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ActionPayload {
  memberCode: string;
  campaignId: string;
  actionType: "visit" | "redemption";
  validationInput?: string;
  deviceInfo?: Record<string, unknown>;
  rewardTierId?: string;
  bypassCoolDown?: boolean;
}

interface BonusRule {
  id: string;
  name: string;
  rule_type: string;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  multiplier: number;
}

interface CampaignReward {
  id: string;
  reward_name: string;
  threshold: number;
  reward_description: string;
  reward_type: string;
  sort_order: number;
}

function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5); // equivalent to Math.round for positive values, explicit .5-rounds-up
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function evaluateBonusRules(rules: BonusRule[], nowUtc: Date): { multiplier: number; appliedRule: BonusRule | null } {
  const dayOfWeek = nowUtc.getUTCDay();
  const currentMinutes = nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes();

  let bestMultiplier = 1;
  let appliedRule: BonusRule | null = null;

  for (const rule of rules) {
    let matches = false;

    if (rule.rule_type === "day_of_week") {
      matches = rule.day_of_week !== null && rule.day_of_week === dayOfWeek;
    } else if (rule.rule_type === "time_window") {
      const hasDay = rule.day_of_week !== null;
      const dayMatch = !hasDay || rule.day_of_week === dayOfWeek;
      if (dayMatch && rule.start_time && rule.end_time) {
        const start = timeToMinutes(rule.start_time);
        const end = timeToMinutes(rule.end_time);
        if (start <= end) {
          matches = currentMinutes >= start && currentMinutes < end;
        } else {
          matches = currentMinutes >= start || currentMinutes < end;
        }
      }
    } else if (rule.rule_type === "custom_simple") {
      matches = true;
    }

    if (matches && rule.multiplier > bestMultiplier) {
      bestMultiplier = rule.multiplier;
      appliedRule = rule;
    }
  }

  return { multiplier: bestMultiplier, appliedRule };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ActionPayload = await req.json();
    const { memberCode, campaignId, actionType, deviceInfo, rewardTierId, bypassCoolDown } = payload;

    if (!memberCode || !campaignId || !actionType) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: account, error: accountError } = await supabase
      .from("loyalty_accounts")
      .select("*, leads(name, email)")
      .eq("member_code", memberCode)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ success: false, error: "Member not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: lockout } = await supabase
      .from("validation_lockouts")
      .select("*")
      .eq("loyalty_account_id", account.id)
      .is("unlocked_at", null)
      .maybeSingle();

    if (lockout) {
      return new Response(
        JSON.stringify({ success: false, error: "Account is locked", locked: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("*, loyalty_programs(*)")
      .eq("id", campaignId)
      .maybeSingle();

    if (!campaign) {
      return new Response(
        JSON.stringify({ success: false, error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (campaign.status === "paused") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This rewards program is temporarily paused.",
          paused: true
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const loyaltyProgram = campaign.loyalty_programs?.[0] || campaign.config?.loyalty || {};
    const threshold = loyaltyProgram.threshold || 10;

    if (actionType === "visit") {
      const coolDownHours = campaign.config?.loyalty?.coolDownHours ?? 0;

      if (coolDownHours > 0 && !bypassCoolDown) {
        const { data: lastVisit } = await supabase
          .from("loyalty_progress_log")
          .select("created_at")
          .eq("loyalty_account_id", account.id)
          .in("action_type", ["visit_confirmed", "reward_unlocked"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastVisit) {
          const lastVisitTime = new Date(lastVisit.created_at).getTime();
          const nextAvailableTime = lastVisitTime + coolDownHours * 60 * 60 * 1000;
          const nowMs = Date.now();

          if (nowMs < nextAvailableTime) {
            const nextAvailableAt = new Date(nextAvailableTime).toISOString();
            const nextDate = new Date(nextAvailableTime);
            const now = new Date();
            const isSameDay = nextDate.toDateString() === now.toDateString();
            const timeStr = nextDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
            const friendlyTime = isSameDay ? `at ${timeStr} today` : `after ${timeStr} on ${nextDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;

            return new Response(
              JSON.stringify({
                success: false,
                error: `Not quite yet! Your next stamp will be available ${friendlyTime}.`,
                coolDown: true,
                nextAvailableAt,
              }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      const { data: bonusRules } = await supabase
        .from("campaign_bonus_rules")
        .select("id, name, rule_type, day_of_week, start_time, end_time, multiplier")
        .eq("campaign_id", campaignId)
        .eq("active", true);

      const nowUtc = new Date();
      const { multiplier, appliedRule } = evaluateBonusRules(bonusRules || [], nowUtc);
      const stampValue = roundHalfUp(1 * multiplier);

      const oldProgress = account.current_progress || 0;
      const newProgress = oldProgress + stampValue;

      const { data: allRewards } = await supabase
        .from("campaign_rewards")
        .select("id, reward_name, threshold, reward_description, reward_type, sort_order")
        .eq("campaign_id", campaignId)
        .eq("active", true)
        .order("threshold", { ascending: true });

      const crossedTiers: CampaignReward[] = (allRewards || []).filter(
        (r: CampaignReward) => oldProgress < r.threshold && newProgress >= r.threshold
      );

      const anyRewardUnlocked = crossedTiers.length > 0 || newProgress >= threshold;

      const { error: updateError } = await supabase
        .from("loyalty_accounts")
        .update({
          current_progress: newProgress,
          total_visits: (account.total_visits || 0) + 1,
          reward_unlocked: anyRewardUnlocked,
          reward_unlocked_at: anyRewardUnlocked ? nowUtc.toISOString() : account.reward_unlocked_at,
        })
        .eq("id", account.id);

      if (updateError) throw updateError;

      await supabase.from("loyalty_progress_log").insert({
        loyalty_account_id: account.id,
        campaign_id: campaignId,
        action_type: anyRewardUnlocked ? "reward_unlocked" : "visit_confirmed",
        quantity: 1,
        stamp_value: stampValue,
        bonus_rule_id: appliedRule?.id || null,
        device_info: deviceInfo || {},
      });

      const unlockedRewards: Array<{ tierId: string; rewardName: string; threshold: number }> = [];

      for (const tier of crossedTiers) {
        unlockedRewards.push({
          tierId: tier.id,
          rewardName: tier.reward_name,
          threshold: tier.threshold,
        });
      }

      const rewardUnlocked = crossedTiers.length > 0 ||
        (allRewards && allRewards.length === 0 && newProgress >= threshold);

      return new Response(
        JSON.stringify({
          success: true,
          newProgress,
          rewardUnlocked,
          threshold,
          stampValue,
          bonusApplied: appliedRule !== null,
          bonusRuleName: appliedRule?.name || null,
          unlockedRewards,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (actionType === "redemption") {
      if (!account.reward_unlocked) {
        return new Response(
          JSON.stringify({ success: false, error: "No reward available to redeem" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const resetBehavior = loyaltyProgram.reset_behavior || loyaltyProgram.resetBehavior || "reset";
      const expiryDays = campaign.config?.screens?.redemption?.expiryDays || 30;
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

      const newProgress = resetBehavior === "rollover"
        ? Math.max(0, (account.current_progress || 0) - threshold)
        : 0;

      let tierId: string | null = rewardTierId || null;
      let rewardName = loyaltyProgram.reward_name || loyaltyProgram.rewardName || "Free Reward";

      if (tierId) {
        const { data: tier } = await supabase
          .from("campaign_rewards")
          .select("id, reward_name")
          .eq("id", tierId)
          .eq("campaign_id", campaignId)
          .maybeSingle();
        if (tier) {
          rewardName = tier.reward_name;
        }
      } else {
        const { data: firstTier } = await supabase
          .from("campaign_rewards")
          .select("id, reward_name")
          .eq("campaign_id", campaignId)
          .eq("active", true)
          .order("threshold", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (firstTier) {
          tierId = firstTier.id;
          rewardName = firstTier.reward_name;
        }
      }

      const shortCode = generateShortCode();
      const redemptionToken = crypto.randomUUID();

      const { data: redemption, error: mainRedemptionError } = await supabase
        .from("redemptions")
        .insert({
          campaign_id: campaignId,
          client_id: campaign.client_id,
          prize_name: rewardName,
          short_code: shortCode,
          redemption_token: redemptionToken,
          token_expires_at: expiresAt,
          email: account.leads?.email || null,
          status: "valid",
          expires_at: expiresAt,
          metadata: {
            loyalty_account_id: account.id,
            member_code: account.member_code,
            member_name: account.leads?.name || null,
            source: "loyalty_program",
          },
        })
        .select("id")
        .single();

      if (mainRedemptionError) {
        console.error("Error creating main redemption:", mainRedemptionError);
        throw mainRedemptionError;
      }

      const { error: loyaltyRedemptionError } = await supabase.from("loyalty_redemptions").insert({
        loyalty_account_id: account.id,
        campaign_id: campaignId,
        short_code: shortCode,
        status: "valid",
        expires_at: expiresAt,
        redemption_id: redemption.id,
        redemption_source: "standard",
        reward_tier_id: tierId,
      });

      if (loyaltyRedemptionError) {
        console.error("Error creating loyalty redemption:", loyaltyRedemptionError);
        throw loyaltyRedemptionError;
      }

      await supabase
        .from("loyalty_accounts")
        .update({
          current_progress: newProgress,
          reward_unlocked: false,
          reward_unlocked_at: null,
        })
        .eq("id", account.id);

      await supabase.from("loyalty_progress_log").insert({
        loyalty_account_id: account.id,
        campaign_id: campaignId,
        action_type: "reward_redeemed",
        quantity: 1,
        stamp_value: 0,
        device_info: deviceInfo || {},
      });

      const supabaseFunctionsUrl = `${supabaseUrl}/functions/v1/send-redemption-email`;
      fetch(supabaseFunctionsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ redemptionId: redemption.id }),
      }).catch((err) => console.error("Failed to trigger email:", err));

      return new Response(
        JSON.stringify({
          success: true,
          shortCode,
          redemptionToken,
          newProgress,
          rewardName,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing loyalty action:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateShortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
