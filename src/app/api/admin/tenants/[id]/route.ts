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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const { id } = params;

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const { id } = params;
  const body = await req.json();

  // Map camelCase input to snake_case columns
  const allowedFields: Record<string, string> = {
    name: "name",
    slug: "slug",
    ownerEmail: "owner_email",
    tableCount: "table_count",
    googlePlaceId: "google_place_id",
    subscriptionStatus: "subscription_status",
  };

  const updates: Record<string, unknown> = {};
  for (const [camel, snake] of Object.entries(allowedFields)) {
    if (body[camel] !== undefined) {
      updates[snake] = body[camel];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  // Validate slug if being updated
  if (updates.slug) {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(updates.slug as string)) {
      return NextResponse.json(
        {
          error:
            "Invalid slug. Must be lowercase, alphanumeric with hyphens only",
        },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("tenants")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const { id } = params;

  const { error } = await supabase.from("tenants").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: id });
}
