import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InsightsPayload {
  scopeType: "campaign" | "brand" | "client";
  scopeId: string;
  forceRefresh?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, client_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ success: false, error: "Profile not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: InsightsPayload = await req.json();
    const { scopeType, scopeId, forceRefresh = false } = payload;

    if (!scopeType || !scopeId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing scopeType or scopeId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAgencyAdmin = ["admin", "super_admin"].includes(profile.role);
    const isClientLevel = ["client", "client_admin"].includes(profile.role);
    const isClientUser = ["staff", "client_user"].includes(profile.role);

    if (!isAgencyAdmin) {
      if (isClientLevel) {
        const allowed = await checkClientAccess(supabase, scopeType, scopeId, profile.client_id);
        if (!allowed) {
          return new Response(
            JSON.stringify({ success: false, error: "Access denied" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (isClientUser) {
        const allowed = await checkBrandUserAccess(supabase, scopeType, scopeId, user.id);
        if (!allowed) {
          return new Response(
            JSON.stringify({ success: false, error: "Access denied" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ success: false, error: "Access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("campaign_insights_cache")
        .select("data, computed_at, next_refresh_at")
        .eq("scope_type", scopeType)
        .eq("scope_id", scopeId)
        .maybeSingle();

      if (cached && new Date(cached.next_refresh_at) > new Date()) {
        return new Response(
          JSON.stringify({
            success: true,
            data: cached.data,
            computedAt: cached.computed_at,
            nextRefreshAt: cached.next_refresh_at,
            fromCache: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let campaignIds: string[] = [];

    if (scopeType === "campaign") {
      campaignIds = [scopeId];
    } else if (scopeType === "brand") {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("brand_id", scopeId)
        .eq("type", "loyalty");
      campaignIds = (campaigns || []).map((c: { id: string }) => c.id);
    } else if (scopeType === "client") {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("client_id", scopeId)
        .eq("type", "loyalty");
      campaignIds = (campaigns || []).map((c: { id: string }) => c.id);
    }

    if (campaignIds.length === 0) {
      const emptyData = {
        totalMembers: 0,
        avgVisits: 0,
        redemptionRate: 0,
        birthdayRedeemedThisMonth: 0,
        topMembers: [],
        nearingReward: [],
      };

      const computedAt = new Date().toISOString();
      const nextRefreshAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await supabase.from("campaign_insights_cache").upsert({
        scope_type: scopeType,
        scope_id: scopeId,
        data: emptyData,
        computed_at: computedAt,
        next_refresh_at: nextRefreshAt,
      }, { onConflict: "scope_type,scope_id" });

      return new Response(
        JSON.stringify({ success: true, data: emptyData, computedAt, nextRefreshAt, fromCache: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: members } = await supabase
      .from("loyalty_accounts")
      .select("id, name, email, current_progress, total_visits, campaign_id, birthday")
      .in("campaign_id", campaignIds);

    const allMembers = members || [];
    const totalMembers = allMembers.length;
    const totalVisitsSum = allMembers.reduce((sum: number, m: { total_visits: number }) => sum + (m.total_visits || 0), 0);
    const avgVisits = totalMembers > 0 ? Math.round((totalVisitsSum / totalMembers) * 10) / 10 : 0;

    const topMembers = [...allMembers]
      .sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0))
      .slice(0, 10)
      .map((m: { id: string; name: string; email: string; total_visits: number; current_progress: number; campaign_id: string }) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        totalVisits: m.total_visits || 0,
        currentProgress: m.current_progress || 0,
        campaignId: m.campaign_id,
      }));

    const { data: allRewards } = await supabase
      .from("campaign_rewards")
      .select("id, campaign_id, threshold, reward_name")
      .in("campaign_id", campaignIds)
      .eq("active", true)
      .order("threshold", { ascending: true });

    const rewardsByCampaign: Record<string, Array<{ id: string; threshold: number; reward_name: string }>> = {};
    for (const r of (allRewards || [])) {
      if (!rewardsByCampaign[r.campaign_id]) rewardsByCampaign[r.campaign_id] = [];
      rewardsByCampaign[r.campaign_id].push(r);
    }

    const { data: loyaltyPrograms } = await supabase
      .from("loyalty_programs")
      .select("campaign_id, threshold, reward_name")
      .in("campaign_id", campaignIds);

    const programByCampaign: Record<string, { threshold: number; reward_name: string }> = {};
    for (const lp of (loyaltyPrograms || [])) {
      programByCampaign[lp.campaign_id] = lp;
    }

    const nearingReward: Array<{
      id: string;
      name: string;
      campaignId: string;
      currentProgress: number;
      nextRewardName: string;
      nextThreshold: number;
      stampsRemaining: number;
    }> = [];

    for (const member of allMembers) {
      const tiers = rewardsByCampaign[member.campaign_id] || [];
      const program = programByCampaign[member.campaign_id];
      const progress = member.current_progress || 0;

      let nextTier: { threshold: number; reward_name: string } | null = null;

      for (const tier of tiers) {
        if (tier.threshold > progress) {
          nextTier = tier;
          break;
        }
      }

      if (!nextTier && program && program.threshold > progress) {
        nextTier = { threshold: program.threshold, reward_name: program.reward_name };
      }

      if (nextTier) {
        const stampsRemaining = nextTier.threshold - progress;
        if (stampsRemaining <= 3 && stampsRemaining > 0) {
          nearingReward.push({
            id: member.id,
            name: member.name,
            campaignId: member.campaign_id,
            currentProgress: progress,
            nextRewardName: nextTier.reward_name,
            nextThreshold: nextTier.threshold,
            stampsRemaining,
          });
        }
      }
    }

    nearingReward.sort((a, b) => a.stampsRemaining - b.stampsRemaining);

    const { data: redemptions } = await supabase
      .from("loyalty_redemptions")
      .select("status, redemption_source, created_at")
      .in("campaign_id", campaignIds);

    const allRedemptions = redemptions || [];
    const totalIssued = allRedemptions.length;
    const totalRedeemed = allRedemptions.filter((r: { status: string }) => r.status === "redeemed").length;
    const redemptionRate = totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0;

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const birthdayRedeemedThisMonth = allRedemptions.filter((r: { redemption_source: string; created_at: string }) => {
      if (r.redemption_source !== "birthday") return false;
      const d = new Date(r.created_at);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const insightData = {
      totalMembers,
      avgVisits,
      redemptionRate,
      birthdayRedeemedThisMonth,
      topMembers,
      nearingReward: nearingReward.slice(0, 20),
    };

    const computedAt = new Date().toISOString();
    const nextRefreshAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("campaign_insights_cache").upsert({
      scope_type: scopeType,
      scope_id: scopeId,
      data: insightData,
      computed_at: computedAt,
      next_refresh_at: nextRefreshAt,
    }, { onConflict: "scope_type,scope_id" });

    return new Response(
      JSON.stringify({
        success: true,
        data: insightData,
        computedAt,
        nextRefreshAt,
        fromCache: false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error computing insights:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function checkClientAccess(
  supabase: ReturnType<typeof createClient>,
  scopeType: string,
  scopeId: string,
  clientId: string
): Promise<boolean> {
  if (scopeType === "client") return scopeId === clientId;
  if (scopeType === "brand") {
    const { data } = await supabase.from("brands").select("client_id").eq("id", scopeId).maybeSingle();
    return data?.client_id === clientId;
  }
  if (scopeType === "campaign") {
    const { data } = await supabase.from("campaigns").select("client_id").eq("id", scopeId).maybeSingle();
    return data?.client_id === clientId;
  }
  return false;
}

async function checkBrandUserAccess(
  supabase: ReturnType<typeof createClient>,
  scopeType: string,
  scopeId: string,
  userId: string
): Promise<boolean> {
  if (scopeType === "brand") {
    const { data } = await supabase
      .from("user_brand_permissions")
      .select("id")
      .eq("brand_id", scopeId)
      .eq("user_id", userId)
      .eq("active", true)
      .eq("can_view_stats", true)
      .maybeSingle();
    return !!data;
  }
  if (scopeType === "campaign") {
    const { data: campaign } = await supabase.from("campaigns").select("brand_id").eq("id", scopeId).maybeSingle();
    if (!campaign) return false;
    const { data } = await supabase
      .from("user_brand_permissions")
      .select("id")
      .eq("brand_id", campaign.brand_id)
      .eq("user_id", userId)
      .eq("active", true)
      .eq("can_view_stats", true)
      .maybeSingle();
    return !!data;
  }
  return false;
}
