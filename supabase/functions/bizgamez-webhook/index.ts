import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LeadCapturePayload {
  event_type: "lead_capture";
  campaign_id: string;
  instance_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface GameCompletePayload {
  event_type: "game_complete";
  campaign_id: string;
  lead_id: string;
  final_score: number;
  time_elapsed_seconds: number;
  instance_id?: string;
  device_id?: string;
}

type WebhookPayload = LeadCapturePayload | GameCompletePayload;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) {
      return new Response(
        JSON.stringify({ error: "Invalid Authorization header format. Expected: Bearer <token>" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const providedToken = tokenMatch[1];
    const expectedToken = Deno.env.get("TRIVIA_WEBHOOK_SECRET");

    if (!expectedToken) {
      console.error("TRIVIA_WEBHOOK_SECRET environment variable not configured");
      return new Response(
        JSON.stringify({ error: "Webhook authentication not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (providedToken !== expectedToken) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook authentication token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'public' }
    });

    const contentType = req.headers.get("Content-Type");
    if (!contentType || !contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload: WebhookPayload = await req.json();

    if (!payload.event_type) {
      return new Response(
        JSON.stringify({ error: "Missing required field: event_type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (payload.event_type === "lead_capture") {
      return await handleLeadCapture(payload, supabase);
    } else if (payload.event_type === "game_complete") {
      return await handleGameComplete(payload, supabase);
    } else {
      return new Response(
        JSON.stringify({
          error: `Unsupported event_type: ${payload.event_type}. Supported types: lead_capture, game_complete`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error in bizgamez-webhook function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleLeadCapture(payload: LeadCapturePayload, supabase: any) {
  const { campaign_id, first_name, last_name, email, phone } = payload;

  if (!campaign_id || !first_name) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields for lead_capture",
        required: ["campaign_id", "first_name"]
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!email && !phone) {
    return new Response(
      JSON.stringify({
        error: "At least one contact method (email or phone) is required"
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, client_id, brand_id, status, type, name")
    .eq("id", campaign_id)
    .maybeSingle();

  if (campaignError) {
    console.error("Database error fetching campaign:", campaignError);
    return new Response(
      JSON.stringify({ error: "Database error while validating campaign" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!campaign) {
    return new Response(
      JSON.stringify({ error: `Campaign not found: ${campaign_id}` }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (campaign.status !== "active") {
    return new Response(
      JSON.stringify({
        error: `Campaign is not active. Current status: ${campaign.status}`
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let instanceName = "Unknown Instance";
  if (payload.instance_id) {
    const { data: instanceData } = await supabase
      .from("campaign_game_instances")
      .select("name, end_at")
      .eq("id", payload.instance_id)
      .maybeSingle();
    if (instanceData) {
      instanceName = instanceData.name;
      if (instanceData.end_at && new Date() > new Date(instanceData.end_at)) {
        return new Response(
          JSON.stringify({ error: "This game instance has ended and is no longer accepting entries." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
  }

  const normalizedEmail = email.trim().toLowerCase() || null;
  const normalizedPhone = phone.trim() || null;
  const fullName = `${first_name.trim()} ${last_name.trim()}`;

  if (!normalizedEmail && !normalizedPhone) {
    return new Response(
      JSON.stringify({
        success: true,
        message: "Lead capture skipped: no valid contact information provided"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let leadId: string;

  if (campaign.brand_id) {
    let query = supabase
      .from("leads")
      .select("id, email, phone")
      .eq("brand_id", campaign.brand_id);

    if (normalizedEmail && normalizedPhone) {
      query = query.or(`email.eq.${normalizedEmail},phone.eq.${normalizedPhone}`);
    } else if (normalizedEmail) {
      query = query.eq("email", normalizedEmail);
    } else if (normalizedPhone) {
      query = query.eq("phone", normalizedPhone);
    }

    const { data: existingLeads } = await query.limit(1);
    const existingLead = existingLeads?.[0];

    if (existingLead) {
      const updateFields: any = {
        name: fullName,
        updated_at: new Date().toISOString()
      };

      if (normalizedEmail && !existingLead.email) {
        updateFields.email = normalizedEmail;
      }
      if (normalizedPhone && !existingLead.phone) {
        updateFields.phone = normalizedPhone;
      }

      const { error: updateError } = await supabase
        .from("leads")
        .update(updateFields)
        .eq("id", existingLead.id);

      if (updateError) {
        console.error("Error updating existing lead:", updateError);
      }

      leadId = existingLead.id;
    } else {
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          client_id: campaign.client_id,
          brand_id: campaign.brand_id,
          name: fullName,
          email: normalizedEmail,
          phone: normalizedPhone,
          source_type: "trivia_webhook",
          metadata: {
            source: "trivia_webhook",
            campaign_id: campaign_id,
            campaign_name: campaign.name || 'Unknown Campaign',
            instance_id: payload.instance_id || null,
            instance_name: instanceName,
            first_name,
            last_name,
            captured_at: new Date().toISOString()
          },
        })
        .select("id")
        .single();

      if (leadError) {
        console.error("Error creating lead:", leadError);
        return new Response(
          JSON.stringify({ error: "Failed to create lead", details: leadError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      leadId = newLead.id;
    }
  } else {
    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        client_id: campaign.client_id,
        brand_id: null,
        name: fullName,
        email: normalizedEmail,
        phone: normalizedPhone,
        source_type: "trivia_webhook",
        metadata: {
          source: "trivia_webhook",
          campaign_id: campaign_id,
          campaign_name: campaign.name || 'Unknown Campaign',
          instance_id: payload.instance_id || null,
          instance_name: instanceName,
          first_name,
          last_name,
          captured_at: new Date().toISOString()
        },
      })
      .select("id")
      .single();

    if (leadError) {
      console.error("Error creating lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Failed to create lead", details: leadError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    leadId = newLead.id;
  }

  return new Response(
    JSON.stringify({
      success: true,
      lead_id: leadId,
      message: "Lead captured successfully"
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function handleGameComplete(payload: GameCompletePayload, supabase: any) {
  const { campaign_id, lead_id, final_score, time_elapsed_seconds, instance_id, device_id } = payload;

  if (!campaign_id || !lead_id || final_score === undefined || time_elapsed_seconds === undefined) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields for game_complete",
        required: ["campaign_id", "lead_id", "final_score", "time_elapsed_seconds"]
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, client_id, brand_id, status")
    .eq("id", campaign_id)
    .maybeSingle();

  if (campaignError) {
    console.error("Database error fetching campaign:", campaignError);
    return new Response(
      JSON.stringify({ error: "Database error while validating campaign" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!campaign) {
    return new Response(
      JSON.stringify({ error: `Campaign not found: ${campaign_id}` }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (campaign.status !== "active") {
    return new Response(
      JSON.stringify({
        error: `Campaign is not active. Current status: ${campaign.status}`
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (instance_id) {
    const { data: instanceData } = await supabase
      .from("campaign_game_instances")
      .select("end_at")
      .eq("id", instance_id)
      .maybeSingle();
    if (instanceData?.end_at && new Date() > new Date(instanceData.end_at)) {
      return new Response(
        JSON.stringify({ error: "This game instance has ended and is no longer accepting entries." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, client_id, brand_id")
    .eq("id", lead_id)
    .maybeSingle();

  if (leadError) {
    console.error("Database error fetching lead:", leadError);
    return new Response(
      JSON.stringify({ error: "Database error while validating lead" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!lead) {
    return new Response(
      JSON.stringify({ error: `Lead not found: ${lead_id}` }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (lead.client_id !== campaign.client_id) {
    return new Response(
      JSON.stringify({
        error: "Lead does not belong to the same client as the campaign"
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (campaign.brand_id && lead.brand_id !== campaign.brand_id) {
    return new Response(
      JSON.stringify({
        error: "Lead does not belong to the same brand as the campaign"
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data: leaderboardEntry, error: insertError } = await supabase
    .from("campaign_leaderboards")
    .insert({
      campaign_id: campaign_id,
      lead_id: lead_id,
      final_score: final_score,
      time_elapsed_seconds: time_elapsed_seconds,
      completed_at: new Date().toISOString(),
      metadata: {
        source: "trivia_webhook",
        instance_id,
        device_id,
        received_at: new Date().toISOString()
      }
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Error inserting leaderboard entry:", insertError);
    return new Response(
      JSON.stringify({
        error: "Failed to record game completion",
        details: insertError.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      leaderboard_entry_id: leaderboardEntry.id,
      message: "Game completion recorded successfully"
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
