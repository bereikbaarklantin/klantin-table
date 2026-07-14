"use client";

// ---------------------------------------------------------------------------
// Gast-app: /t/HAPAS-NW-T12  (QR-code per tafel verwijst hierheen)
// Schermen: welkom -> bezoektype -> personen -> menu/mandje -> status/timer
// -> rekening -> review. Meerdere telefoons op dezelfde tafel delen de sessie.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import CartView from "@/components/guest/CartView";
import MenuBrowser, { Cart } from "@/components/guest/MenuBrowser";
import ReviewFlow from "@/components/guest/ReviewFlow";
import SessionStatus from "@/components/guest/SessionStatus";
import { useLive, useNow } from "@/components/hooks";
import { Button, Card } from "@/components/ui";
import { euro, orderTotalCents } from "@/lib/format";
import { foodLockRemainingMs, parseTableCode } from "@/lib/rules";
import { store } from "@/lib/store";
import {
  OrderItem,
  RequestKind,
  VisitType,
  VISIT_TYPE_META,
} from "@/lib/types";

type WelcomeStep = { step: "type" } | { step: "party"; visitType: VisitType };

export default function GuestPage({ params }: { params: { code: string } }) {
  const rawCode = decodeURIComponent(params.code);
  const parsed = useMemo(() => parseTableCode(rawCode), [rawCode]);
  const lsKey = parsed ? `hapas:guest:${parsed.full}` : "";

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [welcome, setWelcome] = useState<WelcomeStep>({ step: "type" });
  const [party, setParty] = useState(2);
  const [cart, setCart] = useState<Cart>({});
  const [showCart, setShowCart] = useState(false);
  const [view, setView] = useState<"menu" | "status">("menu");
  const [justSent, setJustSent] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const now = useNow();

  // --- Bootstrap: bestaande sessie op dit toestel of deze tafel vinden ------
  useEffect(() => {
    if (!parsed) {
      setBootstrapped(true);
      return;
    }
    (async () => {
      try {
        const storedId =
          typeof window !== "undefined" ? localStorage.getItem(lsKey) : null;
        if (storedId) {
          const s = await store.getSession(storedId);
          if (s && !(s.status === "closed" && s.reviewDone)) {
            setSessionId(s.id);
            return;
          }
          localStorage.removeItem(lsKey);
        }
        const active = await store.getActiveSessionByTable(parsed.full);
        if (active) {
          setSessionId(active.id);
          localStorage.setItem(lsKey, active.id);
        }
      } catch (err) {
        console.error("[bootstrap] Error loading session:", err);
      } finally {
        setBootstrapped(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed?.full]);

  // --- Live data -------------------------------------------------------------
  const { data: settings } = useLive(() => store.getSettings(), []);
  const { data: menu } = useLive(() => store.getMenu(), []);
  const { data: session, refresh: refreshSession } = useLive(
    () => (sessionId ? store.getSession(sessionId) : Promise.resolve(null)),
    [sessionId]
  );
  const { data: orders } = useLive(
    () =>
      sessionId
        ? store.listOrders({ sessionId })
        : Promise.resolve([]),
    [sessionId]
  );

  // --- Ongeldige QR ----------------------------------------------------------
  if (!parsed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6 text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="mt-3 text-xl font-bold">QR-code niet herkend</h1>
        <p className="mt-2 text-stone-600">
          Scan de QR-code op uw tafel opnieuw, of vraag de bediening om hulp.
        </p>
      </main>
    );
  }

  if (!bootstrapped || !settings || !menu) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-stone-400">Laden…</p>
      </main>
    );
  }

  // --- Review na sluiten tafel -------------------------------------------------
  if (session && session.status === "closed" && !session.reviewDone) {
    return (
      <ReviewFlow
        session={session}
        settings={settings}
        onSubmit={async (args) => {
          await store.submitReview({ sessionId: session.id, ...args });
          refreshSession();
        }}
      />
    );
  }

  if (session && session.status === "closed" && session.reviewDone) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6 text-center">
        <div className="text-5xl">👋</div>
        <h1 className="mt-3 text-2xl font-bold">Tot de volgende keer!</h1>
        <p className="mt-2 text-stone-600">
          Deze tafel is afgesloten. Nieuw bezoek gestart?
        </p>
        <div className="mt-4">
          <Button
            onClick={() => {
              localStorage.removeItem(lsKey);
              setSessionId(null);
              setWelcome({ step: "type" });
              setCart({});
            }}
          >
            Nieuwe bestelling starten
          </Button>
        </div>
      </main>
    );
  }

  // --- Welkomflow (scherm 1-3): type + personen --------------------------------
  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">
        <header className="mt-6 text-center">
          <div className="text-5xl">🥘</div>
          <h1 className="mt-2 text-2xl font-black text-hapas-800">
            {settings.restaurantName}
          </h1>
          <p className="mt-1 font-semibold text-stone-500">
            Tafel {parsed.tableNumber}
          </p>
        </header>

        {welcome.step === "type" && (
          <div className="mt-8 flex flex-col gap-3">
            <p className="text-center text-sm font-semibold uppercase tracking-wide text-stone-400">
              Waar komt u voor?
            </p>
            {(Object.keys(VISIT_TYPE_META) as VisitType[]).map((t) => {
              const meta = VISIT_TYPE_META[t];
              return (
                <button
                  key={t}
                  onClick={() => {
                    if (t === "diner") setWelcome({ step: "party", visitType: t });
                    else {
                      void (async () => {
                        const s = await store.openSession({
                          tableCode: parsed.full,
                          visitType: t,
                          partySize: 0,
                        });
                        localStorage.setItem(lsKey, s.id);
                        setSessionId(s.id);
                      })();
                    }
                  }}
                  className="rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-hapas-400 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{meta.emoji}</span>
                    <div>
                      <p className="font-bold">{meta.label}</p>
                      <p className="text-sm text-stone-500">{meta.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            <p className="mt-2 text-center text-xs text-stone-400">
              Liever persoonlijk bestellen? Dat kan altijd — onze collega&apos;s
              helpen u graag.
            </p>
          </div>
        )}

        {welcome.step === "party" && (
          <div className="mt-8">
            <p className="text-center text-sm font-semibold uppercase tracking-wide text-stone-400">
              Met hoeveel personen bent u?
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                <button
                  key={n}
                  onClick={() => setParty(n)}
                  className={`rounded-xl py-3 text-lg font-bold transition ${
                    party === n
                      ? "bg-hapas-600 text-white shadow"
                      : "bg-white border border-stone-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <Card className="mt-4 bg-hapas-100/60">
              <p className="text-sm text-hapas-900">
                🥘 <strong>Zo werkt het tapas-diner:</strong> in de eerste ronde
                kiest u minimaal {settings.minDishesPerPersonRound1} gerechten
                per persoon. Daarna bestelt u elke{" "}
                {settings.roundIntervalMin} minuten een nieuwe ronde — zo komt
                alles vers en warm uit de keuken. Drankjes kunnen altijd.
              </p>
            </Card>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setWelcome({ step: "type" })}
              >
                ← Terug
              </Button>
              <div className="flex-1">
                <Button
                  full
                  size="lg"
                  onClick={() => {
                    void (async () => {
                      const s = await store.openSession({
                        tableCode: parsed.full,
                        visitType: "diner",
                        partySize: party,
                      });
                      localStorage.setItem(lsKey, s.id);
                      setSessionId(s.id);
                    })();
                  }}
                >
                  Start diner met {party} pers.
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // --- Actieve sessie: menu + status --------------------------------------------
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartItems: OrderItem[] = Object.entries(cart)
    .map(([productId, qty]) => {
      const p = menu.products.find((x) => x.id === productId);
      return p ? { productId, qty, name: p.name, priceCents: p.priceCents } : null;
    })
    .filter((x): x is OrderItem => x !== null);
  const locked = foodLockRemainingMs(session, settings, now) > 0;

  async function handleSubmit(items: OrderItem[], note: string) {
    const res = await store.submitOrder({
      sessionId: session!.id,
      items,
      note: note || undefined,
    });
    if (!res.ok) return res.errors ?? ["Er ging iets mis."];
    setCart({});
    setShowCart(false);
    setJustSent(true);
    setView("status");
    setTimeout(() => setJustSent(false), 3000);
    refreshSession();
    return null;
  }

  return (
    <main className="mx-auto max-w-md p-4 pb-28">
      {/* Kop */}
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-hapas-800">
            {settings.restaurantName}
          </h1>
          <p className="text-sm text-stone-500">
            Tafel {session.tableNumber} · U bestelt voor deze tafel
          </p>
        </div>
        <div className="flex rounded-full bg-white p-1 shadow-sm">
          <button
            onClick={() => setView("menu")}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              view === "menu" ? "bg-hapas-600 text-white" : "text-stone-600"
            }`}
          >
            Menu
          </button>
          <button
            onClick={() => setView("status")}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              view === "status" ? "bg-hapas-600 text-white" : "text-stone-600"
            }`}
          >
            Tafel
          </button>
        </div>
      </header>

      {justSent && (
        <div className="mb-3 rounded-2xl bg-emerald-50 p-4 text-center">
          <p className="text-lg font-bold text-emerald-700">
            ✅ Bestelling ontvangen!
          </p>
          <p className="text-sm text-emerald-800">
            De keuken en bar gaan voor u aan de slag.
          </p>
        </div>
      )}

      {view === "menu" ? (
        <MenuBrowser
          categories={menu.categories}
          products={menu.products}
          cart={cart}
          setCart={setCart}
          drinksOnlyLocked={locked}
        />
      ) : (
        <SessionStatus
          session={session}
          settings={settings}
          orders={orders ?? []}
          onRequest={(kind: RequestKind, note?: string) =>
            store.createServiceRequest(session.id, kind, note)
          }
          onRequestBill={async () => {
            await store.requestBill(session.id);
            refreshSession();
          }}
          onGoMenu={() => setView("menu")}
          onUpgrade={() => setUpgrading(true)}
          onChangeParty={async (n) => {
            await store.setPartySize(session.id, n);
            refreshSession();
          }}
        />
      )}

      {/* Upgrade-dialoog borrel/drankjes -> diner */}
      {upgrading && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <h2 className="font-bold">Upgraden naar volledig diner</h2>
            <p className="mt-1 text-sm text-stone-500">
              Met hoeveel personen dineert u?
            </p>
            <div className="mt-3 grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setParty(n)}
                  className={`rounded-xl py-2 font-bold ${
                    party === n
                      ? "bg-hapas-600 text-white"
                      : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" onClick={() => setUpgrading(false)}>
                Annuleren
              </Button>
              <div className="flex-1">
                <Button
                  full
                  onClick={async () => {
                    await store.setVisitType(session.id, "diner", party);
                    setUpgrading(false);
                    refreshSession();
                  }}
                >
                  Start diner
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Zwevende mandje-balk */}
      {cartCount > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md items-center justify-between rounded-2xl bg-hapas-600 px-5 py-4 text-white shadow-xl active:scale-[0.99]"
        >
          <span className="font-bold">
            🛒 {cartCount} {cartCount === 1 ? "item" : "items"}
          </span>
          <span className="font-bold">
            Bekijk bestelling · {euro(orderTotalCents(cartItems))}
          </span>
        </button>
      )}

      {showCart && (
        <CartView
          session={session}
          settings={settings}
          categories={menu.categories}
          products={menu.products}
          cart={cart}
          setCart={setCart}
          onClose={() => setShowCart(false)}
          onSubmitted={handleSubmit}
        />
      )}
    </main>
  );
}
