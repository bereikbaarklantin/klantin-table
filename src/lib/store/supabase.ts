// ---------------------------------------------------------------------------
// Supabase-adapter (multi-tenant SaaS): PostgreSQL + Realtime.
// Elke query op tenant-scoped tabellen wordt gefilterd op tenant_id.
// Tenant-scoped: categories, products, sessions, orders, service_requests,
//                reviews, settings.
// Niet tenant-scoped: order_items (via order_id), tenants (admin only).
// ---------------------------------------------------------------------------

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { splitByStation, validateSubmission } from "../rules";
import {
  Category,
  DEFAULT_SETTINGS,
  Order,
  OrderStatus,
  Product,
  RequestKind,
  Review,
  ReviewRoute,
  ServiceRequest,
  Session,
  Settings,
  VisitType,
} from "../types";
import {
  CategoryInput,
  computeStats,
  DataAPI,
  Menu,
  ProductInput,
  SubmitOrderInput,
  SubmitOrderResult,
} from "./api";

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToSession(r: any): Session {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    tableCode: r.table_code,
    tableNumber: r.table_number,
    visitType: r.visit_type,
    partySize: r.party_size,
    status: r.status,
    openedAt: r.opened_at,
    closedAt: r.closed_at,
    roundCount: r.round_count,
    lastFoodOrderAt: r.last_food_order_at,
    reviewDone: r.review_done,
  };
}

function rowToOrder(r: any): Order {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    sessionId: r.session_id,
    tableNumber: r.table_number,
    station: r.station,
    roundNumber: r.round_number,
    status: r.status,
    note: r.note,
    partySize: r.party_size,
    visitType: r.visit_type,
    items: r.items ?? [],
    createdAt: r.created_at,
    readyAt: r.ready_at,
    servedAt: r.served_at,
  };
}

function rowToRequest(r: any): ServiceRequest {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    sessionId: r.session_id,
    tableNumber: r.table_number,
    kind: r.kind,
    note: r.note,
    status: r.status,
    createdAt: r.created_at,
  };
}

function rowToReview(r: any): Review {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    sessionId: r.session_id,
    tableNumber: r.table_number,
    stars: r.stars,
    feedback: r.feedback,
    contact: r.contact,
    routed: r.routed,
    createdAt: r.created_at,
  };
}

function rowToProduct(r: any): Product {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    categoryId: r.category_id,
    name: r.name,
    description: r.description ?? "",
    priceCents: r.price_cents,
    allergens: r.allergens ?? [],
    photoUrl: r.photo_url,
    emoji: r.emoji ?? "\u{1F37D}️",
    available: r.available,
  };
}

function rowToCategory(r: any): Category {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    emoji: r.emoji ?? "\u{1F37D}️",
    isFood: r.is_food,
    countsTowardMinimum: r.counts_toward_minimum,
    sort: r.sort_order,
  };
}

function rowToSettings(r: any): Settings {
  return {
    roundIntervalMin: r.round_interval_min ?? 10,
    minDishesPerPersonRound1: r.min_dishes_per_person_round1 ?? 2,
    drinksBypassTimer: r.drinks_bypass_timer ?? true,
    reviewThreshold: r.review_threshold ?? 4,
    reviewMode: r.review_mode ?? "compliant",
    googleReviewUrl: r.google_review_url ?? "",
    staffPin: r.staff_pin ?? "1234",
    restaurantName: r.restaurant_name ?? "Restaurant",
  };
}

// ---------------------------------------------------------------------------
// SupabaseAdapter — multi-tenant
// ---------------------------------------------------------------------------

export class SupabaseAdapter implements DataAPI {
  readonly mode = "supabase" as const;
  private client: SupabaseClient;
  private tenantId: string;

  constructor(url: string, anonKey: string, tenantId: string) {
    this.client = createClient(url, anonKey);
    this.tenantId = tenantId;
  }

  private _channel: ReturnType<SupabaseClient["channel"]> | null = null;
  private _listeners = new Set<() => void>();
  private _statusListeners = new Set<(s: "connected" | "disconnected" | "connecting") => void>();
  private _status: "connected" | "disconnected" | "connecting" = "disconnected";

  /** Subscribe to connection status changes. */
  onStatusChange(cb: (s: "connected" | "disconnected" | "connecting") => void): () => void {
    this._statusListeners.add(cb);
    cb(this._status);
    return () => { this._statusListeners.delete(cb); };
  }

  get connectionStatus() { return this._status; }

  private _setStatus(s: "connected" | "disconnected" | "connecting") {
    this._status = s;
    this._statusListeners.forEach((cb) => cb(s));
  }

