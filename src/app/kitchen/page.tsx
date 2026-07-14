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
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-500">
        <span>{emoji}</span> {title}
        <span className="ml-auto rounded-full bg-stone-200 px-2 text-xs font-black text-stone-700">
          {orders.length}
        </span>
      </h2>
      <div className="flex flex-col gap-3 overflow-y-auto pb-8">
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

  const nieuw = list.filter((o) => o.status === "nieuw");
  const bezig = list.filter((o) => o.status === "in_bereiding");
  const gereed = list.filter((o) => o.status === "gereed");

  return (
    <main className="min-h-screen bg-stone-100 p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-black">
          👨‍🍳 Keuken — {nieuw.length + bezig.length} in de rij
        </h1>
        <button
          onClick={() => setMuted((m) => !m)}
          className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-sm"
        >
          {muted ? "🔇 Geluid uit" : "🔔 Geluid aan"}
        </button>
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
