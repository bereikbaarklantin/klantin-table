"use client";

// ---------------------------------------------------------------------------
// Pilot-checklist Hapas Noordwijk — stappen om live te gaan.
// Interactieve checklist die de manager doorloopt om het systeem
// productie-klaar te maken.
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import PinGate from "@/components/PinGate";
import { Card } from "@/components/ui";

interface CheckItem {
  id: string;
  label: string;
  description: string;
  link?: string;
  linkLabel?: string;
}

interface CheckSection {
  title: string;
  emoji: string;
  items: CheckItem[];
}

const SECTIONS: CheckSection[] = [
  {
    title: "Database & beveiliging",
    emoji: "🔐",
    items: [
      {
        id: "rls",
        label: "Row Level Security (RLS) ingeschakeld",
        description:
          "Alle tenant-scoped tabellen (categories, products, sessions, orders, service_requests, reviews, settings) moeten RLS-policies hebben die filteren op tenant_id.",
      },
      {
        id: "anon-key",
        label: "Anon key gecontroleerd",
        description:
          "Zorg dat de Supabase anon key alleen leesrechten heeft via RLS. Controleer dat service_role key NIET in de frontend zit.",
      },
      {
        id: "backup",
        label: "Database backup ingesteld",
        description:
          "Supabase Free plan heeft automatische backups. Controleer of Point-in-Time Recovery beschikbaar is voor je plan.",
      },
    ],
  },
  {
    title: "Menu & content",
    emoji: "🍽️",
    items: [
      {
        id: "menu-complete",
        label: "Volledige menukaart ingevoerd",
        description:
          "Alle categorieën en producten met correcte prijzen, beschrijvingen, allergenen en emoji's.",
        link: "/manager",
        linkLabel: "Menu-editor openen",
      },
      {
        id: "menu-prices",
        label: "Prijzen gecontroleerd",
        description:
          "Alle prijzen dubbelchecken met de fysieke menukaart. Let op: prijzen worden in centen opgeslagen.",
      },
      {
        id: "allergens",
        label: "Allergenen gecontroleerd",
        description:
          "Alle 14 EU-allergenen correct toegewezen per product. Dit is wettelijk verplicht.",
      },
      {
        id: "categories-order",
        label: "Categorievolgorde correct",
        description:
          "Categorieën staan in de juiste sorteervolgorde (koude tapas → warme tapas → vlees → vis → etc.).",
      },
    ],
  },
  {
    title: "QR-codes & tafels",
    emoji: "📱",
    items: [
      {
        id: "qr-generated",
        label: "QR-codes gegenereerd voor alle tafels",
        description:
          "Genereer QR-codes met de juiste slug en het correcte aantal tafels.",
        link: "/manager/qr",
        linkLabel: "QR-generator openen",
      },
      {
        id: "qr-printed",
        label: "QR-codes geprint en gelamineerd",
        description:
          "Print op stevig papier of lamineer de QR-codes zodat ze bestand zijn tegen vlekken en vocht.",
      },
      {
        id: "qr-placed",
        label: "QR-codes op tafels geplaatst",
        description:
          "Elke tafel heeft een QR-code met het juiste tafelnummer. Test of de nummering klopt.",
      },
      {
        id: "qr-scan-test",
        label: "QR-scan getest op 3+ tafels",
        description:
          "Scan minstens 3 verschillende QR-codes en doorloop het volledige bestelproces als gast.",
      },
    ],
  },
  {
    title: "Instellingen",
    emoji: "⚙️",
    items: [
      {
        id: "settings-interval",
        label: "Bestelinterval ingesteld",
        description:
          "Standaard 10 minuten. Pas aan naar de snelheid van je keuken (5–20 minuten).",
        link: "/manager",
        linkLabel: "Instellingen openen",
      },
      {
        id: "settings-min",
        label: "Minimum gerechten per persoon ingesteld",
        description:
          "Standaard 2 gerechten per persoon in de eerste dinerronde. Pas aan als nodig.",
      },
      {
        id: "settings-pin",
        label: "Pincode personeel gewijzigd",
        description:
          "Verander de standaard pin (1234) naar een unieke code voor je team.",
      },
      {
        id: "settings-google",
        label: "Google Review-link ingevuld",
        description:
          "Vul je Google Place ID in zodat tevreden gasten een Google-review kunnen achterlaten.",
      },
      {
        id: "settings-name",
        label: "Restaurantnaam ingesteld",
        description:
          "De naam die gasten zien in de bestel-app en op bonnen.",
      },
    ],
  },
  {
    title: "Hosting & domein",
    emoji: "🌐",
    items: [
      {
        id: "vercel-deploy",
        label: "Vercel deployment actief",
        description:
          "Controleer dat de Vercel deployment groen is en de app bereikbaar is op het productie-domein.",
      },
      {
        id: "env-vars",
        label: "Omgevingsvariabelen ingesteld op Vercel",
        description:
          "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_DATA_MODE=supabase, NEXT_PUBLIC_TENANT_ID moeten ingesteld zijn.",
      },
      {
        id: "custom-domain",
        label: "Custom domein (optioneel)",
        description:
          "Optioneel: koppel een eigen domein (bv. bestellen.hapas.nl) aan de Vercel deployment.",
      },
    ],
  },
  {
    title: "Teamtraining & testrun",
    emoji: "👥",
    items: [
      {
        id: "train-kitchen",
        label: "Keukenpersoneel getraind",
        description:
          "Laat de keuken het keuken-display (/kitchen) zien. Leg uit: tikken om status te veranderen (nieuw → in bereiding → gereed).",
      },
      {
        id: "train-service",
        label: "Bediening getraind",
        description:
          "Laat bediening het service-display (/service) zien. Leg uit: bar-bestellingen, serviceverzoeken, gereed-meldingen.",
      },
      {
        id: "train-manager",
        label: "Manager vertrouwd met dashboard",
        description:
          "Doorloop het manager-dashboard: KPI's, instellingen, menu-editor, beschikbaarheid (86-lijst).",
      },
      {
        id: "test-run",
        label: "Testrun uitgevoerd (staff dinner)",
        description:
          "Doe een volledige testrun met het team: bestellen, keuken, serveren, afrekenen. Noteer verbeterpunten.",
      },
      {
        id: "soft-launch",
        label: "Soft launch met 2-3 tafels",
        description:
          "Ga eerst live met een paar tafels naast de normale bediening. Schaal op als alles soepel loopt.",
      },
    ],
  },
];

