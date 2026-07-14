# Hapas — Architectuur

Technische architectuurdocumentatie voor het Hapas digitaal bestelsysteem.

---

## Systeemoverzicht

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL (Hosting)                         │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │  Gast    │  │ Kitchen  │  │ Service  │  │   Manager     │   │
│  │  App     │  │ Display  │  │Dashboard │  │  Dashboard    │   │
│  │ (mobiel) │  │ (tablet) │  │ (tablet) │  │  (desktop)    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬────────┘   │
│       │              │             │               │            │
│       └──────────────┴─────────────┴───────────────┘            │
│                              │                                  │
│                    ┌─────────┴──────────┐                       │
│                    │    Store Adapter   │                       │
│                    │    (DataAPI)       │                       │
│                    └─────────┬──────────┘                       │
│                              │                                  │
│              ┌───────────────┼───────────────┐                  │
│              │                               │                  │
│    ┌─────────┴──────────┐  ┌─────────────────┴───────┐          │
│    │   MockAdapter      │  │   SupabaseAdapter       │          │
│    │   (demo mode)      │  │   (productie)           │          │
│    │                    │  │                          │          │
│    │ • localStorage     │  │ • PostgreSQL             │          │
│    │ • BroadcastChannel │  │ • Supabase Realtime      │          │
│    └────────────────────┘  └──────────┬───────────────┘          │
│                                       │                         │
└───────────────────────────────────────┼─────────────────────────┘
                                        │
                              ┌─────────┴──────────┐
                              │     SUPABASE       │
                              │                    │
                              │ • PostgreSQL DB    │
                              │ • Realtime (WS)    │
                              │ • Auth             │
                              │ • Row Level Sec.   │
                              └────────────────────┘
```

---

## Dataflow

De volledige flow van QR-scan tot serveren:

```
  Gast scant QR-code
        │
        ▼
  /t/HAPAS-NW-T{nr}  ──►  Gast App laadt menukaart
        │
        ▼
  Gast selecteert items en plaatst bestelling
        │
        ▼
  Order wordt aangemaakt (status: "pending")
        │
        ▼
  ┌─────┴─────────────────────┐
  │   Station-splitsing       │
  │                           │
  │  Elk item heeft een       │
  │  station: "kitchen"       │
  │  of "bar"                 │
  └─────┬───────────┬─────────┘
        │           │
        ▼           ▼
   ┌─────────┐ ┌─────────┐
   │ Keuken  │ │   Bar   │
   │  KDS    │ │   KDS   │
   └────┬────┘ └────┬────┘
        │           │
        ▼           ▼
  Item status: "preparing" ──► "ready"
        │           │
        └─────┬─────┘
              ▼
  ┌───────────────────────┐
  │   Service Dashboard   │
  │                       │
  │  Notificatie: items   │
  │  klaar om te serveren │
  └───────────┬───────────┘
              │
              ▼
  Service markeert als "served"
              │
              ▼
  Afrekenen ──► Review Funnel
```

### Drink Bypass

Drankjes (station: `bar`) hebben een kortere flow. In tegenstelling tot keukenitems hoeven barorders niet door een "preparing"-fase — ze gaan direct van `pending` naar `ready` wanneer de barmedewerker ze accepteert. Dit voorkomt onnodige stappen voor simpele drankbestellingen.

---

## Dual Data Mode

Het systeem ondersteunt twee datalagen, geselecteerd via `NEXT_PUBLIC_DATA_MODE`:

### Demo Mode (`demo`)

```
┌──────────┐     ┌──────────────────┐     ┌──────────┐
│  Tab 1   │────►│  localStorage    │◄────│  Tab 2   │
│ (Gast)   │     │  (persistentie)  │     │ (Keuken) │
└────┬─────┘     └──────────────────┘     └────┬─────┘
     │                                         │
     └────────► BroadcastChannel ◄─────────────┘
                (realtime sync tussen tabs)
```

- **Opslag**: `localStorage` — alle data (menu, orders, tafels) wordt lokaal bewaard
- **Sync**: `BroadcastChannel` API — veranderingen worden direct naar alle open tabs gepusht
- **Voordelen**: geen server nodig, werkt offline, ideaal voor demo's en ontwikkeling
- **Beperking**: werkt alleen binnen dezelfde browser op hetzelfde apparaat

### Supabase Mode (`supabase`)

```
┌──────────┐     ┌──────────────────┐     ┌──────────┐
│ Device 1 │────►│    Supabase      │◄────│ Device 2 │
│ (Gast)   │     │   PostgreSQL     │     │ (Keuken) │
└────┬─────┘     └──────────────────┘     └────┬─────┘
     │                                         │
     └────────► Supabase Realtime ◄────────────┘
                (WebSocket sync)
