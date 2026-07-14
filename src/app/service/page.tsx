"use client";

// ---------------------------------------------------------------------------
// Bedieningsdashboard — scherm 9.
// 1. Drankbestellingen (bar)          -> uitserveren
// 2. Gerechten gereed (van de keuken) -> uitserveren
// 3. Tafelverzoeken (afrekenen, servetten, bestek, vraag)
// 4. Actieve tafels (sessieoverzicht, tafel sluiten na betaling)
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useBeep, useLive, useNewItemSignal, useNow } from "@/components/hooks";
import OrderTicket from "@/components/staff/OrderTicket";
import PinGate from "@/components/PinGate";
import { Badge, Button, Card, EmptyState, SectionTitle } from "@/components/ui";
import { euro, minutesSince, orderTotalCents, timeHM } from "@/lib/format";
import { store } from "@/lib/store";
import { RequestKind, Session, VISIT_TYPE_META } from "@/lib/types";

const REQUEST_META: Record<RequestKind, { label: string; emoji: string }> = {
  afrekenen: { label: "Wil afrekenen", emoji: "🧾" },
  servetten: { label: "Extra servetten", emoji: "🧻" },
  bestek: { label: "Extra bestek", emoji: "🍴" },
  vraag: { label: "Vraag van tafel", emoji: "💬" },
};

function TableCard({
  session,
  onClosed,
}: {
  session: Session;
  onClosed: () => void;
}) {
  const now = useNow(15000);
  const { data: orders } = useLive(
    () => store.listOrders({ sessionId: session.id }),
    [session.id],
    15000
  );
  const total = orderTotalCents((orders ?? []).flatMap((o) => o.items));
  const meta = VISIT_TYPE_META[session.visitType];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="font-black">Tafel {session.tableNumber}</p>
        <Badge tone={session.status === "awaiting_payment" ? "amber" : "hapas"}>
          {session.status === "awaiting_payment" ? "wil afrekenen" : meta.label}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        {session.partySize > 0 ? `${session.partySize} pers. · ` : ""}
        {minutesSince(session.openedAt, now)} min aan tafel
        {session.visitType === "diner" ? ` · ronde ${session.roundCount}` : ""}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <p className="font-bold">{euro(total)}</p>
        <Button
          size="sm"
          variant={session.status === "awaiting_payment" ? "success" : "secondary"}
          onClick={async () => {
            const ok = confirm(
              `Tafel ${session.tableNumber} sluiten? (rekening ${euro(total)} is voldaan)`
            );
            if (ok) {
              await store.closeSession(session.id);
              onClosed();
            }
          }}
        >
          Afgerekend · sluit tafel
        </Button>
      </div>
    </Card>
  );
}

function ServiceBoard() {
  const [muted, setMuted] = useState(false);
  const beep = useBeep();

  const { data: barOrders, refresh: refreshBar } = useLive(
    () => store.listOrders({ station: "bar", activeOnly: true }),
    [],
    5000
  );
  const { data: kitchenReady, refresh: refreshKitchen } = useLive(
    async () => {
      const all = await store.listOrders({ station: "kitchen", activeOnly: true });
      return all.filter((o) => o.status === "gereed");
    },
    [],
    5000
  );
  const { data: requests, refresh: refreshReq } = useLive(
    () => store.listServiceRequests(true),
    [],
    5000
  );
  const { data: sessions, refresh: refreshSessions } = useLive(
    () => store.listActiveSessions(),
    [],
    8000
  );

  const bar = barOrders ?? [];
  const ready = kitchenReady ?? [];
  const reqs = requests ?? [];

  useNewItemSignal(
    [
      ...bar.filter((o) => o.status === "nieuw").map((o) => `bar:${o.id}`),
      ...ready.map((o) => `ready:${o.id}`),
      ...reqs.map((r) => `req:${r.id}`),
    ],
    () => {
      if (!muted) beep();
    }
  );

  const refreshAll = () => {
    refreshBar();
    refreshKitchen();
    refreshReq();
    refreshSessions();
  };

  return (
    <main className="min-h-screen bg-stone-100 p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-black">🤵 Bediening</h1>
        <button
          onClick={() => setMuted((m) => !m)}
          className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-sm"
        >
          {muted ? "🔇 Geluid uit" : "🔔 Geluid aan"}
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom 1: dranken */}
        <div>
          <SectionTitle>🍹 Drankbestellingen ({bar.length})</SectionTitle>
          <div className="flex flex-col gap-3">
            {bar.length === 0 ? (
              <EmptyState emoji="🥂" text="Geen openstaande drankjes." />
            ) : (
              bar.map((o) => (
                <OrderTicket
                  key={o.id}
                  order={o}
                  actionLabel="Uitgeserveerd ✓"
                  onAction={async () => {
                    await store.setOrderStatus(o.id, "uitgeserveerd");
                    refreshAll();
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Kolom 2: gerechten gereed + verzoeken */}
        <div>
          <SectionTitle>🛎️ Gerechten klaar ({ready.length})</SectionTitle>
          <div className="flex flex-col gap-3">
            {ready.length === 0 ? (
              <EmptyState emoji="👨‍🍳" text="Geen gerechten klaarstaan." />
            ) : (
              ready.map((o) => (
                <OrderTicket
                  key={o.id}
                  order={o}
                  showPriority={false}
                  actionLabel="Uitgeserveerd ✓"
                  onAction={async () => {
                    await store.setOrderStatus(o.id, "uitgeserveerd");
                    refreshAll();
                  }}
                />
              ))
            )}
          </div>

          <SectionTitle>📣 Tafelverzoeken ({reqs.length})</SectionTitle>
          <div className="flex flex-col gap-2">
            {reqs.length === 0 ? (
              <EmptyState emoji="😌" text="Geen openstaande verzoeken." />
            ) : (
              reqs.map((r) => {
                const meta = REQUEST_META[r.kind];
                return (
                  <Card key={r.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">
                        {meta.emoji} Tafel {r.tableNumber} — {meta.label}
                      </p>
                      {r.note && (
                        <p className="text-sm text-stone-600">“{r.note}”</p>
                      )}
                      <p className="text-xs text-stone-400">
                        {timeHM(r.createdAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={async () => {
                        await store.resolveServiceRequest(r.id);
                        refreshAll();
                      }}
                    >
                      Afgehandeld ✓
                    </Button>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom 3: actieve tafels */}
        <div>
          <SectionTitle>🪑 Actieve tafels ({(sessions ?? []).length})</SectionTitle>
          <div className="flex flex-col gap-2">
            {(sessions ?? []).length === 0 ? (
              <EmptyState emoji="🌅" text="Nog geen actieve tafels." />
            ) : (
              (sessions ?? []).map((s) => (
                <TableCard key={s.id} session={s} onClosed={refreshAll} />
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ServicePage() {
  return (
    <PinGate role="bedieningsscherm">
      <ServiceBoard />
    </PinGate>
  );
}
