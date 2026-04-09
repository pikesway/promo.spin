import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const triviaSupabaseUrl = Deno.env.get("TRIVIA_SUPABASE_URL");
    const triviaAnonKey = Deno.env.get("TRIVIA_SUPABASE_ANON_KEY");

    if (!triviaSupabaseUrl || !triviaAnonKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Trivia API not configured. TRIVIA_SUPABASE_URL and TRIVIA_SUPABASE_ANON_KEY secrets are required.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = triviaSupabaseUrl.replace(/\/+$/, "") + "/functions/v1/admin-shells";

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "ready";
    const visibility = url.searchParams.get("visibility") || "public";
    const search = url.searchParams.get("search");

    const targetUrl = new URL(endpoint);
    targetUrl.searchParams.set("status", status);
    targetUrl.searchParams.set("visibility", visibility);
    if (search) targetUrl.searchParams.set("search", search);

    console.log("[trivia-proxy] Fetching:", targetUrl.toString());

    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${triviaAnonKey}`,
        "Apikey": triviaAnonKey,
      },
    });

    const text = await response.text();
    console.log("[trivia-proxy] Status:", response.status, "Body preview:", text.slice(0, 300));

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        success: false,
        error: "Non-JSON response from Trivia API",
        status: response.status,
        raw: text.slice(0, 500),
      };
    }

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[trivia-proxy] Fetch error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