```

- **Opslag**: PostgreSQL via Supabase — productiewaardige relationele database
- **Sync**: Supabase Realtime — WebSocket-gebaseerde change notifications
- **Voordelen**: werkt cross-device, persistent, schaalbaar, Row Level Security
- **Vereisten**: Supabase project met schema en credentials

---

## Store Adapter Pattern

Alle data-operaties lopen via een uniforme `DataAPI` interface. De juiste adapter wordt bij het opstarten geselecteerd op basis van de environment variabele.

```typescript
// lib/store/types.ts
interface DataAPI {
  // Menu
  getMenuItems(): Promise<MenuItem[]>
  getMenuItemsByStation(station: Station): Promise<MenuItem[]>

  // Orders
  createOrder(order: NewOrder): Promise<Order>
  getOrdersByTable(tableCode: string): Promise<Order[]>
  getActiveOrders(): Promise<Order[]>
  updateOrderItemStatus(itemId: string, status: ItemStatus): Promise<void>

  // Tafels
  getTables(): Promise<Table[]>
  getTableByCode(code: string): Promise<Table | null>
  updateTableStatus(code: string, status: TableStatus): Promise<void>

  // Rondes
  getCurrentRound(tableCode: string): Promise<Round | null>
  startNewRound(tableCode: string): Promise<Round>

  // Realtime
  subscribeToOrders(callback: (order: Order) => void): Unsubscribe
  subscribeToTable(code: string, callback: (table: Table) => void): Unsubscribe

  // Reviews
  logReviewAction(tableCode: string, action: ReviewAction): Promise<void>
}
```

```typescript
// lib/store/index.ts
import { MockAdapter } from './mock-adapter'
import { SupabaseAdapter } from './supabase-adapter'

export function createDataAdapter(): DataAPI {
  if (process.env.NEXT_PUBLIC_DATA_MODE === 'supabase') {
    return new SupabaseAdapter()
  }
  return new MockAdapter()
}
```

Dit pattern maakt het mogelijk om:
- In demo mode te werken zonder enige backend configuratie
- Naadloos over te schakelen naar Supabase voor productie
- Eventueel andere backends toe te voegen (bijv. directe PostgreSQL, Firebase)

---

## Key Design Decisions

### 1. Rondetimer Logica

Bij dinerbestellingen werkt het systeem met **rondes** (gangen). Elke ronde heeft:

- **Minimale besteltijd**: een timer die aangeeft hoeveel tijd gasten hebben om items toe te voegen voordat de ronde wordt afgesloten
- **Automatische afsluiting**: na de timer wordt de ronde "gesloten" en gaat naar de keuken
- **Handmatige override**: service kan een ronde eerder sluiten of de timer verlengen

Dit voorkomt dat de keuken continu losse items ontvangt en zorgt voor gestructureerde gangen.

### 2. Drink Bypass

Drankjes volgen een vereenvoudigd pad:
- Ze worden **niet** geblokkeerd door de rondetimer
- Ze gaan direct naar het barstation, ongeacht de rondestatus
- Dit zorgt ervoor dat gasten niet hoeven te wachten op hun drankje tot de volgende keukengang

### 3. First-Round Minimum Enforcement

De eerste ronde van een diner heeft een **minimumbestelling** (bijv. minimaal 3 tapas per persoon). Dit wordt afgedwongen in de UI:
- De bestelknop is uitgeschakeld totdat het minimum is bereikt
- Een voortgangsindicator toont hoeveel items nog nodig zijn
- Na de eerste ronde geldt geen minimum meer

### 4. Review Funnel — Compliance vs. Strict

De review funnel is **compliance-based**, niet strict:
- Na afrekenen wordt de gast **geleid** naar een reviewpagina
- De gast kan de review overslaan (geen hardblock)
- Wel wordt gelogd of de gast de reviewpagina heeft bezocht en of er doorgeklikt is
- Dit respecteert de gast terwijl het reviewverzoek zichtbaar blijft

### 5. Station Splitting

Elk menu-item heeft een `station` eigenschap (`kitchen` of `bar`). Bij het plaatsen van een order:
- De order wordt als geheel opgeslagen
- Individuele items worden naar het juiste station gerouteerd
- Elk station ziet alleen zijn eigen items op het KDS
- Service ziet de volledige order, inclusief status per item van beide stations

---

## Paginastructuur

| Route | Scherm | Toegang | Beschrijving |
|-------|--------|---------|--------------|
| `/` | Homepage | Openbaar | Overzicht van alle schermen, links naar demo |
| `/t/[code]` | Gast App | Openbaar (via QR) | Menukaart, bestellen, rondeoverzicht, afrekenen |
| `/kitchen` | Kitchen Display | PinGate | Inkomende orders per station, statusbeheer |
| `/service` | Service Dashboard | PinGate | Tafeloverzicht, ordernotificaties, afrekenen |
| `/manager` | Manager Dashboard | PinGate | Omzet, menu beheer, instellingen |

---

## Component Architectuur

```
app/
├── layout.tsx                    # Root layout (fonts, providers)
├── page.tsx                      # Homepage
│
├── t/[code]/
│   ├── page.tsx                  # Gast bestelpagina
│   └── components/
│       ├── MenuView.tsx          # Menukaart met categorieën
│       ├── CartDrawer.tsx        # Winkelwagen overlay
│       ├── RoundTimer.tsx        # Timer voor dinerronde
│       ├── OrderHistory.tsx      # Eerdere bestellingen
│       └── ReviewFunnel.tsx      # Post-checkout review flow
│
├── kitchen/
│   ├── page.tsx                  # KDS hoofdpagina
│   └── components/
│       ├── OrderCard.tsx         # Individuele orderkaart
│       ├── StationFilter.tsx     # Filter: keuken / bar / alles
│       ├── OrderQueue.tsx        # Orderrij per station
│       └── ItemStatusToggle.tsx  # Status toggle per item
│
├── service/
│   ├── page.tsx                  # Service hoofdpagina
│   └── components/
│       ├── TableGrid.tsx         # Overzicht van alle tafels
│       ├── TableCard.tsx         # Status per tafel
│       ├── ActiveOrders.tsx      # Openstaande orders
│       └── CheckoutFlow.tsx      # Afrekeningsproces
│
└── manager/
    ├── page.tsx                  # Manager hoofdpagina
    └── components/
        ├── RevenueOverview.tsx   # Omzetoverzicht
        ├── MenuEditor.tsx        # Menukaart bewerken
        ├── TableManager.tsx      # Tafels beheren
        └── SettingsPanel.tsx     # App-instellingen

