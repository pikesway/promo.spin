import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WebhookPayload {
  score: number;
  game_code: string;
  name: string;
  mobile: string;
  email: string;
  created_at: string;
}

interface Prize {
  score: number;
  name: string;
  isWin: boolean;
  winHeadline?: string;
  winMessage?: string;
}

function generateShortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const randomValues = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  return code;
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

    const payload: WebhookPayload = await req.json();
    const { score, game_code, name, mobile, email, created_at } = payload;

    if (!game_code) {
      return new Response(
        JSON.stringify({ error: "Missing game_code" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: campaigns, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, client_id, name, config, status")
      .eq("type", "bizgamez")
      .eq("status", "active");

    if (campaignError) {
      console.error("Error fetching campaigns:", campaignError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const campaign = campaigns?.find(
      (c) => c.config?.bizgamez_code === game_code
    );

    if (!campaign) {
      const { error: logError } = await supabase
        .from("webhook_events")
        .insert({
          game_code,
          score: score || 0,
          name,
          email,
          mobile,
          raw_payload: payload,
          status: "failed",
          error_message: `No active campaign found for game_code: ${game_code}`,
        });

      if (logError) {
        console.error("Error logging failed webhook:", logError);
      }

      return new Response(
        JSON.stringify({ error: "Campaign not found for this game code" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: webhookEvent, error: insertError } = await supabase
      .from("webhook_events")
      .insert({
        campaign_id: campaign.id,
        client_id: campaign.client_id,
        game_code,
        score: score || 0,
        name,
        email,
        mobile,
        raw_payload: payload,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting webhook event:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to log webhook event" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const prizes: Prize[] = campaign.config?.prizes || [];
    const matchedPrize = prizes.find((p) => p.score === score);

    if (!matchedPrize) {
      await supabase
        .from("webhook_events")
        .update({
          status: "failed",
          error_message: `No prize configured for score: ${score}`,
          processed_at: new Date().toISOString(),
        })
        .eq("id", webhookEvent.id);

      return new Response(
        JSON.stringify({ error: `No prize configured for score: ${score}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const leadData = {
      name: name || "",
      email: email || "",
      phone: mobile || "",
    };

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        campaign_id: campaign.id,
        client_id: campaign.client_id,
        data: leadData,
        metadata: {
          source: "bizgamez_webhook",
          game_code,
          score,
          webhook_event_id: webhookEvent.id,
          original_created_at: created_at,
          prize_name: matchedPrize.name,
          is_win: matchedPrize.isWin,
        },
      })
      .select("id")
      .single();

    if (leadError) {
      console.error("Error creating lead:", leadError);
    }

    const { data: currentAnalytics } = await supabase
      .from("campaigns")
      .select("analytics")
      .eq("id", campaign.id)
      .single();

    const analytics = currentAnalytics?.analytics || {
      views: 0,
      leads: 0,
      wins: 0,
      losses: 0,
    };

    analytics.views = (analytics.views || 0) + 1;
    analytics.leads = (analytics.leads || 0) + 1;

    if (matchedPrize.isWin) {
      analytics.wins = (analytics.wins || 0) + 1;
    } else {
      analytics.losses = (analytics.losses || 0) + 1;
    }

    await supabase
      .from("campaigns")
      .update({ analytics })
      .eq("id", campaign.id);

    let redemptionData = null;

    if (matchedPrize.isWin && email) {
      const shortCode = generateShortCode();
      const redemptionToken = crypto.randomUUID();
      const expirationDays = campaign.config?.redemption?.expirationDays || 30;
      const tokenExpiresAt = new Date(
        Date.now() + expirationDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: redemption, error: redemptionError } = await supabase
        .from("redemptions")
        .insert({
          campaign_id: campaign.id,
          client_id: campaign.client_id,
          lead_id: lead?.id || null,
          prize_name: matchedPrize.name,
          short_code: shortCode,
          redemption_token: redemptionToken,
          token_expires_at: tokenExpiresAt,
          email: email,
          status: "valid",
          expires_at: tokenExpiresAt,
          metadata: {
            source: "bizgamez_webhook",
            game_code,
            score,
            win_headline: matchedPrize.winHeadline,
            win_message: matchedPrize.winMessage,
          },
        })
        .select("id, short_code")
        .single();

      if (!redemptionError && redemption) {
        redemptionData = {
          shortCode: redemption.short_code,
          expiresAt: tokenExpiresAt,
        };

        const supabaseFunctionsUrl = `${supabaseUrl}/functions/v1/send-redemption-email`;
        fetch(supabaseFunctionsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ redemptionId: redemption.id }),
        }).catch((err) => console.error("Failed to trigger email:", err));
      }
    }

    await supabase
      .from("webhook_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", webhookEvent.id);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_name: campaign.name,
        prize: matchedPrize.name,
        is_win: matchedPrize.isWin,
        redemption: redemptionData,
        lead_id: lead?.id || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in bizgamez-webhook function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