const LS_KEY = "hapas:pilot-checklist";

function loadChecked(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveChecked(set: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify(Array.from(set)));
}

function PilotChecklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    setChecked(loadChecked());
  }, []);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveChecked(next);
      return next;
    });
  }

  const totalItems = SECTIONS.reduce((s, sec) => s + sec.items.length, 0);
  const doneItems = SECTIONS.reduce(
    (s, sec) => s + sec.items.filter((it) => checked.has(it.id)).length,
    0
  );
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-4">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <a
            href="/manager"
            className="text-cream-500 hover:text-hapas-400 transition text-sm"
          >
            ← Manager
          </a>
        </div>
        <h1 className="text-xl font-display font-bold text-cream-200">
          🚀 Pilot-checklist
        </h1>
        <p className="text-sm text-cream-500 mt-1">
          Doorloop alle stappen om Klantin Table live te zetten voor je
          restaurant.
        </p>
      </header>

      {/* Progress bar */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-cream-200">
            Voortgang: {doneItems}/{totalItems}
          </p>
          <p className="text-sm font-bold text-hapas-400">{pct}%</p>
        </div>
        <div className="h-3 rounded-full bg-dark-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-hapas-500 to-hapas-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && (
          <p className="mt-3 text-center text-sm font-bold text-emerald-400">
            ✅ Alles afgevinkt — klaar voor launch!
          </p>
        )}
      </Card>

      {/* Sections */}
      <div className="mt-4 flex flex-col gap-4">
        {SECTIONS.map((sec) => {
          const secDone = sec.items.filter((it) => checked.has(it.id)).length;
          const secTotal = sec.items.length;
          return (
            <Card key={sec.title}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-cream-200">
                  {sec.emoji} {sec.title}
                </h2>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    secDone === secTotal
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-dark-700 text-cream-500"
                  }`}
                >
                  {secDone}/{secTotal}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {sec.items.map((item) => {
                  const done = checked.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl p-3 transition cursor-pointer ${
                        done
                          ? "bg-emerald-500/5 border border-emerald-500/15"
                          : "bg-dark-700/50 border border-dark-600/30 hover:border-hapas-500/20"
                      }`}
                      onClick={() => toggle(item.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                            done
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-cream-500/30"
                          }`}
                        >
                          {done && (
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-semibold transition ${
                              done
                                ? "text-emerald-400 line-through"
                                : "text-cream-200"
                            }`}
                          >
                            {item.label}
                          </p>
                          <p className="mt-0.5 text-xs text-cream-500">
                            {item.description}
                          </p>
                          {item.link && (
                            <a
                              href={item.link}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 inline-block text-xs font-bold text-hapas-400 hover:text-hapas-300 transition"
                            >
                              {item.linkLabel} →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </main>
  );
}

export default function PilotPage() {
  return (
    <PinGate role="managerdashboard">
      <PilotChecklist />
    </PinGate>
  );
}
