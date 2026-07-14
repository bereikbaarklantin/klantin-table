"use client";

// ---------------------------------------------------------------------------
// Keuken-dashboard (KDS) — scherm 8. Uitsluitend gerechten.
// Kolommen: Nieuw -> In bereiding -> Gereed (wacht op uitserveren).
// Nieuwe tickets: geluidssignaal. Prioriteit kleurt mee met wachttijd.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useBeep, useLive, useNewItemSignal } from "@/components/hooks";
import OrderTicket from "@/components/staff/OrderTicket";
import PinGate from "@/components/PinGate";
import { EmptyState } from "@/components/ui";
import { Skeleton, ConnectionDot } from "@/components/premium-ui";
import { store } from "@/lib/store";
import { Order } from "@/lib/types";

function Column({
  title,
  emoji,
  orders,
  actionLabel,
  nextStatus,
  onChanged,
  empty,
}: {
  title: string;
  emoji: string;
  orders: Order[];
  actionLabel?: string;
  nextStatus?: Order["status"];
  onChanged: () => void;
  empty: string;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-hapas-500">
        <span>{emoji}</span> {title}
        <span className="ml-auto rounded-full bg-dark-700 border border-dark-600/50 px-2.5 py-0.5 text-xs font-black text-cream-300">
          {orders.length}
        </span>
      </h2>
      <div className="flex flex-col gap-3 overflow-y-auto pb-8 thin-scrollbar">
        {orders.length === 0 ? (
          <EmptyState emoji="✨" text={empty} />
        ) : (
          orders.map((o) => (
            <OrderTicket
              key={o.id}
              order={o}
              actionLabel={actionLabel}
              onAction={
                nextStatus
                  ? async () => {
                      await store.setOrderStatus(o.id, nextStatus);
                      onChanged();
                    }
                  : undefined
              }
            />
          ))
        )}
      </div>
    </section>
  );
}


function KitchenSkeleton() {
  return (
    <main className="min-h-screen p-4">
      <header className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </header>
      <div className="flex gap-4">
        {[0, 1, 2].map((col) => (
          <section key={col} className="flex min-w-0 flex-1 flex-col">
            <div className="mb-3 flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-6 w-8 rounded-full" />
            </div>
            <div className="flex flex-col gap-3">
              {Array.from({ length: col === 0 ? 3 : col === 1 ? 2 : 1 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-dark-600/30 bg-dark-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  {[0, 1].map((j) => (
                    <div key={j} className="flex items-center justify-between py-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                  ))}
                  <Skeleton className="mt-3 h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function KitchenBoard() {
  const [muted, setMuted] = useState(false);
  const beep = useBeep();
  const { data: orders, refresh } = useLive(
    () => store.listOrders({ station: "kitchen", activeOnly: true }),
    [],
    5000
  );

  const list = orders ?? [];
  useNewItemSignal(
    list.filter((o) => o.status === "nieuw").map((o) => o.id),
    () => {
      if (!muted) beep();
    }
  );

  if (!orders) return <KitchenSkeleton />;

  const nieuw = list.filter((o) => o.status === "nieuw");
  const bezig = list.filter((o) => o.status === "in_bereiding");
  const gereed = list.filter((o) => o.status === "gereed");

  return (
    <main className="min-h-screen p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-display font-bold text-cream-200">
          👨‍🍳 Keuken{" "}
          <span className="text-hapas-400">
            — {nieuw.length + bezig.length} in de rij
          </span>
        </h1>
        <div className="flex items-center gap-3">
          <ConnectionDot />
          <button
            onClick={() => setMuted((m) => !m)}
            className="rounded-full bg-dark-800 border border-dark-600/50 px-3 py-1.5 text-sm font-semibold text-cream-400 hover:text-cream-200 transition"
          >
            {muted ? "🔇 Geluid uit" : "🔔 Geluid aan"}
          </button>
        </div>
      </header>
      <div className="flex gap-4">
        <Column
          title="Nieuw"
          emoji="🆕"
          orders={nieuw}
          actionLabel="Accepteren / start bereiding"
          nextStatus="in_bereiding"
          onChanged={refresh}
          empty="Geen nieuwe bestellingen."
        />
        <Column
          title="In bereiding"
          emoji="🔥"
          orders={bezig}
          actionLabel="Gereed → melding naar bediening"
          nextStatus="gereed"
          onChanged={refresh}
          empty="Niets in bereiding."
        />
        <Column
          title="Gereed — wacht op uitserveren"
          emoji="🛎️"
          orders={gereed}
          onChanged={refresh}
          empty="Alles is uitgeserveerd."
        />
      </div>
    </main>
  );
}

export default function KitchenPage() {
  return (
    <PinGate role="keukenscherm">
      <KitchenBoard />
    </PinGate>
  );
}
