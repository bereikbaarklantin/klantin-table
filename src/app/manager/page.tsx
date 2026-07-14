"use client";

// ---------------------------------------------------------------------------
// Manager-dashboard — scherm 10.
// KPI's, populaire gerechten, interne feedback, instellingen (o.a. het
// bestelinterval 5–20 min) en menubeschikbaarheid (86-lijst).
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useLive } from "@/components/hooks";
import PinGate from "@/components/PinGate";
import { Badge, Button, Card, EmptyState, SectionTitle } from "@/components/ui";
import { ToastProvider, useToast, Skeleton, ConnectionDot } from "@/components/premium-ui";
import { euro, timeHM } from "@/lib/format";
import { store } from "@/lib/store";
import { Settings } from "@/lib/types";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-widest text-hapas-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums text-cream-200">{value}</p>
      {sub && <p className="text-xs text-cream-500">{sub}</p>}
    </Card>
  );
}

function SettingsForm() {
  const { data: settings, refresh } = useLive(() => store.getSettings(), []);
  const [draft, setDraft] = useState<Settings | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (settings && !draft) setDraft(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  if (!draft) return null;

  async function save() {
    if (!draft) return;
    await store.updateSettings(draft);
    refresh();
    addToast("Instellingen opgeslagen!", "success");
  }

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-bold text-cream-200">
            ⏱️ Bestelinterval tussen rondes: {draft.roundIntervalMin} minuten
          </label>
          <input
            type="range"
            min={5}
            max={20}
            step={1}
            value={draft.roundIntervalMin}
            onChange={(e) =>
              setDraft({ ...draft, roundIntervalMin: parseInt(e.target.value, 10) })
            }
            className="mt-2 w-full accent-hapas-500"
          />
          <div className="flex justify-between text-xs text-cream-500">
            <span>5 min</span>
            <span>20 min</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-cream-200">
            🥘 Minimum gerechten p.p. (eerste dinerronde)
          </label>
          <div className="mt-1 flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setDraft({ ...draft, minDishesPerPersonRound1: n })}
                className={`rounded-xl px-4 py-2 font-bold transition ${
                  draft.minDishesPerPersonRound1 === n
                    ? "bg-hapas-500 text-dark-900 shadow-gold-sm"
                    : "bg-dark-700 text-cream-400 border border-dark-600/50 hover:border-hapas-500/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-cream-200">⭐ Reviewfunnel</label>
          <div className="mt-1 flex gap-2">
            <button
              onClick={() => setDraft({ ...draft, reviewMode: "compliant" })}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                draft.reviewMode === "compliant"
                  ? "bg-emerald-600/90 text-white shadow-sm"
                  : "bg-dark-700 text-cream-400 border border-dark-600/50"
              }`}
            >
              Compliant (aanbevolen)
            </button>
            <button
              onClick={() => setDraft({ ...draft, reviewMode: "strikt" })}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                draft.reviewMode === "strikt"
                  ? "bg-amber-500/90 text-white shadow-sm"
                  : "bg-dark-700 text-cream-400 border border-dark-600/50"
              }`}
            >
              Strikt (gating)
            </button>
          </div>
          <p className="mt-1 text-xs text-cream-500">
            Compliant: Google-optie bij elke score zichtbaar (conform
            Google-beleid en ACM). Strikt: 1–3 sterren ziet alleen het interne
            formulier — juridisch risico voor eigen rekening.
          </p>
        </div>

        <div>
          <label className="text-sm font-bold text-cream-200">🔗 Google-review-link</label>
          <input
            value={draft.googleReviewUrl}
            onChange={(e) =>
              setDraft({ ...draft, googleReviewUrl: e.target.value })
            }
            className="mt-1 w-full rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm text-cream-200 placeholder:text-cream-500/50 focus:border-hapas-500/50 focus:outline-none transition"
            placeholder="https://search.google.com/local/writereview?placeid=..."
          />
        </div>

        <div>
          <label className="text-sm font-bold text-cream-200">🔐 Pincode personeel</label>
          <input
            value={draft.staffPin}
            onChange={(e) =>
              setDraft({
                ...draft,
                staffPin: e.target.value.replace(/\D/g, "").slice(0, 6),
              })
            }
            className="mt-1 w-32 rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm tracking-widest text-cream-200 focus:border-hapas-500/50 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save}>Instellingen opslaan</Button>
        </div>
      </div>
    </Card>
  );
}

function AvailabilityManager() {
  const { data: menu, refresh } = useLive(() => store.getMenu(), []);
  if (!menu) return null;
  const cats = [...menu.categories].sort((a, b) => a.sort - b.sort);

  return (
    <Card>
      <div className="flex flex-col gap-4">
        {cats.map((c) => (
          <div key={c.id}>
            <p className="text-sm font-bold text-cream-500">
              {c.emoji} {c.name}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {menu.products
                .filter((p) => p.categoryId === c.id)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={async () => {
                      await store.setProductAvailability(p.id, !p.available);
                      refresh();
                    }}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      p.available
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25"
                        : "bg-red-500/15 text-red-400 border border-red-500/20 line-through hover:bg-red-500/25"
                    }`}
                    title={p.available ? "Tik om uit te verkopen" : "Tik om weer aan te zetten"}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-cream-500/60">
          Tik op een gerecht om het (tijdelijk) van de kaart te halen —
          doorgestreept = uitverkocht voor gasten.
        </p>
      </div>
    </Card>
  );
}