  private _ensureChannel() {
    if (this._channel) return;
    const tid = this.tenantId;
    const channel = this.client.channel(`tenant-${tid}-${Date.now()}`);
    const tables = ["orders", "sessions", "service_requests", "reviews", "products", "settings"];
    const notify = () => this._listeners.forEach((cb) => cb());

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `tenant_id=eq.${tid}` } as any,
        notify
      );
    }

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        this._setStatus("connected");
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        this._setStatus("disconnected");
        // Auto-reconnect after 3s
        this._channel = null;
        if (this._listeners.size > 0) {
          setTimeout(() => {
            if (this._listeners.size > 0) this._ensureChannel();
          }, 3000);
        }
      } else {
        this._setStatus("connecting");
      }
    });

    this._channel = channel;
    this._setStatus("connecting");
  }

  subscribe(onChange: () => void): () => void {
    this._listeners.add(onChange);
    this._ensureChannel();
    return () => {
      this._listeners.delete(onChange);
      if (this._listeners.size === 0 && this._channel) {
        this.client.removeChannel(this._channel);
        this._channel = null;
        this._setStatus("disconnected");
      }
    };
  }

  // --- Menu ---------------------------------------------------------------

  async getMenu(): Promise<Menu> {
    const [cats, prods] = await Promise.all([
      this.client
        .from("categories")
        .select("*")
        .eq("tenant_id", this.tenantId)
        .order("sort_order"),
      this.client
        .from("products")
        .select("*")
        .eq("tenant_id", this.tenantId)
        .order("name"),
    ]);
    if (cats.error) throw cats.error;
    if (prods.error) throw prods.error;
    return {
      categories: (cats.data ?? []).map(rowToCategory),
      products: (prods.data ?? []).map(rowToProduct),
    };
  }

  async setProductAvailability(productId: string, available: boolean) {
    const { error } = await this.client
      .from("products")
      .update({ available })
      .eq("id", productId)
      .eq("tenant_id", this.tenantId);
    if (error) throw error;
  }

  // --- Menu CRUD -----------------------------------------------------------

  async addCategory(input: CategoryInput): Promise<Category> {
    const { data, error } = await this.client
      .from("categories")
      .insert({
        tenant_id: this.tenantId,
        name: input.name,
        emoji: input.emoji,
        is_food: input.isFood,
        counts_toward_minimum: input.countsTowardMinimum,
        sort_order: input.sort,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToCategory(data);
  }

  async updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.emoji !== undefined) patch.emoji = input.emoji;
    if (input.isFood !== undefined) patch.is_food = input.isFood;
    if (input.countsTowardMinimum !== undefined) patch.counts_toward_minimum = input.countsTowardMinimum;
    if (input.sort !== undefined) patch.sort_order = input.sort;
    const { data, error } = await this.client
      .from("categories")
      .update(patch)
      .eq("id", id)
      .eq("tenant_id", this.tenantId)
      .select()
      .single();
    if (error) throw error;
    return rowToCategory(data);
  }

  async deleteCategory(id: string): Promise<void> {
    // Delete products in this category first
    await this.client
      .from("products")
      .delete()
      .eq("category_id", id)
      .eq("tenant_id", this.tenantId);
    const { error } = await this.client
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw error;
  }

  async addProduct(input: ProductInput): Promise<Product> {
    const { data, error } = await this.client
      .from("products")
      .insert({
        tenant_id: this.tenantId,
        category_id: input.categoryId,
        name: input.name,
        description: input.description,
        price_cents: input.priceCents,
        allergens: input.allergens,
        emoji: input.emoji,
        available: true,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToProduct(data);
  }

  async updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
    const patch: Record<string, unknown> = {};
    if (input.categoryId !== undefined) patch.category_id = input.categoryId;
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.priceCents !== undefined) patch.price_cents = input.priceCents;
    if (input.allergens !== undefined) patch.allergens = input.allergens;
    if (input.emoji !== undefined) patch.emoji = input.emoji;
    const { data, error } = await this.client
      .from("products")
      .update(patch)
      .eq("id", id)
      .eq("tenant_id", this.tenantId)
      .select()
      .single();
    if (error) throw error;
    return rowToProduct(data);
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.client
      .from("products")
      .delete()
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw error;
  }

  // --- Sessies ------------------------------------------------------------

  async openSession(args: {
    tableCode: string;
    visitType: VisitType;
    partySize: number;
  }): Promise<Session> {
    const tableNumber = parseInt(args.tableCode.split("-T")[1] ?? "0", 10);
    const { data, error } = await this.client
      .from("sessions")
      .insert({
        tenant_id: this.tenantId,
        table_code: args.tableCode.toUpperCase(),
        table_number: tableNumber,
        visit_type: args.visitType,
        party_size: args.partySize,
        status: "open",
        round_count: 0,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToSession(data);
  }

  async getSession(sessionId: string) {
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("tenant_id", this.tenantId)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToSession(data) : null;
  }

  async getActiveSessionByTable(tableCode: string) {
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .eq("table_code", tableCode.toUpperCase())
      .eq("tenant_id", this.tenantId)
      .neq("status", "closed")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToSession(data) : null;
  }

  private async patchSession(sessionId: string, patch: Record<string, unknown>) {
    const { data, error } = await this.client
      .from("sessions")
      .update(patch)
      .eq("id", sessionId)
      .eq("tenant_id", this.tenantId)
      .select()
      .single();
    if (error) throw error;
    return rowToSession(data);
  }

  async setVisitType(sessionId: string, visitType: VisitType, partySize: number) {
    return this.patchSession(sessionId, {
      visit_type: visitType,
      party_size: partySize,
    });
  }

  async setPartySize(sessionId: string, partySize: number) {
    return this.patchSession(sessionId, { party_size: partySize });
  }

  async requestBill(sessionId: string) {
    const session = await this.patchSession(sessionId, {
      status: "awaiting_payment",
    });
    await this.createServiceRequest(sessionId, "afrekenen");
    void session;
  }

  async closeSession(sessionId: string) {
    const session = await this.patchSession(sessionId, {
      status: "closed",
      closed_at: new Date().toISOString(),
    });
    await this.client
      .from("service_requests")
      .update({ status: "afgehandeld" })
      .eq("session_id", sessionId)
      .eq("tenant_id", this.tenantId)
      .eq("status", "open");
    return session;
  }

  async listActiveSessions() {
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .neq("status", "closed")
      .order("table_number");
    if (error) throw error;
    return (data ?? []).map(rowToSession);
  }

  // --- Bestellingen ---------------------------------------------------------

  private _lastOrderKey: string | null = null;

  async submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
    // Idempotency: prevent duplicate submissions within 5 seconds
    const itemsHash = JSON.stringify(input.items.map(i => `${i.productId}:${i.qty}`).sort());
    const orderKey = `${input.sessionId}:${itemsHash}`;
    if (orderKey === this._lastOrderKey) {
      return { ok: false, errors: ["Deze bestelling is al verzonden. Wacht even."] };
    }
    this._lastOrderKey = orderKey;
    setTimeout(() => { if (this._lastOrderKey === orderKey) this._lastOrderKey = null; }, 5000);

    const session = await this.getSession(input.sessionId);
    if (!session) return { ok: false, errors: ["Sessie niet gevonden."] };
    const menu = await this.getMenu();
    const settings = await this.getSettings();

    const validation = validateSubmission({
      session,
      items: input.items,
      products: menu.products,
      categories: menu.categories,
      settings,
    });
    if (!validation.ok) return { ok: false, errors: validation.errors };

    const { kitchen, bar } = splitByStation(
      input.items,
      menu.products,
      menu.categories
    );
    const now = new Date().toISOString();
    const rows: Record<string, unknown>[] = [];

    if (kitchen.length > 0) {
      rows.push({
        tenant_id: this.tenantId,
        session_id: session.id,
        table_number: session.tableNumber,
        station: "kitchen",
        round_number:
          session.visitType === "diner" ? session.roundCount + 1 : null,
        status: "nieuw",
        note: input.note ?? null,
        party_size: session.partySize,
        visit_type: session.visitType,
        items: kitchen,
      });
    }
    if (bar.length > 0) {
      rows.push({
        tenant_id: this.tenantId,
        session_id: session.id,
        table_number: session.tableNumber,
        station: "bar",
        round_number: null,
        status: "nieuw",
        note: input.note ?? null,
        party_size: session.partySize,
        visit_type: session.visitType,
        items: bar,
      });
    }

    const { data, error } = await this.client.from("orders").insert(rows).select();
    if (error) return { ok: false, errors: [error.message] };

    // Commissie-registratie per bestelling
    const commissionRows = (data ?? []).map((order: any) => ({
      tenant_id: this.tenantId,
      order_id: order.id,
      amount_cents: 10,
    }));
    if (commissionRows.length > 0) {
      await this.client.from("order_commissions").insert(commissionRows);
    }

    if (kitchen.length > 0 && session.visitType === "diner") {
      await this.patchSession(session.id, {
        round_count: session.roundCount + 1,
        last_food_order_at: now,
      });
    }
    return { ok: true, orders: (data ?? []).map(rowToOrder) };
  }

  async listOrders(args?: {
    station?: "kitchen" | "bar";
    activeOnly?: boolean;
    sessionId?: string;
  }): Promise<Order[]> {
    let q = this.client
      .from("orders")
      .select("*")
      .eq("tenant_id", this.tenantId);
    if (args?.station) q = q.eq("station", args.station);
    if (args?.activeOnly) q = q.neq("status", "uitgeserveerd");
    if (args?.sessionId) q = q.eq("session_id", args.sessionId);
    const { data, error } = await q.order("created_at");
    if (error) throw error;
    return (data ?? []).map(rowToOrder);
  }

  async setOrderStatus(orderId: string, status: OrderStatus) {
    const patch: Record<string, unknown> = { status };
    if (status === "gereed") patch.ready_at = new Date().toISOString();
    if (status === "uitgeserveerd") patch.served_at = new Date().toISOString();
    const { error } = await this.client
      .from("orders")
      .update(patch)
      .eq("id", orderId)
      .eq("tenant_id", this.tenantId);
    if (error) throw error;
  }

  // --- Serviceverzoeken -----------------------------------------------------

  async createServiceRequest(sessionId: string, kind: RequestKind, note?: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error("Sessie niet gevonden");
    const { error } = await this.client.from("service_requests").insert({
      tenant_id: this.tenantId,
      session_id: sessionId,
      table_number: session.tableNumber,
      kind,
      note: note ?? null,
      status: "open",
    });
    if (error) throw error;
  }

  async listServiceRequests(openOnly = true) {
    let q = this.client
      .from("service_requests")
      .select("*")
      .eq("tenant_id", this.tenantId);
    if (openOnly) q = q.eq("status", "open");
    const { data, error } = await q.order("created_at");
    if (error) throw error;
    return (data ?? []).map(rowToRequest);
  }

  async resolveServiceRequest(requestId: string) {
    const { error } = await this.client
      .from("service_requests")
      .update({ status: "afgehandeld" })
      .eq("id", requestId)
      .eq("tenant_id", this.tenantId);
    if (error) throw error;
  }

  // --- Reviews ---------------------------------------------------------------

  async submitReview(args: {
    sessionId: string;
    stars: number;
    feedback?: string;
    contact?: string;
    routed: ReviewRoute;
  }) {
    const session = await this.getSession(args.sessionId);
    const { error } = await this.client.from("reviews").insert({
      tenant_id: this.tenantId,
      session_id: args.sessionId,
      table_number: session?.tableNumber ?? 0,
      stars: args.stars,
      feedback: args.feedback ?? null,
      contact: args.contact ?? null,
      routed: args.routed,
    });
    if (error) throw error;
    if (session) {
      await this.patchSession(args.sessionId, { review_done: true });
    }
  }

  async listInternalReviews() {
    const { data, error } = await this.client
      .from("reviews")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("routed", "intern")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToReview);
  }

  // --- Instellingen & statistiek ----------------------------------------------

  async getSettings(): Promise<Settings> {
    const { data, error } = await this.client
      .from("settings")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ...DEFAULT_SETTINGS };
    return rowToSettings(data);
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const next: Settings = { ...current, ...patch };
    next.roundIntervalMin = Math.min(20, Math.max(5, next.roundIntervalMin));

    const { error } = await this.client.from("settings").upsert({
      tenant_id: this.tenantId,
      round_interval_min: next.roundIntervalMin,
      min_dishes_per_person_round1: next.minDishesPerPersonRound1,
      drinks_bypass_timer: next.drinksBypassTimer,
      review_threshold: next.reviewThreshold,
      review_mode: next.reviewMode,
      google_review_url: next.googleReviewUrl,
      staff_pin: next.staffPin,
      restaurant_name: next.restaurantName,
    }, { onConflict: "tenant_id" });
    if (error) throw error;
    return next;
  }

  async getStats() {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const [sessions, orders, requests] = await Promise.all([
      this.client
        .from("sessions")
        .select("*")
        .eq("tenant_id", this.tenantId)
        .gte("opened_at", dayStart.toISOString()),
      this.client
        .from("orders")
        .select("*")
        .eq("tenant_id", this.tenantId)
        .gte("created_at", dayStart.toISOString()),
      this.client
        .from("service_requests")
        .select("*")
        .eq("tenant_id", this.tenantId)
        .eq("status", "open"),
    ]);
    if (sessions.error) throw sessions.error;
    if (orders.error) throw orders.error;
    if (requests.error) throw requests.error;

    // Actieve sessies kunnen voor vandaag geopend zijn: apart ophalen.
    const activeRes = await this.client
      .from("sessions")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .neq("status", "closed");
    const active = (activeRes.data ?? []).map(rowToSession);
    const todaySessions = (sessions.data ?? []).map(rowToSession);
    const merged = [
      ...todaySessions,
      ...active.filter((a) => !todaySessions.some((t) => t.id === a.id)),
    ];

    return computeStats({
      sessions: merged,
      orders: (orders.data ?? []).map(rowToOrder),
      requests: (requests.data ?? []).map(rowToRequest),
    });
  }
}
