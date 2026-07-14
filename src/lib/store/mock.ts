// ---------------------------------------------------------------------------
// Demo-adapter: volledige werking zonder backend.
// - Persistentie: localStorage (overleeft refresh)
// - Realtime: BroadcastChannel + storage-event (alle tabs in dezelfde
//   browser zien elkaars wijzigingen live — gast, keuken, bediening en
//   manager kunnen dus naast elkaar gedemood worden)
// ---------------------------------------------------------------------------

import { CATEGORIES, PRODUCTS } from "../menu";
import { splitByStation, validateSubmission } from "../rules";
import {
  DEFAULT_SETTINGS,
  Order,
  OrderStatus,
  RequestKind,
  Review,
  ReviewRoute,
  ServiceRequest,
  Session,
  Settings,
  VisitType,
} from "../types";
import { computeStats, DataAPI, Menu, SubmitOrderInput, SubmitOrderResult } from "./api";

const LS_KEY = "hapas:demo:v1";
const CHANNEL = "hapas:demo:events";

interface DB {
  sessions: Session[];
  orders: Order[];
  requests: ServiceRequest[];
  reviews: Review[];
  settings: Settings;
  unavailable: string[]; // product-ids die 86'd zijn
}

const emptyDb = (): DB => ({
  sessions: [],
  orders: [],
  requests: [],
  reviews: [],
  settings: { ...DEFAULT_SETTINGS },
  unavailable: [],
});

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function load(): DB {
  if (typeof window === "undefined") return emptyDb();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw) as Partial<DB>;
    return {
      ...emptyDb(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return emptyDb();
  }
}

