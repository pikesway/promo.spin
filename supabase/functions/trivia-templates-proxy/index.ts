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
    const triviaRuntimeUrl = Deno.env.get("TRIVIA_RUNTIME_URL") || "https://quizbattles-trivia-r-zu2v.bolt.host";
    const endpoint = triviaRuntimeUrl.replace(/\/+$/, "") + "/api/public-templates";

    console.log("[trivia-proxy] Fetching:", endpoint);

    const response = await fetch(endpoint, {
      method: "GET",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
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
