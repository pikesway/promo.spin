import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  redemptionId: string;
}

function generateEmailTemplate(data: {
  prizeName: string;
  shortCode: string;
  magicLink: string;
  expiresAt: string;
  clientName: string;
  clientLogo?: string;
  primaryColor: string;
  secondaryColor: string;
}): string {
  const {
    prizeName,
    shortCode,
    magicLink,
    expiresAt,
    clientName,
    clientLogo,
    primaryColor,
    secondaryColor,
  } = data;

  const formattedExpiry = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Prize from ${clientName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); padding: 40px 30px; text-align: center;">
              ${clientLogo ? `<img src="${clientLogo}" alt="${clientName}" style="max-height: 60px; max-width: 200px; margin-bottom: 20px;">` : `<h2 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px;">${clientName}</h2>`}
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">You Won!</h1>
            </td>
          </tr>

          <!-- Prize Section -->
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                <p style="color: #92400e; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Prize</p>
                <h2 style="color: #78350f; margin: 0; font-size: 24px; font-weight: 700;">${prizeName}</h2>
              </div>

              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Congratulations! Click the button below to view your coupon. Simply show it to the cashier when you're ready to redeem.
              </p>

              <!-- CTA Button -->
              <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);">
                View My Coupon
              </a>
            </td>
          </tr>

          <!-- Short Code Section -->
          <tr>
            <td style="padding: 0 30px 40px 30px; text-align: center;">
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px;">
                <p style="color: #71717a; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Redemption Code</p>
                <p style="color: #18181b; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 4px; font-family: monospace;">${shortCode}</p>
              </div>
            </td>
          </tr>

          <!-- Expiry Notice -->
          <tr>
            <td style="padding: 0 30px 40px 30px; text-align: center;">
              <p style="color: #dc2626; margin: 0; font-size: 14px;">
                <strong>Expires:</strong> ${formattedExpiry}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 30px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="color: #71717a; margin: 0 0 10px 0; font-size: 14px;">
                Questions about your prize? Reply to this email to contact ${clientName}.
              </p>
              <p style="color: #a1a1aa; margin: 0; font-size: 12px;">
                This coupon is for one-time use only and cannot be combined with other offers.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'app_bizgamez_agency' }
    });
    const { redemptionId }: EmailRequest = await req.json();

    if (!redemptionId) {
      return new Response(
        JSON.stringify({ error: "Missing redemption ID" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: redemption, error: redemptionError } = await supabase
      .from("redemptions")
      .select(`
        id,
        prize_name,
        short_code,
        redemption_token,
        token_expires_at,
        email,
        client_id,
        campaign_id
      `)
      .eq("id", redemptionId)
      .single();

    if (redemptionError || !redemption) {
      return new Response(
        JSON.stringify({ error: "Redemption not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!redemption.email) {
      return new Response(
        JSON.stringify({ error: "No email address for this redemption" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("name, email, logo_url, primary_color, secondary_color")
      .eq("id", redemption.client_id)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || supabaseUrl.replace(".supabase.co", ".vercel.app");
    const magicLink = `${baseUrl}/#/redeem/${redemption.short_code}?token=${redemption.redemption_token}`;

    const emailHtml = generateEmailTemplate({
      prizeName: redemption.prize_name,
      shortCode: redemption.short_code,
      magicLink,
      expiresAt: redemption.token_expires_at,
      clientName: client.name,
      clientLogo: client.logo_url,
      primaryColor: client.primary_color || "#3b82f6",
      secondaryColor: client.secondary_color || "#1d4ed8",
    });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Coupons <onboarding@resend.dev>",
        reply_to: client.email,
        to: [redemption.email],
        subject: `Your ${redemption.prize_name} from ${client.name} is ready!`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend error:", emailResult);

      await supabase
        .from("redemptions")
        .update({
          email_status: "failed",
          metadata: {
            email_error: emailResult.message || "Failed to send email",
          },
        })
        .eq("id", redemptionId);

      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResult }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("redemptions")
      .update({
        email_sent_at: new Date().toISOString(),
        email_status: "sent",
        metadata: {
          resend_id: emailResult.id,
        },
      })
      .eq("id", redemptionId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        emailId: emailResult.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in send-redemption-email function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
