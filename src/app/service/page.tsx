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
import { ConfirmModal, ToastProvider, useToast, Skeleton, ConnectionDot } from "@/components/premium-ui";
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
  const { addToast } = useToast();
  const [confirmClose, setConfirmClose] = useState(false);
  const { data: orders } = useLive(
    () => store.listOrders({ sessionId: session.id }),
    [session.id],
    15000
  );
  const total = orderTotalCents((orders ?? []).flatMap((o) => o.items));
  const meta = VISIT_TYPE_META[session.visitType];

  return (
    <>
      <Card>
        <div className="flex items-center justify-between">
          <p className="font-black text-cream-200">Tafel {session.tableNumber}</p>
          <Badge tone={session.status === "awaiting_payment" ? "amber" : "gold"}>
            {session.status === "awaiting_payment" ? "wil afrekenen" : meta.label}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-cream-500">
          {session.partySize > 0 ? `${session.partySize} pers. · ` : ""}
          {minutesSince(session.openedAt, now)} min aan tafel
          {session.visitType === "diner" ? ` · ronde ${session.roundCount}` : ""}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <p className="font-bold text-hapas-400 tabular-nums">{euro(total)}</p>
          <Button
            size="sm"
            variant={session.status === "awaiting_payment" ? "success" : "secondary"}
            onClick={() => setConfirmClose(true)}
          >
            Afgerekend · sluit tafel
          </Button>
        </div>
      </Card>

      <ConfirmModal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={async () => {
          await store.closeSession(session.id);
          setConfirmClose(false);
          addToast(`Tafel ${session.tableNumber} gesloten.`, "success");
          onClosed();
        }}
        title="Tafel sluiten"
        message={`Tafel ${session.tableNumber} sluiten? (rekening ${euro(total)} is voldaan)`}
        confirmLabel="Sluiten"
      />
    </>
  );
}


function ServiceSkeleton() {
  return (
    <main className="min-h-screen p-4">
      <header className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </header>
      <div className="grid gap-6 lg:grid-cols-3">
        {[
          { title: "Drankbestellingen", count: 2 },
          { title: "Gerechten klaar", count: 2 },
          { title: "Actieve tafels", count: 3 },
        ].map((col) => (
          <div key={col.title}>
            <Skeleton className="mb-3 h-5 w-48" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: col.count }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-dark-600/30 bg-dark-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-40 mb-2" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-8 w-28 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
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

  if (!barOrders && !kitchenReady && !requests && !sessions) return <ServiceSkeleton />;

  const refreshAll = () => {
    refreshBar();
    refreshKitchen();
    refreshReq();
    refreshSessions();
  };

  return (
    <main className="min-h-screen p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-display font-bold text-cream-200">🤵 Bediening</h1>
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
                      <p className="font-bold text-cream-200">
                        {meta.emoji} Tafel {r.tableNumber} — {meta.label}
                      </p>
                      {r.note && (
                        <p className="text-sm text-cream-500">&quot;{r.note}&quot;</p>
                      )}
                      <p className="text-xs text-cream-500/60">
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
      <ToastProvider>
        <ServiceBoard />
      </ToastProvider>
    </PinGate>
  );
}
