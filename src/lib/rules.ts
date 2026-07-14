// ---------------------------------------------------------------------------
// Regels-engine: pure functies, geen framework-afhankelijkheden.
// Alle bestelregels van het concept leven HIER (en nergens anders),
// zodat ze eenvoudig aanpasbaar zijn op basis van pilotfeedback.
// ---------------------------------------------------------------------------

import {
  Category,
  OrderItem,
  Product,
  Session,
  Settings,
  VisitType,
} from "./types";

export interface ParsedTableCode {
  restaurantCode: string; // HAPAS
  locationCode: string; // NW
  tableNumber: number; // 12
  full: string; // HAPAS-NW-T12
}

/** Parseert QR-inhoud zoals "HAPAS-NW-T12". Case-insensitive. */
export function parseTableCode(raw: string): ParsedTableCode | null {
  const m = /^([A-Z0-9]+)-([A-Z0-9]+)-T(\d{1,3})$/i.exec(raw.trim());
  if (!m) return null;
  return {
    restaurantCode: m[1].toUpperCase(),
    locationCode: m[2].toUpperCase(),
    tableNumber: parseInt(m[3], 10),
    full: `${m[1]}-${m[2]}-T${parseInt(m[3], 10)}`.toUpperCase(),
  };
}

export interface VisitProfile {
  requiresPartySize: boolean;
  usesRoundTimer: boolean;
  minPerPersonFirstRound: number; // 0 = geen minimum
}

/** Regelprofiel per bezoektype. Aanpasbaar per concept. */
export function visitProfile(type: VisitType, settings: Settings): VisitProfile {
  switch (type) {
    case "diner":
      return {
        requiresPartySize: true,
        usesRoundTimer: true,
        minPerPersonFirstRound: settings.minDishesPerPersonRound1,
      };
    case "borrel":
      return { requiresPartySize: false, usesRoundTimer: false, minPerPersonFirstRound: 0 };
    default:
      return { requiresPartySize: false, usesRoundTimer: false, minPerPersonFirstRound: 0 };
  }
}

/** Telt items die meetellen voor het eerste-rondeminimum (gerechten). */
export function countMinimumDishes(
  items: OrderItem[],
  products: Product[],
  categories: Category[]
): number {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const prodById = new Map(products.map((p) => [p.id, p]));
  return items.reduce((sum, it) => {
    const p = prodById.get(it.productId);
    if (!p) return sum;
    const c = catById.get(p.categoryId);
    return c && c.isFood && c.countsTowardMinimum ? sum + it.qty : sum;
  }, 0);
}

/** Bevat de bestelling überhaupt gerechten (keuken-items)? */
export function containsFood(
  items: OrderItem[],
  products: Product[],
  categories: Category[]
): boolean {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const prodById = new Map(products.map((p) => [p.id, p]));
  return items.some((it) => {
    const p = prodById.get(it.productId);
    const c = p ? catById.get(p.categoryId) : undefined;
    return !!(c && c.isFood);
  });
}

/**
 * Resterende wachttijd (ms) voordat een nieuwe gerechten-ronde mag.
 * 0 = bestellen mag. Alleen van toepassing bij diner met >= 1 eerdere ronde.
 */
export function foodLockRemainingMs(
  session: Session,
  settings: Settings,
  now: Date = new Date()
): number {
  const profile = visitProfile(session.visitType, settings);
  if (!profile.usesRoundTimer) return 0;
  if (session.roundCount < 1 || !session.lastFoodOrderAt) return 0;
  const unlockAt =
    new Date(session.lastFoodOrderAt).getTime() +
    settings.roundIntervalMin * 60_000;
  return Math.max(0, unlockAt - now.getTime());
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  hasFood: boolean;
  hasDrinks: boolean;
  minimumRequired: number; // 0 als n.v.t.
  minimumCounted: number;
}

/**
 * Valideert een concept-bestelling tegen de regels van de sessie.
 * Wordt client-side gebruikt voor directe feedback en (in Supabase-modus)
 * nogmaals server-side afgedwongen.
 */
export function validateSubmission(args: {
  session: Session;
  items: OrderItem[];
  products: Product[];
  categories: Category[];
  settings: Settings;
  now?: Date;
}): ValidationResult {
  const { session, items, products, categories, settings } = args;
  const now = args.now ?? new Date();
  const errors: string[] = [];

  const hasFood = containsFood(items, products, categories);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const prodById = new Map(products.map((p) => [p.id, p]));
  const hasDrinks = items.some((it) => {
    const p = prodById.get(it.productId);
    const c = p ? catById.get(p.categoryId) : undefined;
    return !!(c && !c.isFood);
  });

  if (items.length === 0) errors.push("Uw bestelling is leeg.");
  if (session.status !== "open")
    errors.push("Deze tafel is gesloten. Vraag de bediening om hulp.");

  const profile = visitProfile(session.visitType, settings);
  const minimumRequired =
    session.roundCount === 0 && profile.minPerPersonFirstRound > 0
      ? profile.minPerPersonFirstRound * session.partySize
      : 0;
  const minimumCounted = countMinimumDishes(items, products, categories);

  // Regel 1: eerste ronde diner — minimum gerechten per persoon.
  if (hasFood && minimumRequired > 0 && minimumCounted < minimumRequired) {
    errors.push(
      `Eerste ronde: kies minimaal ${minimumRequired} gerechten voor ${session.partySize} ${
        session.partySize === 1 ? "persoon" : "personen"
      } (nu ${minimumCounted}).`
    );
  }

  // Regel 1b: bij diner mag de allereerste bestelling niet alléén drank zijn
  // als er nog geen gerechtenronde is geweest? -> bewust NIET geblokkeerd:
  // dranken vooraf bestellen is gastvrij. Het minimum geldt zodra er
  // gerechten in de bestelling zitten (zie Regel 1).

  // Regel 2: rondetimer voor gerechten bij diner.
  if (hasFood) {
    const remaining = foodLockRemainingMs(session, settings, now);
    if (remaining > 0) {
      const min = Math.ceil(remaining / 60_000);
      errors.push(
        `Nieuwe gerechten-ronde kan over ${min} ${min === 1 ? "minuut" : "minuten"}. Drankjes kunnen altijd.`
      );
    }
  }

  // Regel 3: niet-beschikbare producten.
  for (const it of items) {
    const p = prodById.get(it.productId);
    if (!p) errors.push("Onbekend product in bestelling.");
    else if (!p.available) errors.push(`"${p.name}" is helaas uitverkocht.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    hasFood,
    hasDrinks,
    minimumRequired,
    minimumCounted,
  };
}

/** Prioriteit van een keukenticket o.b.v. wachttijd (voor KDS-kleuring). */
export function ticketPriority(createdAt: string, now: Date = new Date()):
  | "normaal"
  | "hoog"
  | "urgent" {
  const min = (now.getTime() - new Date(createdAt).getTime()) / 60_000;
  if (min >= 15) return "urgent";
  if (min >= 8) return "hoog";
  return "normaal";
}

/** Splitst een bestelling in keuken- en bar-items. */
export function splitByStation(
  items: OrderItem[],
  products: Product[],
  categories: Category[]
): { kitchen: OrderItem[]; bar: OrderItem[] } {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const prodById = new Map(products.map((p) => [p.id, p]));
  const kitchen: OrderItem[] = [];
  const bar: OrderItem[] = [];
  for (const it of items) {
    const p = prodById.get(it.productId);
    const c = p ? catById.get(p.categoryId) : undefined;
    if (c && c.isFood) kitchen.push(it);
    else bar.push(it);
  }
  return { kitchen, bar };
}
