// ---------------------------------------------------------------------------
// Domeinmodel SaaS Bestelsysteem — één bron van waarheid voor alle lagen.
// ---------------------------------------------------------------------------

export type VisitType = "drinks" | "borrel" | "diner";
export type SessionStatus = "open" | "awaiting_payment" | "closed";
export type OrderStation = "kitchen" | "bar";
export type OrderStatus = "nieuw" | "in_bereiding" | "gereed" | "uitgeserveerd";
export type RequestKind = "afrekenen" | "servetten" | "bestek" | "vraag";
export type RequestStatus = "open" | "afgehandeld";
export type ReviewRoute = "intern" | "google";

// ---------------------------------------------------------------------------
// Tenant — elk restaurant is een tenant binnen het SaaS-platform.
// ---------------------------------------------------------------------------

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  tableCount: number;
  googlePlaceId?: string | null;
  subscriptionStatus: "trial" | "active" | "paused" | "cancelled";
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Menukaart
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  emoji: string;
  isFood: boolean;
  /** Telt deze categorie mee voor het minimum van 2 gerechten p.p. in ronde 1? */
  countsTowardMinimum: boolean;
  sort: number;
}

export interface Product {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  allergens: string[];
  photoUrl?: string | null;
  emoji: string;
  available: boolean;
}

// ---------------------------------------------------------------------------
// Sessies & bestellingen
// ---------------------------------------------------------------------------

export interface Session {
  id: string;
  tenantId: string;
  tableCode: string; // bv. SLUG-T12
  tableNumber: number;
  visitType: VisitType;
  partySize: number;
  status: SessionStatus;
  openedAt: string; // ISO
  closedAt?: string | null;
  /** Aantal verzonden gerechten-rondes (alleen relevant bij diner). */
  roundCount: number;
  /** Moment van laatste gerechten-bestelling; basis voor de rondetimer. */
  lastFoodOrderAt?: string | null;
  reviewDone?: boolean;
}

export interface OrderItem {
  productId: string;
  name: string; // snapshot op bestelmoment (fiscale bewaarplicht)
  qty: number;
  priceCents: number; // snapshot
}

export interface Order {
  id: string;
  tenantId: string;
  sessionId: string;
  tableNumber: number;
  station: OrderStation;
  roundNumber: number | null; // alleen keukenorders bij diner
  status: OrderStatus;
  note?: string | null;
  partySize: number;
  visitType: VisitType;
  items: OrderItem[];
  createdAt: string;
  readyAt?: string | null;
  servedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Commissie per bestelling — het verdienmodel van het platform.
// ---------------------------------------------------------------------------

export interface OrderCommission {
  id: string;
  tenantId: string;
  orderId: string;
  amountCents: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Serviceverzoeken & reviews
// ---------------------------------------------------------------------------

export interface ServiceRequest {
  id: string;
  tenantId: string;
  sessionId: string;
  tableNumber: number;
  kind: RequestKind;
  note?: string | null;
  status: RequestStatus;
  createdAt: string;
}

export interface Review {
  id: string;
  tenantId: string;
  sessionId: string;
  tableNumber: number;
  stars: number; // 1-5
  feedback?: string | null;
  contact?: string | null;
  routed: ReviewRoute;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Instellingen per tenant
// ---------------------------------------------------------------------------

export interface Settings {
  /** Bestelinterval tussen gerechten-rondes bij diner (minuten, 5–20). */
  roundIntervalMin: number;
  /** Minimum aantal gerechten per persoon in ronde 1 van een diner. */
  minDishesPerPersonRound1: number;
  /** Drankjes mogen de rondetimer altijd omzeilen. */
  drinksBypassTimer: boolean;
  /** 4-5 sterren -> Google; 1-3 -> intern formulier eerst. */
  reviewThreshold: number;
  /**
   * "compliant": beide opties (Google + intern) blijven bij elke score
   * zichtbaar — aanbevolen i.v.m. Google-reviewbeleid en ACM-richtlijnen.
   * "strikt": lage scores zien alléén het interne formulier.
   */
  reviewMode: "compliant" | "strikt";
  googleReviewUrl: string;
  /** Pincode voor personeelsschermen (pilot; later Supabase Auth). */
  staffPin: string;
  restaurantName: string;
}

export const DEFAULT_SETTINGS: Settings = {
  roundIntervalMin: 10,
  minDishesPerPersonRound1: 2,
  drinksBypassTimer: true,
  reviewThreshold: 4,
  reviewMode: "compliant",
  googleReviewUrl:
    "https://search.google.com/local/writereview?placeid=VUL_PLACE_ID_IN",
  staffPin: "1234",
  restaurantName: "Mijn Restaurant",
};

// ---------------------------------------------------------------------------
// Statistieken — per tenant (bestaand)
// ---------------------------------------------------------------------------

export interface Stats {
  activeTables: number;
  activeTableNumbers: number[];
  revenueTodayCents: number;
  avgSpendPerSessionCents: number;
  ordersToday: number;
  avgOrdersPerSession: number;
  avgKitchenMinutes: number | null; // nieuw -> gereed
  avgTableMinutes: number | null; // geopend -> gesloten
  popularProducts: { name: string; qty: number }[];
  openKitchenTickets: number;
  openBarTickets: number;
  openRequests: number;
}

// ---------------------------------------------------------------------------
// Statistieken — super-admin dashboard (platformbreed)
// ---------------------------------------------------------------------------

export interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  totalOrdersToday: number;
  totalCommissionTodayCents: number;
  tenantStats: {
    tenantId: string;
    tenantName: string;
    ordersToday: number;
    commissionTodayCents: number;
    subscriptionStatus: string;
  }[];
}

// ---------------------------------------------------------------------------
// Constanten
// ---------------------------------------------------------------------------

export const VISIT_TYPE_META: Record<
  VisitType,
  { label: string; description: string; emoji: string }
> = {
  drinks: {
    label: "Alleen drankjes",
    description: "Vrij bestellen, geen regels of timers.",
    emoji: "🥂",
  },
  borrel: {
    label: "Borrel met hapjes",
    description: "Drankjes en kleine hapjes, vrij bestellen.",
    emoji: "🫒",
  },
  diner: {
    label: "Volledig diner",
    description: "Tapas in rondes. Eerste ronde min. 2 gerechten p.p.",
    emoji: "🥘",
  },
};

export const ALLERGENS = [
  "gluten",
  "ei",
  "vis",
  "pinda",
  "noten",
  "soja",
  "melk",
  "schaaldieren",
  "weekdieren",
  "selderij",
  "mosterd",
  "sesam",
  "sulfiet",
  "lupine",
] as const;
