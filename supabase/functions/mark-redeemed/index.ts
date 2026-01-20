import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RedeemRequest {
  shortCode: string;
  token: string;
  redeemedBy?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { shortCode, token, redeemedBy }: RedeemRequest = await req.json();

    if (!shortCode || !token) {
      return new Response(
        JSON.stringify({ error: "Missing short code or token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: redemption, error: fetchError } = await supabase
      .from("redemptions")
      .select(`
        id,
        prize_name,
        short_code,
        redemption_token,
        token_expires_at,
        status,
        client_id,
        campaign_id
      `)
      .eq("short_code", shortCode)
      .single();

    if (fetchError || !redemption) {
      return new Response(
        JSON.stringify({ error: "Redemption not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (redemption.redemption_token !== token) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (redemption.status === "redeemed") {
      return new Response(
        JSON.stringify({
          error: "Already redeemed",
          status: "redeemed",
          message: "This coupon has already been used."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (redemption.status === "expired") {
      return new Response(
        JSON.stringify({
          error: "Expired",
          status: "expired",
          message: "This coupon has expired."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date();
    const expiresAt = redemption.token_expires_at ? new Date(redemption.token_expires_at) : null;

    if (expiresAt && now > expiresAt) {
      await supabase
        .from("redemptions")
        .update({ status: "expired" })
        .eq("id", redemption.id);

      return new Response(
        JSON.stringify({
          error: "Expired",
          status: "expired",
          message: "This coupon has expired."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: updateError } = await supabase
      .from("redemptions")
      .update({
        status: "redeemed",
        redeemed_at: now.toISOString(),
        redeemed_by: redeemedBy || "cashier",
      })
      .eq("id", redemption.id);

    if (updateError) {
      console.error("Error updating redemption:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to mark as redeemed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: currentAnalytics } = await supabase
      .from("campaigns")
      .select("analytics")
      .eq("id", redemption.campaign_id)
      .single();

    if (currentAnalytics) {
      const analytics = currentAnalytics.analytics || {};
      analytics.redemptions = (analytics.redemptions || 0) + 1;

      await supabase
        .from("campaigns")
        .update({ analytics })
        .eq("id", redemption.campaign_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Coupon redeemed successfully!",
        prizeName: redemption.prize_name,
        redeemedAt: now.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in mark-redeemed function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
