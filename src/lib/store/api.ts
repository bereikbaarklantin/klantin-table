// ---------------------------------------------------------------------------
// DataAPI: het contract tussen UI en datalaag.
// Twee implementaties: mock (demo, localStorage + BroadcastChannel) en
// supabase (pilot/productie, PostgreSQL + Realtime). De UI kent alleen
// dit interface — adapters zijn dus uitwisselbaar (modulariteitseis).
// ---------------------------------------------------------------------------

import {
  Category,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  RequestKind,
  Review,
  ReviewRoute,
  ServiceRequest,
  Session,
  Settings,
  Stats,
  VisitType,
} from "../types";

export interface Menu {
  categories: Category[];
  products: Product[];
}

export interface SubmitOrderInput {
  sessionId: string;
  items: OrderItem[];
  note?: string;
}

export interface SubmitOrderResult {
  ok: boolean;
  errors?: string[];
  orders?: Order[]; // gesplitst per station (keuken/bar)
}

export interface DataAPI {
  readonly mode: "demo" | "supabase";

  // Menu
  getMenu(): Promise<Menu>;
  setProductAvailability(productId: string, available: boolean): Promise<void>;

  // Sessies
  openSession(args: {
    tableCode: string;
    visitType: VisitType;
    partySize: number;
  }): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  /** Actieve (open/awaiting_payment) sessie op een tafel, indien aanwezig. */
  getActiveSessionByTable(tableCode: string): Promise<Session | null>;
  setVisitType(
    sessionId: string,
    visitType: VisitType,
    partySize: number
  ): Promise<Session>;
  setPartySize(sessionId: string, partySize: number): Promise<Session>;
  requestBill(sessionId: string): Promise<void>;
  closeSession(sessionId: string): Promise<Session>;
  listActiveSessions(): Promise<Session[]>;

  // Bestellingen
  submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult>;
  listOrders(args?: {
    station?: "kitchen" | "bar";
    activeOnly?: boolean;
    sessionId?: string;
  }): Promise<Order[]>;
  setOrderStatus(orderId: string, status: OrderStatus): Promise<void>;

  // Serviceverzoeken
  createServiceRequest(
    sessionId: string,
    kind: RequestKind,
    note?: string
  ): Promise<void>;
  listServiceRequests(openOnly?: boolean): Promise<ServiceRequest[]>;
  resolveServiceRequest(requestId: string): Promise<void>;

  // Reviews
  submitReview(args: {
    sessionId: string;
    stars: number;
    feedback?: string;
    contact?: string;
    routed: ReviewRoute;
  }): Promise<void>;
  listInternalReviews(): Promise<Review[]>;

  // Instellingen & statistiek
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  getStats(): Promise<Stats>;

  /** Realtime: callback bij elke datawijziging. Retourneert unsubscribe. */
  subscribe(onChange: () => void): () => void;
}

// ---------------------------------------------------------------------------
// Gedeelde statistiekberekening (beide adapters gebruiken deze).
// ---------------------------------------------------------------------------

export function computeStats(data: {
  sessions: Session[];
  orders: Order[];
  requests: ServiceRequest[];
  now?: Date;
}): Stats {
  const now = data.now ?? new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const isToday = (iso: string) => new Date(iso).getTime() >= dayStart.getTime();

  const active = data.sessions.filter((s) => s.status !== "closed");
  const todaySessions = data.sessions.filter((s) => isToday(s.openedAt));
  const todayOrders = data.orders.filter((o) => isToday(o.createdAt));

  const revenue = todayOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, it) => s + it.qty * it.priceCents, 0),
    0
  );

  const bySession = new Map<string, number>();
  for (const o of todayOrders) {
    const t = o.items.reduce((s, it) => s + it.qty * it.priceCents, 0);
    bySession.set(o.sessionId, (bySession.get(o.sessionId) ?? 0) + t);
  }
  const spendValues = Array.from(bySession.values());
  const avgSpend =
    spendValues.length > 0
      ? Math.round(spendValues.reduce((a, b) => a + b, 0) / spendValues.length)
      : 0;

  const kitchenDone = todayOrders.filter(
    (o) => o.station === "kitchen" && o.readyAt
  );
  const avgKitchen =
    kitchenDone.length > 0
      ? kitchenDone.reduce(
          (s, o) =>
            s +
            (new Date(o.readyAt as string).getTime() -
              new Date(o.createdAt).getTime()) /
              60_000,
          0
        ) / kitchenDone.length
      : null;

  const closedToday = todaySessions.filter((s) => s.closedAt);
  const avgTable =
    closedToday.length > 0
      ? closedToday.reduce(
          (s, x) =>
            s +
            (new Date(x.closedAt as string).getTime() -
              new Date(x.openedAt).getTime()) /
              60_000,
          0
        ) / closedToday.length
      : null;

  const qtyByName = new Map<string, number>();
  for (const o of todayOrders)
    for (const it of o.items)
      qtyByName.set(it.name, (qtyByName.get(it.name) ?? 0) + it.qty);
  const popular = Array.from(qtyByName.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 7);

  const sessionsWithOrders = new Set(todayOrders.map((o) => o.sessionId));

  return {
    activeTables: active.length,
    activeTableNumbers: active.map((s) => s.tableNumber).sort((a, b) => a - b),
    revenueTodayCents: revenue,
    avgSpendPerSessionCents: avgSpend,
    ordersToday: todayOrders.length,
    avgOrdersPerSession:
      sessionsWithOrders.size > 0
        ? Math.round((todayOrders.length / sessionsWithOrders.size) * 10) / 10
        : 0,
    avgKitchenMinutes: avgKitchen === null ? null : Math.round(avgKitchen * 10) / 10,
    avgTableMinutes: avgTable === null ? null : Math.round(avgTable),
    popularProducts: popular,
    openKitchenTickets: data.orders.filter(
      (o) => o.station === "kitchen" && o.status !== "uitgeserveerd"
    ).length,
    openBarTickets: data.orders.filter(
      (o) => o.station === "bar" && o.status !== "uitgeserveerd"
    ).length,
    openRequests: data.requests.filter((r) => r.status === "open").length,
  };
}
