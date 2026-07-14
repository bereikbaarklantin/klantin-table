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

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, slug, ownerEmail, tableCount, googlePlaceId } = body;

  if (!name || !slug || !ownerEmail || !tableCount) {
    return NextResponse.json(
      { error: "Missing required fields: name, slug, ownerEmail, tableCount" },
      { status: 400 }
    );
  }

  // Slug validation: lowercase, alphanumeric + hyphens only
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return NextResponse.json(
      {
        error:
          "Invalid slug. Must be lowercase, alphanumeric with hyphens only (e.g. 'my-restaurant')",
      },
      { status: 400 }
    );
  }

  const supabase = adminClient();

  // Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name,
      slug,
      owner_email: ownerEmail,
      table_count: tableCount,
      google_place_id: googlePlaceId || null,
    })
    .select()
    .single();

  if (tenantError) {
    return NextResponse.json(
      { error: tenantError.message },
      { status: 500 }
    );
  }

  // Create default settings for the tenant
  const { error: settingsError } = await supabase.from("settings").insert({
    tenant_id: tenant.id,
    currency: "EUR",
    timezone: "Europe/Amsterdam",
    order_prefix: slug.toUpperCase().slice(0, 4),
    auto_accept_orders: false,
    notification_email: ownerEmail,
  });

  if (settingsError) {
    // Tenant was created but settings failed — log but still return tenant
    console.error("Failed to create settings:", settingsError.message);
  }

  return NextResponse.json(tenant, { status: 201 });
}
