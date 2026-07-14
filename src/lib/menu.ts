// ---------------------------------------------------------------------------
// Menukaart Hapas Noordwijk (MVP-seed).
// In demo-modus is dit de bron; in Supabase-modus wordt dezelfde data via
// supabase/seed.sql in de database gezet (genereer met: npm run seed:generate).
// Foto's: photoUrl invullen zodra echte fotografie beschikbaar is; tot die
// tijd toont de UI de emoji als placeholder.
// ---------------------------------------------------------------------------

import { Category, Product } from "./types";

export const CATEGORIES: Category[] = [
  { id: "koud", tenantId: "demo", name: "Koude tapas", emoji: "🥗", isFood: true, countsTowardMinimum: true, sort: 1 },
  { id: "warm", tenantId: "demo", name: "Warme tapas", emoji: "🍳", isFood: true, countsTowardMinimum: true, sort: 2 },
  { id: "vlees", tenantId: "demo", name: "Vlees", emoji: "🥩", isFood: true, countsTowardMinimum: true, sort: 3 },
  { id: "vis", tenantId: "demo", name: "Vis", emoji: "🐟", isFood: true, countsTowardMinimum: true, sort: 4 },
  { id: "vega", tenantId: "demo", name: "Vegetarisch", emoji: "🥦", isFood: true, countsTowardMinimum: true, sort: 5 },
  { id: "dessert", tenantId: "demo", name: "Desserts", emoji: "🍮", isFood: true, countsTowardMinimum: false, sort: 6 },
  { id: "fris", tenantId: "demo", name: "Frisdrank", emoji: "🥤", isFood: false, countsTowardMinimum: false, sort: 7 },
  { id: "bier", tenantId: "demo", name: "Bier", emoji: "🍺", isFood: false, countsTowardMinimum: false, sort: 8 },
  { id: "wijn", tenantId: "demo", name: "Wijn", emoji: "🍷", isFood: false, countsTowardMinimum: false, sort: 9 },
  { id: "cocktail", tenantId: "demo", name: "Cocktails", emoji: "🍹", isFood: false, countsTowardMinimum: false, sort: 10 },
  { id: "warmdrank", tenantId: "demo", name: "Koffie & thee", emoji: "☕", isFood: false, countsTowardMinimum: false, sort: 11 },
];

const p = (
  id: string,
  categoryId: string,
  name: string,
  description: string,
  priceEuro: number,
  allergens: string[],
  emoji: string
): Product => ({
  id,
  tenantId: "demo",
  categoryId,
  name,
  description,
  priceCents: Math.round(priceEuro * 100),
  allergens,
  emoji,
  photoUrl: null,
  available: true,
});

