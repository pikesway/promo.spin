import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LeadData {
  email?: string;
  name?: string;
  phone?: string;
  [key: string]: string | undefined;
}

interface PlayRequest {
  campaignId: string;
  sessionId: string;
  timestamp: number;
  leadData?: LeadData;
}

interface Prize {
  id?: string;
  name?: string;
  text?: string;
  probability: number;
  isWin: boolean;
  color?: string;
  textColor?: string;
  backgroundImage?: string;
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

    const { campaignId, sessionId, timestamp, leadData }: PlayRequest = await req.json();

    if (!campaignId || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, config, type, status, client_id")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (campaign.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Campaign is not active" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: recentPlays, error: playsError } = await supabase
      .from("game_plays")
      .select("played_at")
      .eq("session_id", sessionId)
      .eq("campaign_id", campaignId)
      .gte("played_at", new Date(Date.now() - 30000).toISOString())
      .limit(1);

    if (playsError) {
      console.error("Error checking recent plays:", playsError);
    }

    if (recentPlays && recentPlays.length > 0) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait 30 seconds between plays." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const prizes: Prize[] = campaign.type === "scratch"
      ? (campaign.config?.prizes || [])
      : (campaign.config?.segments || []);

    if (!prizes || prizes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No prizes configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const totalProbability = prizes.reduce((sum, p) => sum + (p.probability || 0), 0);
    if (totalProbability <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid prize configuration: probabilities must be greater than 0" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const randomBytes = crypto.getRandomValues(new Uint32Array(1));
    const randomPercent = (randomBytes[0] / 0xFFFFFFFF) * totalProbability;

    let cumulativeProbability = 0;
    let selectedPrize: Prize | null = null;

    for (const prize of prizes) {
      cumulativeProbability += prize.probability || 0;
      if (randomPercent <= cumulativeProbability) {
        selectedPrize = prize;
        break;
      }
    }

    if (!selectedPrize) {
      selectedPrize = prizes[prizes.length - 1];
    }

    const ipAddress = req.headers.get("x-forwarded-for") ||
                     req.headers.get("x-real-ip") ||
                     "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const prizeName = selectedPrize.name || selectedPrize.text || "Unknown Prize";

    const { error: playLogError } = await supabase
      .from("game_plays")
      .insert({
        campaign_id: campaignId,
        session_id: sessionId,
        outcome_prize_name: prizeName,
        is_win: selectedPrize.isWin,
        played_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
          timestamp,
          prize_probability: selectedPrize.probability,
          random_value: randomPercent
        }
      });

    if (playLogError) {
      console.error("Error logging play:", playLogError);
    }

    const { data: currentAnalytics } = await supabase
      .from("campaigns")
      .select("analytics")
      .eq("id", campaignId)
      .single();

    const analytics = currentAnalytics?.analytics || {
      views: 0,
      unique_views: 0,
      spins: 0,
      wins: 0,
      losses: 0,
      leads: 0,
      redemptions: 0
    };

    analytics.spins = (analytics.spins || 0) + 1;
    if (selectedPrize.isWin) {
      analytics.wins = (analytics.wins || 0) + 1;
    } else {
      analytics.losses = (analytics.losses || 0) + 1;
    }

    analytics.win_rate = analytics.spins > 0
      ? Math.round((analytics.wins / analytics.spins) * 100)
      : 0;

    await supabase
      .from("campaigns")
      .update({ analytics })
      .eq("id", campaignId);

    let redemptionData = null;

    if (selectedPrize.isWin && leadData?.email) {
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          campaign_id: campaignId,
          client_id: campaign.client_id,
          data: leadData,
          metadata: {
            session_id: sessionId,
            prize_won: prizeName,
            captured_at: new Date().toISOString(),
          },
        })
        .select("id")
        .single();

      if (!leadError && lead) {
        analytics.leads = (analytics.leads || 0) + 1;
        await supabase
          .from("campaigns")
          .update({ analytics })
          .eq("id", campaignId);

        const shortCode = generateShortCode();
        const redemptionToken = crypto.randomUUID();
        const expirationDays = campaign.config?.redemption?.expirationDays || 30;
        const tokenExpiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString();

        const { data: redemption, error: redemptionError } = await supabase
          .from("redemptions")
          .insert({
            campaign_id: campaignId,
            client_id: campaign.client_id,
            lead_id: lead.id,
            prize_name: prizeName,
            short_code: shortCode,
            redemption_token: redemptionToken,
            token_expires_at: tokenExpiresAt,
            email: leadData.email,
            status: "valid",
            expires_at: tokenExpiresAt,
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
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ redemptionId: redemption.id }),
          }).catch((err) => console.error("Failed to trigger email:", err));
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        isWin: selectedPrize.isWin,
        prize: selectedPrize,
        redemption: redemptionData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in play-game function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
