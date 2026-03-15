import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BirthdayRedeemPayload {
  memberCode: string;
  campaignId: string;
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

    const payload: BirthdayRedeemPayload = await req.json();
    const { memberCode, campaignId, deviceInfo } = payload;

    if (!memberCode || !campaignId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
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
        JSON.stringify({ success: false, error: "Member not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!account.birthday) {
      return new Response(
        JSON.stringify({ success: false, error: "No birthday on file for this member" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const birthdayDate = new Date(account.birthday);
    const birthdayMonth = birthdayDate.getUTCMonth() + 1;

    if (birthdayMonth !== currentMonth) {
      return new Response(
        JSON.stringify({ success: false, error: "Birthday reward is only available during your birthday month" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: loyaltyProgram } = await supabase
      .from("loyalty_programs")
      .select("birthday_reward_enabled, birthday_reward_name, birthday_reward_description, threshold")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (!loyaltyProgram?.birthday_reward_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: "Birthday rewards are not enabled for this campaign" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentYear = now.getUTCFullYear();
    const monthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).toISOString();
    const monthEnd = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59)).toISOString();

    const { data: existingBirthdayRedemption } = await supabase
      .from("loyalty_redemptions")
      .select("id")
      .eq("loyalty_account_id", account.id)
      .eq("campaign_id", campaignId)
      .eq("redemption_source", "birthday")
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd)
      .maybeSingle();

    if (existingBirthdayRedemption) {
      return new Response(
        JSON.stringify({ success: false, error: "Birthday reward has already been redeemed this month" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("client_id, config")
      .eq("id", campaignId)
      .maybeSingle();

    if (!campaign) {
      return new Response(
        JSON.stringify({ success: false, error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rewardName = loyaltyProgram.birthday_reward_name || "Birthday Reward";
    const expiryDays = campaign.config?.screens?.redemption?.expiryDays || 30;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
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
        email: account.email,
        status: "valid",
        expires_at: expiresAt,
        metadata: {
          loyalty_account_id: account.id,
          member_code: account.member_code,
          member_name: account.name,
          source: "birthday_reward",
        },
      })
      .select("id")
      .single();

    if (mainRedemptionError) {
      console.error("Error creating birthday redemption:", mainRedemptionError);
      throw mainRedemptionError;
    }

    const { error: loyaltyRedemptionError } = await supabase.from("loyalty_redemptions").insert({
      loyalty_account_id: account.id,
      campaign_id: campaignId,
      short_code: shortCode,
      status: "valid",
      expires_at: expiresAt,
      redemption_id: redemption.id,
      redemption_source: "birthday",
      reward_tier_id: null,
    });

    if (loyaltyRedemptionError) {
      console.error("Error creating loyalty birthday redemption:", loyaltyRedemptionError);
      throw loyaltyRedemptionError;
    }

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
    }).catch((err) => console.error("Failed to trigger birthday email:", err));

    return new Response(
      JSON.stringify({
        success: true,
        shortCode,
        redemptionToken,
        rewardName,
        expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error redeeming birthday reward:", error);
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
