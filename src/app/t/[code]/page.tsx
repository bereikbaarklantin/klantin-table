"use client";

// ---------------------------------------------------------------------------
// Gast-app: /t/HAPAS-NW-T12  (QR-code per tafel verwijst hierheen)
// Premium Hapas ervaring: splash → welkom → type → personen → menu → status
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import CartView from "@/components/guest/CartView";
import MenuBrowser, { Cart } from "@/components/guest/MenuBrowser";
import ReviewFlow from "@/components/guest/ReviewFlow";
import SessionStatus from "@/components/guest/SessionStatus";
import { useLive, useNow } from "@/components/hooks";
import { Button, Card } from "@/components/ui";

import { ToastProvider, useToast, BottomSheet, NumberPicker, Spinner } from "@/components/premium-ui";
import { euro, orderTotalCents } from "@/lib/format";

import { foodLockRemainingMs, parseTableCode } from "@/lib/rules";
import { store } from "@/lib/store";
import {
  OrderItem,
  RequestKind,
  VisitType,
  VISIT_TYPE_META,
} from "@/lib/types";

type WelcomeStep = { step: "splash" } | { step: "type" } | { step: "party"; visitType: VisitType };

function GuestPageInner({ params }: { params: { code: string } }) {
  const rawCode = decodeURIComponent(params.code);
  const parsed = useMemo(() => parseTableCode(rawCode), [rawCode]);
  const lsKey = parsed ? `hapas:guest:${parsed.full}` : "";
  const { addToast } = useToast();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [welcome, setWelcome] = useState<WelcomeStep>({ step: "splash" });
  const [party, setParty] = useState(2);
  const [cart, setCart] = useState<Cart>({});
  const [showCart, setShowCart] = useState(false);
  const [view, setView] = useState<"menu" | "status">("menu");
  const [upgrading, setUpgrading] = useState(false);
  const now = useNow();

  // --- Splash timer → welkom ------------------------------------------------
  useEffect(() => {
    if (welcome.step === "splash") {
      const t = setTimeout(() => setWelcome({ step: "type" }), 1800);
      return () => clearTimeout(t);
    }
  }, [welcome.step]);

  // --- Bootstrap: bestaande sessie op dit toestel of deze tafel vinden ------
  useEffect(() => {
    if (!parsed) { setBootstrapped(true); return; }
    (async () => {
      try {
        const storedId = typeof window !== "undefined" ? localStorage.getItem(lsKey) : null;
        if (storedId) {
          const s = await store.getSession(storedId);
          if (s && !(s.status === "closed" && s.reviewDone)) {
            setSessionId(s.id);
            setWelcome({ step: "type" }); // skip splash for returning guests
            return;
          }
          localStorage.removeItem(lsKey);
        }
        const active = await store.getActiveSessionByTable(parsed.full);
        if (active) {
          setSessionId(active.id);
          setWelcome({ step: "type" });
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

  // --- Live data -----------------------------------------------------------
  const { data: settings } = useLive(() => store.getSettings(), []);
  const { data: menu } = useLive(() => store.getMenu(), []);
  const { data: session, refresh: refreshSession } = useLive(
    () => (sessionId ? store.getSession(sessionId) : Promise.resolve(null)),
    [sessionId]
  );
  const { data: orders } = useLive(
    () => sessionId ? store.listOrders({ sessionId }) : Promise.resolve([]),
    [sessionId]
  );

  // ── Ongeldige QR ──────────────────────────────────────────────────────────
  if (!parsed) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6 text-center">
        <div className="text-5xl opacity-60">🤔</div>
        <h1 className="mt-4 font-display text-2xl text-cream-200">QR-code niet herkend</h1>
        <p className="mt-2 text-cream-500">
          Scan de QR-code op uw tafel opnieuw, of vraag de bediening om hulp.
        </p>
      </main>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!bootstrapped || !settings || !menu) {
    return (
      <main className="mx-auto min-h-dvh max-w-md p-4">
        <div className="flex flex-col items-center gap-4 pt-12 animate-fade-in">
          <div className="h-16 w-16 rounded-2xl bg-dark-800 border border-hapas-500/20 flex items-center justify-center">
            <Spinner size={24} className="text-hapas-500" />
          </div>
          <div className="skeleton-shimmer h-6 w-48 rounded-lg bg-dark-700" />
          <div className="skeleton-shimmer h-3 w-32 rounded bg-dark-700" />
        </div>
        <div className="mt-10 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-dark-600/30 bg-dark-800 p-4">
              <div className="flex gap-3">
                <div className="skeleton-shimmer h-16 w-16 rounded-xl bg-dark-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton-shimmer h-4 w-3/4 rounded bg-dark-700" />
                  <div className="skeleton-shimmer h-3 w-1/2 rounded bg-dark-700" />
                  <div className="skeleton-shimmer h-4 w-16 rounded bg-dark-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // ── Splash screen ─────────────────────────────────────────────────────────
  if (welcome.step === "splash" && !session) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6 animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          {/* Logo placeholder — wordt vervangen door het echte Hapas logo */}
          <div className="h-20 w-20 rounded-2xl bg-dark-800 border border-hapas-500/30 flex items-center justify-center shadow-gold-glow">
            <span className="text-4xl">🥘</span>
          </div>
          <h1 className="font-display text-display-lg text-cream-200 text-center">
            {settings.restaurantName}
          </h1>
          <div className="divider-gold w-32" />
          <p className="text-cream-500 text-sm">Tafel {parsed.tableNumber}</p>
        </div>
      </main>
    );
  }

  // ── Review na sluiten tafel ────────────────────────────────────────────────
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
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6 text-center">
        <div className="animate-fade-in-up">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="font-display text-display-md text-cream-200">Tot de volgende keer!</h1>
          <p className="mt-3 text-cream-500">
            Deze tafel is afgesloten. Wilt u opnieuw bestellen?
          </p>
          <div className="mt-6">
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
        </div>
      </main>
    );
  }

  // ── Welkomflow: type + personen ────────────────────────────────────────────
  if (!session) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col p-6">
        <header className="mt-8 text-center animate-fade-in">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-dark-800 border border-hapas-500/20 flex items-center justify-center shadow-gold-sm">
            <span className="text-3xl">🥘</span>
          </div>
          <h1 className="mt-4 font-display text-display-md text-cream-200">
            {settings.restaurantName}
          </h1>
          <div className="divider-gold w-24 mx-auto mt-2" />
          <p className="mt-2 text-sm text-hapas-500 font-medium">
            Tafel {parsed.tableNumber}
          </p>
        </header>

        {welcome.step === "type" && (
          <div className="mt-8 flex flex-col gap-3 stagger-children">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-hapas-500 mb-2">
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
                  className="rounded-2xl border border-dark-600/50 bg-dark-800 p-5 text-left shadow-card transition-all hover:border-hapas-500/40 hover:shadow-card-hover active:scale-[0.99]"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{meta.emoji}</span>
                    <div>
                      <p className="font-semibold text-cream-200">{meta.label}</p>
                      <p className="text-sm text-cream-500">{meta.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            <p className="mt-4 text-center text-xs text-cream-500/60">
              Liever persoonlijk bestellen? Dat kan altijd — onze collega&apos;s
              helpen u graag.
            </p>
          </div>
        )}

        {welcome.step === "party" && (
          <div className="mt-8 animate-fade-in">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-hapas-500 mb-6">
              Met hoeveel personen bent u?
            </p>
            <div className="flex justify-center">
              <NumberPicker value={party} onChange={setParty} min={1} max={12} />
            </div>
            <Card className="mt-6 bg-hapas-500/5 border-hapas-500/20">
              <p className="text-sm text-cream-400">
                🥘 <strong className="text-cream-200">Zo werkt het tapas-diner:</strong> in de eerste ronde
                kiest u minimaal {settings.minDishesPerPersonRound1} gerechten
                per persoon. Daarna bestelt u elke{" "}
                {settings.roundIntervalMin} minuten een nieuwe ronde — zo komt
                alles vers en warm uit de keuken. Drankjes kunnen altijd.
              </p>
            </Card>
            <div className="mt-6 flex gap-3">
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

  // ── Actieve sessie: menu + status ──────────────────────────────────────────
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
    setView("status");
    addToast("Bestelling ontvangen! De keuken gaat voor u aan de slag.", "success");
    refreshSession();
    return null;
  }

  return (
    <main className="mx-auto max-w-md p-4 pb-28 min-h-dvh">
      {/* Header */}
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-bold text-cream-200">
            {settings.restaurantName}
          </h1>
          <p className="text-xs text-cream-500">
            Tafel {session.tableNumber}
          </p>
        </div>
        <div className="flex rounded-full bg-dark-800 p-1 border border-dark-600/50">
          <button
            onClick={() => setView("menu")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
              view === "menu"
                ? "bg-hapas-500 text-dark-900 shadow-gold-sm"
                : "text-cream-500 hover:text-cream-200"
            }`}
          >
            Menu
          </button>
          <button
            onClick={() => setView("status")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
              view === "status"
                ? "bg-hapas-500 text-dark-900 shadow-gold-sm"
                : "text-cream-500 hover:text-cream-200"
            }`}
          >
            Tafel
          </button>
        </div>
      </header>

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

      {/* Upgrade-dialoog → BottomSheet */}
      <BottomSheet
        open={upgrading}
        onClose={() => setUpgrading(false)}
        title="Upgraden naar volledig diner"
      >
        <p className="text-sm text-cream-500 mb-4">Met hoeveel personen dineert u?</p>
        <div className="flex justify-center mb-4">
          <NumberPicker value={party} onChange={setParty} min={1} max={12} />
        </div>
        <div className="flex gap-3">
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
                addToast("Diner gestart!", "success");
              }}
            >
              Start diner
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Zwevende mandje-balk */}
      {cartCount > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md items-center justify-between rounded-2xl bg-hapas-500 px-5 py-4 text-dark-900 shadow-gold-md active:scale-[0.99] transition-all gold-pulse"
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

// Wrap with ToastProvider
export default function GuestPage({ params }: { params: { code: string } }) {
  return (
    <ToastProvider>
      <GuestPageInner params={params} />
    </ToastProvider>
  );
}
