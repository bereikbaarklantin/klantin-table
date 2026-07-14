"use client";

import { minutesSince, timeHM } from "@/lib/format";
import { ticketPriority } from "@/lib/rules";
import { Order } from "@/lib/types";
import { useState } from "react";
import { useNow } from "../hooks";
import { Badge, Button } from "../ui";

const PRIORITY_STYLE: Record<
  ReturnType<typeof ticketPriority>,
  { border: string; badge: "green" | "amber" | "red"; label: string }
> = {
  normaal: { border: "border-dark-600/30", badge: "green", label: "op tijd" },
  hoog: { border: "border-amber-500/60", badge: "amber", label: "let op" },
  urgent: { border: "border-red-500/80 urgent-pulse", badge: "red", label: "URGENT" },
};

export default function OrderTicket({
  order,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  showPriority = true,
}: {
  order: Order;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  showPriority?: boolean;
}) {
  const now = useNow(5000);
  const prio = ticketPriority(order.createdAt, now);
  const style = PRIORITY_STYLE[prio];
  const mins = minutesSince(order.createdAt, now);
  const [busy, setBusy] = useState(false);
  const [acted, setActed] = useState(false);

  return (
    <div
      className={`rounded-2xl border-2 bg-dark-800 p-3 shadow-card ${
        showPriority ? style.border : "border-dark-600/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-lg font-black text-cream-200">
          Tafel {order.tableNumber}
          {order.roundNumber ? (
            <span className="ml-2 text-sm font-bold text-hapas-400">
              · Ronde {order.roundNumber}
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-1.5">
          {showPriority && <Badge tone={style.badge}>{style.label}</Badge>}
          <Badge tone="stone">
            {timeHM(order.createdAt)} · {mins} min
          </Badge>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-cream-500">
        {order.partySize > 0 && <span>👥 {order.partySize} pers.</span>}
        <span>
          {order.visitType === "diner"
            ? "🥘 diner"
            : order.visitType === "borrel"
              ? "🫒 borrel"
              : "🥂 drankjes"}
        </span>
      </div>

      <ul className="mt-2 divide-y divide-dark-600/20">
        {order.items.map((it, i) => (
          <li key={i} className="flex items-baseline gap-2 py-1.5">
            <span className="min-w-[2rem] rounded-lg bg-dark-700 px-1.5 text-center font-black tabular-nums text-hapas-400">
              {it.qty}×
            </span>
            <span className="font-semibold text-cream-200">{it.name}</span>
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-sm font-semibold text-amber-300">
          📝 {order.note}
        </p>
      )}

      {(onAction || onSecondary) && !acted && (
        <div className="mt-3 flex gap-2">
          {onSecondary && secondaryLabel && (
            <Button variant="secondary" size="sm" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await onSecondary(); } catch { setBusy(false); }
            }}>
              {secondaryLabel}
            </Button>
          )}
          {onAction && actionLabel && (
            <div className="flex-1">
              <Button full size="sm" loading={busy} disabled={busy} onClick={async () => {
                setBusy(true);
                setActed(true);
                try { await onAction(); } catch { setActed(false); setBusy(false); }
              }}>
                {actionLabel}
              </Button>
            </div>
          )}
        </div>
      )}
      {acted && (
        <div className="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2 text-center text-sm font-bold text-emerald-400">
          ✓ Verwerkt
        </div>
      )}
    </div>
  );
}