class MockAdapter implements DataAPI {
  readonly mode = "demo" as const;
  private listeners = new Set<() => void>();
  private bc: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.bc = new BroadcastChannel(CHANNEL);
      this.bc.onmessage = () => this.emitLocal();
      window.addEventListener("storage", (e) => {
        if (e.key === LS_KEY) this.emitLocal();
      });
    }
  }

  private db(): DB {
    return load();
  }

  private save(db: DB) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(db));
    this.bc?.postMessage("change");
    this.emitLocal();
  }

  private emitLocal() {
    this.listeners.forEach((l) => l());
  }

  subscribe(onChange: () => void): () => void {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }

  // --- Menu ---------------------------------------------------------------

  async getMenu(): Promise<Menu> {
    const db = this.db();
    return {
      categories: CATEGORIES,
      products: PRODUCTS.map((p) => ({
        ...p,
        available: !db.unavailable.includes(p.id),
      })),
    };
  }

  async setProductAvailability(productId: string, available: boolean) {
    const db = this.db();
    db.unavailable = available
      ? db.unavailable.filter((id) => id !== productId)
      : Array.from(new Set([...db.unavailable, productId]));
    this.save(db);
  }

  // --- Sessies ------------------------------------------------------------

  async openSession(args: {
    tableCode: string;
    visitType: VisitType;
    partySize: number;
  }): Promise<Session> {
    const db = this.db();
    const tableNumber = parseInt(args.tableCode.split("-T")[1] ?? "0", 10);
    const session: Session = {
      id: uid(),
      tenantId: "demo",
      tableCode: args.tableCode.toUpperCase(),
      tableNumber,
      visitType: args.visitType,
      partySize: args.partySize,
      status: "open",
      openedAt: new Date().toISOString(),
      roundCount: 0,
      lastFoodOrderAt: null,
      closedAt: null,
      reviewDone: false,
    };
    db.sessions.push(session);
    this.save(db);
    return session;
  }

  async getSession(sessionId: string) {
    return this.db().sessions.find((s) => s.id === sessionId) ?? null;
  }

  async getActiveSessionByTable(tableCode: string) {
    const code = tableCode.toUpperCase();
    return (
      this.db().sessions.find(
        (s) => s.tableCode === code && s.status !== "closed"
      ) ?? null
    );
  }

  private updateSession(sessionId: string, patch: Partial<Session>): Session {
    const db = this.db();
    const idx = db.sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) throw new Error("Sessie niet gevonden");
    db.sessions[idx] = { ...db.sessions[idx], ...patch };
    this.save(db);
    return db.sessions[idx];
  }

  async setVisitType(sessionId: string, visitType: VisitType, partySize: number) {
    return this.updateSession(sessionId, { visitType, partySize });
  }

  async setPartySize(sessionId: string, partySize: number) {
    return this.updateSession(sessionId, { partySize });
  }

  async requestBill(sessionId: string) {
    const db = this.db();
    const s = db.sessions.find((x) => x.id === sessionId);
    if (!s) throw new Error("Sessie niet gevonden");
    s.status = "awaiting_payment";
    db.requests.push({
      id: uid(),
      tenantId: "demo",
      sessionId,
      tableNumber: s.tableNumber,
      kind: "afrekenen",
      status: "open",
      createdAt: new Date().toISOString(),
      note: null,
    });
    this.save(db);
  }

  async closeSession(sessionId: string) {
    const db = this.db();
    const s = db.sessions.find((x) => x.id === sessionId);
    if (!s) throw new Error("Sessie niet gevonden");
    s.status = "closed";
    s.closedAt = new Date().toISOString();
    // Open verzoeken van deze tafel afronden
    db.requests = db.requests.map((r) =>
      r.sessionId === sessionId ? { ...r, status: "afgehandeld" } : r
    );
    this.save(db);
    return s;
  }

  async listActiveSessions() {
    return this.db()
      .sessions.filter((s) => s.status !== "closed")
      .sort((a, b) => a.tableNumber - b.tableNumber);
  }

  // --- Bestellingen ---------------------------------------------------------

  private _lastOrderKey: string | null = null;

  async submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
    const itemsHash = JSON.stringify(input.items.map(i => `${i.productId}:${i.qty}`).sort());
    const orderKey = `${input.sessionId}:${itemsHash}`;
    if (orderKey === this._lastOrderKey) {
      return { ok: false, errors: ["Deze bestelling is al verzonden. Wacht even."] };
    }
    this._lastOrderKey = orderKey;
    setTimeout(() => { if (this._lastOrderKey === orderKey) this._lastOrderKey = null; }, 5000);

    const db = this.db();
    const session = db.sessions.find((s) => s.id === input.sessionId);
    if (!session) return { ok: false, errors: ["Sessie niet gevonden."] };

    const menu = await this.getMenu();
    const validation = validateSubmission({
      session,
      items: input.items,
      products: menu.products,
      categories: menu.categories,
      settings: db.settings,
    });
    if (!validation.ok) return { ok: false, errors: validation.errors };

    const { kitchen, bar } = splitByStation(
      input.items,
      menu.products,
      menu.categories
    );
    const now = new Date().toISOString();
    const created: Order[] = [];

    if (kitchen.length > 0) {
      const roundNumber =
        session.visitType === "diner" ? session.roundCount + 1 : null;
      created.push({
        id: uid(),
        tenantId: "demo",
        sessionId: session.id,
        tableNumber: session.tableNumber,
        station: "kitchen",
        roundNumber,
        status: "nieuw",
        note: input.note ?? null,
        partySize: session.partySize,
        visitType: session.visitType,
        items: kitchen,
        createdAt: now,
        readyAt: null,
        servedAt: null,
      });
      if (session.visitType === "diner") {
        session.roundCount += 1;
        session.lastFoodOrderAt = now; // timer start bij verzenden (spec)
      }
    }

    if (bar.length > 0) {
      created.push({
        id: uid(),
        tenantId: "demo",
        sessionId: session.id,
        tableNumber: session.tableNumber,
        station: "bar",
        roundNumber: null,
        status: "nieuw",
        note: input.note ?? null,
        partySize: session.partySize,
        visitType: session.visitType,
        items: bar,
        createdAt: now,
        readyAt: null,
        servedAt: null,
      });
    }

    db.orders.push(...created);
    this.save(db);
    return { ok: true, orders: created };
  }

  async listOrders(args?: {
    station?: "kitchen" | "bar";
    activeOnly?: boolean;
    sessionId?: string;
  }): Promise<Order[]> {
    let orders = this.db().orders;
    if (args?.station) orders = orders.filter((o) => o.station === args.station);
    if (args?.activeOnly)
      orders = orders.filter((o) => o.status !== "uitgeserveerd");
    if (args?.sessionId)
      orders = orders.filter((o) => o.sessionId === args.sessionId);
    return orders.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async setOrderStatus(orderId: string, status: OrderStatus) {
    const db = this.db();
    const o = db.orders.find((x) => x.id === orderId);
    if (!o) throw new Error("Bestelling niet gevonden");
    o.status = status;
    if (status === "gereed" && !o.readyAt) o.readyAt = new Date().toISOString();
    if (status === "uitgeserveerd" && !o.servedAt)
      o.servedAt = new Date().toISOString();
    this.save(db);
  }

  // --- Serviceverzoeken -----------------------------------------------------

  async createServiceRequest(sessionId: string, kind: RequestKind, note?: string) {
    const db = this.db();
    const s = db.sessions.find((x) => x.id === sessionId);
    if (!s) throw new Error("Sessie niet gevonden");
    db.requests.push({
      id: uid(),
      tenantId: "demo",
      sessionId,
      tableNumber: s.tableNumber,
      kind,
      note: note ?? null,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    this.save(db);
  }

  async listServiceRequests(openOnly = true) {
    const all = this.db().requests;
    const filtered = openOnly ? all.filter((r) => r.status === "open") : all;
    return filtered.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async resolveServiceRequest(requestId: string) {
    const db = this.db();
    const r = db.requests.find((x) => x.id === requestId);
    if (r) r.status = "afgehandeld";
    this.save(db);
  }

  // --- Reviews ---------------------------------------------------------------

  async submitReview(args: {
    sessionId: string;
    stars: number;
    feedback?: string;
    contact?: string;
    routed: ReviewRoute;
  }) {
    const db = this.db();
    const s = db.sessions.find((x) => x.id === args.sessionId);
    db.reviews.push({
      id: uid(),
      tenantId: "demo",
      sessionId: args.sessionId,
      tableNumber: s?.tableNumber ?? 0,
      stars: args.stars,
      feedback: args.feedback ?? null,
      contact: args.contact ?? null,
      routed: args.routed,
      createdAt: new Date().toISOString(),
    });
    if (s) s.reviewDone = true;
    this.save(db);
  }

  async listInternalReviews() {
    return this.db()
      .reviews.filter((r) => r.routed === "intern")
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  // --- Instellingen & statistiek ----------------------------------------------

  async getSettings() {
    return this.db().settings;
  }

  async updateSettings(patch: Partial<Settings>) {
    const db = this.db();
    db.settings = { ...db.settings, ...patch };
    // Bewaak grenzen (dashboard-eis: 5–20 minuten)
    db.settings.roundIntervalMin = Math.min(
      20,
      Math.max(5, db.settings.roundIntervalMin)
    );
    this.save(db);
    return db.settings;
  }

  async getStats() {
    const db = this.db();
    return computeStats({
      sessions: db.sessions,
      orders: db.orders,
      requests: db.requests,
    });
  }
}

export const mockAdapter = new MockAdapter();