function ManagerSkeleton() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-dark-600/30 bg-dark-800 p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <div>
          <Skeleton className="h-5 w-44 mb-3" />
          <div className="rounded-2xl border border-dark-600/30 bg-dark-800 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between py-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
          <Skeleton className="h-5 w-40 mt-6 mb-3" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-dark-600/30 bg-dark-800 p-4">
                <Skeleton className="h-4 w-36 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="rounded-2xl border border-dark-600/30 bg-dark-800 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full mb-3 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function ManagerBoard() {
  const { data: stats } = useLive(() => store.getStats(), [], 10000);
  const { data: reviews } = useLive(() => store.listInternalReviews(), [], 15000);

  if (!stats) return <ManagerSkeleton />;

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-display font-bold text-cream-200">📊 Manager</h1>
        <div className="flex items-center gap-3">
          <ConnectionDot />
          <Badge tone="gold">{store.mode === "demo" ? "demo-modus" : "live"}</Badge>
        </div>
      </header>

      {/* KPI's */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Actieve tafels"
          value={String(stats?.activeTables ?? 0)}
          sub={
            stats && stats.activeTableNumbers.length > 0
              ? `nr. ${stats.activeTableNumbers.join(", ")}`
              : "—"
          }
        />
        <Stat
          label="Omzet vandaag"
          value={euro(stats?.revenueTodayCents ?? 0)}
          sub={`${stats?.ordersToday ?? 0} bestellingen`}
        />
        <Stat
          label="Gem. besteding"
          value={euro(stats?.avgSpendPerSessionCents ?? 0)}
          sub={`${stats?.avgOrdersPerSession ?? 0} bestellingen / tafel`}
        />
        <Stat
          label="Wachttijd keuken"
          value={
            stats?.avgKitchenMinutes != null
              ? `${stats.avgKitchenMinutes} min`
              : "—"
          }
          sub="gem. nieuw → gereed"
        />
        <Stat
          label="Tafelduur"
          value={
            stats?.avgTableMinutes != null ? `${stats.avgTableMinutes} min` : "—"
          }
          sub="gem. gesloten tafels"
        />
        <Stat
          label="Open keuken"
          value={String(stats?.openKitchenTickets ?? 0)}
        />
        <Stat label="Open drankjes" value={String(stats?.openBarTickets ?? 0)} />
        <Stat label="Open verzoeken" value={String(stats?.openRequests ?? 0)} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <SectionTitle>🏆 Populairste gerechten</SectionTitle>
          <Card>
            {stats && stats.popularProducts.length > 0 ? (
              <ol className="flex flex-col gap-1.5">
                {stats.popularProducts.map((p, i) => (
                  <li key={p.name} className="flex justify-between text-sm text-cream-300">
                    <span>
                      <span className="mr-2 font-black text-hapas-400">
                        {i + 1}.
                      </span>
                      {p.name}
                    </span>
                    <span className="font-bold tabular-nums text-cream-400">{p.qty}×</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-cream-500">Nog geen bestellingen vandaag.</p>
            )}
          </Card>

          <SectionTitle>📨 Interne feedback</SectionTitle>
          <div className="flex flex-col gap-2">
            {(reviews ?? []).length === 0 ? (
              <EmptyState emoji="🌟" text="Geen interne feedback ontvangen." />
            ) : (
              (reviews ?? []).map((r) => (
                <Card key={r.id}>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-cream-200">
                      {"⭐".repeat(r.stars)}
                      <span className="ml-2 text-sm font-semibold text-cream-500">
                        Tafel {r.tableNumber}
                      </span>
                    </p>
                    <span className="text-xs text-cream-500/60">
                      {timeHM(r.createdAt)}
                    </span>
                  </div>
                  {r.feedback && (
                    <p className="mt-1 text-sm text-cream-400">&quot;{r.feedback}&quot;</p>
                  )}
                  {r.contact && (
                    <p className="mt-1 text-xs font-semibold text-hapas-400">
                      Contact: {r.contact}
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        <div>
          <SectionTitle>⚙️ Instellingen</SectionTitle>
          <SettingsForm />

          <SectionTitle>🍽️ Menubeschikbaarheid</SectionTitle>
          <AvailabilityManager />
        </div>
      </div>
    </main>
  );
}

export default function ManagerPage() {
  return (
    <PinGate role="managerdashboard">
      <ToastProvider>
        <ManagerBoard />
      </ToastProvider>
    </PinGate>
  );
}
