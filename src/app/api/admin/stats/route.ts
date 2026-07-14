import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function checkAdmin(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  return secret === process.env.ADMIN_SECRET;
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();

  // Get today's midnight in UTC
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);
  const todayISO = todayMidnight.toISOString();

  // Total tenants
  const { count: totalTenants, error: totalError } = await supabase
    .from("tenants")
    .select("*", { count: "exact", head: true });

  if (totalError) {
    return NextResponse.json({ error: totalError.message }, { status: 500 });
  }

  // Active tenants (trial or active)
  const { count: activeTenants, error: activeError } = await supabase
    .from("tenants")
    .select("*", { count: "exact", head: true })
    .in("subscription_status", ["trial", "active"]);

  if (activeError) {
    return NextResponse.json({ error: activeError.message }, { status: 500 });
  }

  // Total orders today
  const { count: totalOrdersToday, error: ordersError } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayISO);

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
  }

  // Total commission today
  const { data: commissionData, error: commissionError } = await supabase
    .from("order_commissions")
    .select("amount_cents")
    .gte("created_at", todayISO);

  if (commissionError) {
    return NextResponse.json(
      { error: commissionError.message },
      { status: 500 }
    );
  }

  const totalCommissionTodayCents = (commissionData || []).reduce(
    (sum, row) => sum + (row.amount_cents || 0),
    0
  );

  // Per-tenant stats
  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select("id, name, slug, subscription_status")
    .order("created_at", { ascending: false });

  if (tenantsError) {
    return NextResponse.json(
      { error: tenantsError.message },
      { status: 500 }
    );
  }

  const tenantStats = await Promise.all(
    (tenants || []).map(async (tenant) => {
      const { count: orderCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("created_at", todayISO);

      const { data: tenantCommissions } = await supabase
        .from("order_commissions")
        .select("amount_cents")
        .eq("tenant_id", tenant.id)
        .gte("created_at", todayISO);

      const commissionCents = (tenantCommissions || []).reduce(
        (sum, row) => sum + (row.amount_cents || 0),
        0
      );

      return {
        tenantId: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        subscriptionStatus: tenant.subscription_status,
        ordersToday: orderCount || 0,
        commissionTodayCents: commissionCents,
      };
    })
  );

  return NextResponse.json({
    totalTenants: totalTenants || 0,
    activeTenants: activeTenants || 0,
    totalOrdersToday: totalOrdersToday || 0,
    totalCommissionTodayCents,
    tenantStats,
  });
}
