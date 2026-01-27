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
    const { memberCode, campaignId, actionType, deviceInfo } = payload;

    if (!memberCode || !campaignId || !actionType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: account, error: accountError } = await supabase
      .from("loyalty_accounts")
      .select("*")
      .eq("member_code", memberCode)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: "Member not found" }),
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
        JSON.stringify({ error: "Account is locked", locked: true }),
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
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const loyaltyProgram = campaign.loyalty_programs?.[0] || campaign.config?.loyalty || {};
    const threshold = loyaltyProgram.threshold || 10;

    if (actionType === "visit") {
      const newProgress = (account.current_progress || 0) + 1;
      const rewardUnlocked = newProgress >= threshold;

      const { error: updateError } = await supabase
        .from("loyalty_accounts")
        .update({
          current_progress: newProgress,
          total_visits: (account.total_visits || 0) + 1,
          reward_unlocked: rewardUnlocked,
          reward_unlocked_at: rewardUnlocked ? new Date().toISOString() : null,
        })
        .eq("id", account.id);

      if (updateError) throw updateError;

      await supabase.from("loyalty_progress_log").insert({
        loyalty_account_id: account.id,
        campaign_id: campaignId,
        action_type: rewardUnlocked ? "reward_unlocked" : "visit_confirmed",
        quantity: 1,
        device_info: deviceInfo || {},
      });

      return new Response(
        JSON.stringify({
          success: true,
          newProgress,
          rewardUnlocked,
          threshold,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (actionType === "redemption") {
      if (!account.reward_unlocked) {
        return new Response(
          JSON.stringify({ error: "No reward available to redeem" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const shortCode = generateShortCode();
      const redemptionToken = crypto.randomUUID();
      const resetBehavior = loyaltyProgram.reset_behavior || loyaltyProgram.resetBehavior || "reset";
      const expiryDays = campaign.config?.screens?.redemption?.expiryDays || 30;
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

      const newProgress = resetBehavior === "rollover"
        ? Math.max(0, (account.current_progress || 0) - threshold)
        : 0;

      const rewardName = loyaltyProgram.reward_name || loyaltyProgram.rewardName || "Free Reward";

      const { data: redemption, error: mainRedemptionError } = await supabase
        .from("redemptions")
        .insert({
          campaign_id: campaignId,
          client_id: campaign.client_id,
          prize_name: rewardName,
          short_code: shortCode,
          redemption_token: redemptionToken,
          token_expires_at: expiresAt,
          email: account.email,
          status: "valid",
          expires_at: expiresAt,
          metadata: {
            loyalty_account_id: account.id,
            member_code: account.member_code,
            member_name: account.name,
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
      JSON.stringify({ error: "Invalid action type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing loyalty action:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
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