export const PRODUCTS: Product[] = [
  // Koude tapas
  p("pan-tomate", "koud", "Pan con tomate", "Geroosterd brood, tomaat, knoflook en olijfolie.", 4.5, ["gluten"], "🍞"),
  p("jamon", "koud", "Jamón serrano", "24 maanden gerijpte serranoham.", 7.5, [], "🍖"),
  p("manchego", "koud", "Manchego", "Schapenkaas met vijgenchutney.", 6.5, ["melk"], "🧀"),
  p("olijven", "koud", "Gemarineerde olijven", "Groene en zwarte olijven, citroen en tijm.", 3.5, [], "🫒"),
  p("gazpacho", "koud", "Gazpacho", "Koude tomatensoep met komkommer.", 5.0, ["selderij"], "🍅"),
  p("ensaladilla", "koud", "Ensaladilla rusa", "Aardappelsalade met tonijn en ei.", 5.5, ["ei", "vis"], "🥔"),

  // Warme tapas
  p("gambas", "warm", "Gambas al ajillo", "Garnalen in knoflookolie met peper.", 8.5, ["schaaldieren"], "🍤"),
  p("patatas", "warm", "Patatas bravas", "Krokante aardappel, bravas-saus en aioli.", 5.0, ["ei"], "🥔"),
  p("croquetas", "warm", "Croquetas de jamón", "Hamkroketjes (4 st.).", 6.0, ["gluten", "melk"], "🥐"),
  p("tortilla", "warm", "Tortilla española", "Spaanse omelet met aardappel en ui.", 5.5, ["ei"], "🍳"),
  p("champinones", "warm", "Champiñones al ajillo", "Champignons in knoflook en sherry.", 5.5, ["sulfiet"], "🍄"),
  p("pimientos", "warm", "Pimientos de padrón", "Gebakken groene pepertjes met zeezout.", 5.5, [], "🌶️"),

  // Vlees
  p("albondigas", "vlees", "Albóndigas", "Gehaktballetjes in tomatensaus.", 6.5, ["gluten", "ei"], "🍝"),
  p("chorizo", "vlees", "Chorizo a la sidra", "Chorizo gebakken in cider.", 6.5, ["sulfiet"], "🌭"),
  p("pinchos", "vlees", "Pinchos morunos", "Gemarineerde kipspiesjes (2 st.).", 6.5, [], "🍢"),
  p("secreto", "vlees", "Secreto ibérico", "Gegrild Iberico-varken, gerookte paprika.", 9.5, [], "🥩"),

  // Vis
  p("calamares", "vis", "Calamares", "Krokante inktvisringen met aioli.", 7.5, ["gluten", "weekdieren", "ei"], "🦑"),
  p("boquerones", "vis", "Boquerones", "Ingelegde ansjovis met citroen.", 6.0, ["vis"], "🐟"),
  p("pulpo", "vis", "Pulpo a la gallega", "Octopus, aardappel en paprikapoeder.", 10.5, ["weekdieren"], "🐙"),
  p("zalm", "vis", "Zalm tataki", "Kort geschroeide zalm, sesam en soja.", 8.5, ["vis", "sesam", "soja"], "🍣"),

  // Vegetarisch
  p("berenjenas", "vega", "Berenjenas con miel", "Krokante aubergine met honing.", 6.0, ["gluten"], "🍆"),
  p("espinacas", "vega", "Espinacas con garbanzos", "Spinazie met kikkererwten en komijn.", 5.5, [], "🥬"),
  p("queso-cabra", "vega", "Geitenkaas uit de oven", "Met honing en walnoten.", 6.5, ["melk", "noten"], "🧀"),
  p("verduras", "vega", "Verduras a la plancha", "Gegrilde seizoensgroenten met romesco.", 6.0, ["noten"], "🥦"),

  // Desserts
  p("churros", "dessert", "Churros", "Met warme chocoladesaus.", 5.5, ["gluten", "melk"], "🥨"),
  p("crema", "dessert", "Crema catalana", "Met gebrande suikerlaag.", 5.5, ["ei", "melk"], "🍮"),
  p("helado", "dessert", "Helado", "Twee bollen ijs naar keuze.", 4.5, ["melk"], "🍨"),
  p("tarta", "dessert", "Tarta de Santiago", "Amandeltaart met citroen.", 5.5, ["noten", "ei"], "🍰"),

  // Frisdrank
  p("cola", "fris", "Cola / Cola zero", "Fles 200 ml.", 2.9, [], "🥤"),
  p("sinas", "fris", "Sinas", "Fles 200 ml.", 2.9, [], "🍊"),
  p("spa", "fris", "Spa blauw / rood", "Fles 500 ml.", 3.2, [], "💧"),
  p("icetea", "fris", "Ice tea", "Sparkling of green.", 3.1, [], "🍋"),
  p("verse-jus", "fris", "Verse jus d'orange", "Vers geperst.", 4.2, [], "🍊"),

  // Bier
  p("estrella", "bier", "Estrella Galicia", "Tap, 25 cl.", 3.4, ["gluten"], "🍺"),
  p("estrella-groot", "bier", "Estrella Galicia groot", "Tap, 45 cl.", 5.9, ["gluten"], "🍺"),
  p("speciaal", "bier", "Speciaalbier van de maand", "Vraag de bediening of kijk op het bord.", 5.5, ["gluten"], "🍻"),
  p("alcvrij", "bier", "Alcoholvrij bier", "Fles 30 cl.", 3.4, ["gluten"], "🚫"),

  // Wijn
  p("rioja", "wijn", "Rioja crianza", "Glas rode huiswijn.", 5.0, ["sulfiet"], "🍷"),
  p("verdejo", "wijn", "Verdejo", "Glas witte huiswijn.", 5.0, ["sulfiet"], "🥂"),
  p("cava", "wijn", "Cava brut", "Glas.", 5.5, ["sulfiet"], "🍾"),
  p("fles-rioja", "wijn", "Fles Rioja crianza", "0,75 l.", 27.5, ["sulfiet"], "🍷"),

  // Cocktails
  p("sangria", "cocktail", "Sangría", "Huisgemaakt, glas.", 6.5, ["sulfiet"], "🍹"),
  p("sangria-kan", "cocktail", "Kan sangría", "1 liter, voor 4 glazen.", 19.5, ["sulfiet"], "🫗"),
  p("aperol", "cocktail", "Aperol spritz", "Aperol, prosecco, bruiswater.", 8.5, ["sulfiet"], "🍹"),
  p("gintonic", "cocktail", "Gin-tonic", "Spaanse serveerstijl met botanicals.", 9.5, [], "🍸"),
  p("mocktail", "cocktail", "Virgin sangría", "Alcoholvrij, glas.", 5.0, [], "🧃"),

  // Koffie & thee
  p("espresso", "warmdrank", "Espresso", "", 2.8, [], "☕"),
  p("cappuccino", "warmdrank", "Cappuccino", "", 3.4, ["melk"], "☕"),
  p("cafe-bombon", "warmdrank", "Café bombón", "Espresso met gecondenseerde melk.", 3.6, ["melk"], "☕"),
  p("thee", "warmdrank", "Verse muntthee", "Met honing.", 3.4, [], "🌿"),
];

/** Alcoholhoudende categorieën: 18+-vlag op het ticket (NIX18). */
export const ALCOHOL_CATEGORY_IDS = ["bier", "wijn", "cocktail"];
export const ALCOHOL_FREE_PRODUCT_IDS = ["alcvrij", "mocktail"];

export function isAlcoholic(productId: string, categoryId: string): boolean {
  if (ALCOHOL_FREE_PRODUCT_IDS.includes(productId)) return false;
  return ALCOHOL_CATEGORY_IDS.includes(categoryId);
}
