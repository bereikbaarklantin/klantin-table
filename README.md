# Hapas — Digitaal Bestelsysteem

> Slim digitaal bestelsysteem voor Hapas Noordwijk: gasten bestellen via QR-code, de keuken en bar ontvangen orders realtime, en het serviceteam houdt overzicht.

---

## Features

- **QR-code bestellen** — gasten scannen de tafelcode en bestellen direct vanaf hun telefoon
- **Rondetimer (diner)** — gestructureerde dinergangen met timer en minimumbestelling per ronde
- **Kitchen Display System (KDS)** — keuken- en barschermen met realtime orderstroom, gesplitst per station
- **Service Dashboard** — overzicht van alle tafels, orderstatus en notificaties voor het serviceteam
- **Manager Dashboard** — omzet, bezetting, menukaart beheer en instellingen
- **Review Funnel** — na afrekenen worden gasten naar een reviewpagina geleid (Google/TripAdvisor)
- **Demo Mode** — volledig functioneel zonder database; ideaal om te testen en te presenteren

---

## Tech Stack

| Laag | Technologie |
|------|-------------|
| Framework | Next.js 14 (App Router) |
| UI | React 18 + Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime (productie) / BroadcastChannel (demo) |
| Auth | Supabase Auth (productie) / PinGate (pilot) |
| Hosting | Vercel |

---

## Quick Start — Demo Mode

Demo mode draait volledig lokaal, zonder Supabase. Alle data wordt opgeslagen in `localStorage` en gesynchroniseerd tussen tabs via de `BroadcastChannel` API.

```bash
# 1. Clone de repository
git clone <repo-url>
cd hapas-mvp

# 2. Kopieer environment variabelen (demo is standaard)
cp .env.example .env.local

# 3. Installeer dependencies
npm install

# 4. Start de development server
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) — de homepage toont alle schermen
6. Open een tafellink (bijv. `/t/HAPAS-NW-T1`) in je telefoon of een nieuw tabblad
7. Open `/kitchen`, `/service` en `/manager` in aparte tabs
8. **Staff PIN: `1234`**

---

## Supabase Setup (Productie)

Voor productiegebruik met echte database en realtime synchronisatie:

```bash
# 1. Maak een nieuw Supabase project aan op https://supabase.com

# 2. Voer het database schema uit
psql -h <supabase-host> -U postgres -d postgres -f supabase/schema.sql

# 3. Laad de seed data (menu-items, tafels, etc.)
psql -h <supabase-host> -U postgres -d postgres -f supabase/seed.sql

# 4. Stel environment variabelen in (in .env.local of Vercel dashboard)
NEXT_PUBLIC_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# 5. Deploy naar Vercel
vercel --prod
```

---

## Mappenstructuur

```
hapas-mvp/
├── app/
│   ├── page.tsx                 # Homepage — overzicht van alle schermen
│   ├── t/[code]/page.tsx        # Gast bestelpagina (QR entry point)
│   ├── kitchen/page.tsx         # Kitchen Display System
│   ├── service/page.tsx         # Service Dashboard
│   └── manager/page.tsx         # Manager Dashboard
├── components/
│   ├── guest/                   # Gastbestelcomponenten
│   ├── kitchen/                 # KDS componenten
│   ├── service/                 # Service componenten
│   ├── manager/                 # Manager componenten
│   ├── shared/                  # Gedeelde UI componenten
│   └── PinGate.tsx              # PIN-verificatie wrapper
├── lib/
│   ├── store/
│   │   ├── types.ts             # DataAPI interface definitie
│   │   ├── mock-adapter.ts      # Demo mode adapter (localStorage)
│   │   ├── supabase-adapter.ts  # Supabase adapter (productie)
│   │   └── index.ts             # Adapter factory
│   ├── supabase/
│   │   ├── client.ts            # Supabase client configuratie
│   │   └── realtime.ts          # Realtime subscriptions
│   ├── utils/                   # Hulpfuncties
│   └── constants.ts             # App-brede constanten
├── supabase/
│   ├── schema.sql               # Database schema
│   └── seed.sql                 # Seed data (menu, tafels)
├── public/                      # Statische bestanden
├── .env.example                 # Voorbeeld environment variabelen
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## QR-code Formaat

Elke tafel heeft een unieke QR-code die verwijst naar:

```
https://<domein>/t/HAPAS-NW-T{nummer}
```

Voorbeelden:
- `https://hapas.nl/t/HAPAS-NW-T1` — Tafel 1
- `https://hapas.nl/t/HAPAS-NW-T12` — Tafel 12

Het formaat `HAPAS-NW-T{nummer}` is opgebouwd uit:
- `HAPAS` — merk
- `NW` — locatie (Noordwijk)
- `T{nummer}` — tafelnummer

Dit formaat is voorbereid op multi-locatie uitbreiding (bijv. `HAPAS-AMS-T5`).

---

## Environment Variabelen

| Variabele | Verplicht | Standaard | Beschrijving |
|-----------|-----------|-----------|--------------|
| `NEXT_PUBLIC_DATA_MODE` | Nee | `demo` | `demo` of `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | Bij supabase | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Bij supabase | — | Supabase anonymous key |
| `NEXT_PUBLIC_SITE_URL` | Nee | `http://localhost:3000` | Basis-URL voor QR-codes |
| `NEXT_PUBLIC_RESTAURANT_NAME` | Nee | `Hapas Noordwijk` | Restaurantnaam in de UI |
| `STAFF_PIN` | Nee | `1234` | PIN voor staff-schermen |

---

## MVP Roadmap

### Fase 1 — Pilot (huidig)
- Volledig werkend bestelsysteem met demo mode
- QR-code bestellen voor gasten
- KDS met station-splitsing (keuken/bar)
- Service dashboard met tafeloverzicht
- Manager dashboard met basisfuncties
- Review funnel na afrekenen
- PinGate beveiliging voor staff-schermen

### Fase 2 — Productie
- Supabase Auth met rollen (eigenaar, manager, service, keuken)
- Lightspeed POS integratie (kassasynchronisatie)
- Multi-locatie ondersteuning (meerdere vestigingen onder 1 account)
- Betaalintegratie (Mollie/Stripe)

### Fase 3 — Groei
- Analytics dashboard (omzet, populaire items, piektijden)
- Upselling AI (slimme suggesties op basis van bestelgedrag)
- Formitable / Zenchef integratie (reserveringen koppelen aan tafels)
- Meertalige menukaart (NL/EN/DE)

---

## Licentie

**Private / All rights reserved**

Dit project is eigendom van Hapas Noordwijk. Ongeautoriseerd kopiëren, verspreiden of gebruik van deze code is niet toegestaan.