components/
├── shared/
│   ├── Button.tsx               # Basis button component
│   ├── Badge.tsx                # Status badges
│   ├── Modal.tsx                # Modal dialog
│   ├── Toast.tsx                # Notificaties
│   └── LoadingSpinner.tsx       # Laad-indicator
│
├── PinGate.tsx                  # PIN-verificatie voor staff pagina's
└── DataProvider.tsx             # Context provider voor DataAPI
```

---

## Security Model

### Huidige Pilot: PinGate

In de MVP/pilot-fase wordt een eenvoudig PIN-systeem gebruikt:

```
Gast pagina's (/t/[code])     →  Geen authenticatie nodig
Staff pagina's (/kitchen,     →  PinGate: 4-cijferige PIN
  /service, /manager)              (standaard: 1234)
```

- De PIN wordt server-side geconfigureerd via `STAFF_PIN` environment variabele
- Na invoer wordt een sessie-token opgeslagen in `sessionStorage`
- Geen gebruikersrollen — iedereen met de PIN heeft toegang tot alle staff-pagina's

### Gepland: Supabase Auth (Fase 2)

```
┌──────────────┐
│ Supabase Auth │
├──────────────┤
│ Rollen:      │
│ • owner      │──► Volledige toegang + gebruikersbeheer
│ • manager    │──► Dashboard + menu + instellingen
│ • service    │──► Service dashboard + afrekenen
│ • kitchen    │──► Alleen KDS
│ • guest      │──► Alleen bestellen (anoniem)
└──────────────┘
```

- Supabase Auth met email/password login voor staff
- Row Level Security (RLS) policies per rol
- Gasten blijven anoniem (geen account nodig)

---

## Multi-Tenant Readiness

Het systeem is voorbereid op meerdere locaties:

### Tenant ID

Elke record in de database bevat een `tenant_id` kolom:

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'HAPAS-NW',
  table_code TEXT NOT NULL,
  items JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policy: gebruikers zien alleen data van hun eigen tenant
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id'));
```

### Tafelcode Formaat

Het tafelcode formaat is ontworpen voor multi-locatie:

```
{MERK}-{LOCATIE}-T{NUMMER}

HAPAS-NW-T1    →  Hapas Noordwijk, Tafel 1
HAPAS-AMS-T5   →  Hapas Amsterdam, Tafel 5
HAPAS-DH-T12   →  Hapas Den Haag, Tafel 12
```

De locatiecode wordt afgeleid uit de tafelcode en gebruikt als `tenant_id` filter.

### Uitbreiding

Om een nieuwe locatie toe te voegen:
1. Voeg een nieuw `tenant_id` toe (bijv. `HAPAS-AMS`)
2. Genereer QR-codes met het nieuwe locatieprefix
3. Configureer menu-items voor de nieuwe locatie
4. Wijs staff-accounts toe aan de juiste tenant

---

## Licentie

**Private / All rights reserved** — Hapas Noordwijk
