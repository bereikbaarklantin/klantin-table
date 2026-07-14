"use client";

import { minutesSince, timeHM } from "@/lib/format";
import { ticketPriority } from "@/lib/rules";
import { Order } from "@/lib/types";
import { useNow } from "../hooks";
import { Badge, Button } from "../ui";

const PRIORITY_STYLE: Record<
  ReturnType<typeof ticketPriority>,
  { border: string; badge: "green" | "amber" | "red"; label: string }
> = {
  normaal: { border: "border-stone-200", badge: "green", label: "op tijd" },
  hoog: { border: "border-amber-400", badge: "amber", label: "let op" },
  urgent: { border: "border-red-500 urgent-pulse", badge: "red", label: "URGENT" },
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

  return (
    <div
      className={`rounded-2xl border-2 bg-white p-3 shadow-sm ${
        showPriority ? style.border : "border-stone-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-lg font-black">
          Tafel {order.tableNumber}
          {order.roundNumber ? (
            <span className="ml-2 text-sm font-bold text-hapas-700">
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

      <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-stone-500">
        {order.partySize > 0 && <span>👥 {order.partySize} pers.</span>}
        <span>
          {order.visitType === "diner"
            ? "🥘 diner"
            : order.visitType === "borrel"
              ? "🫒 borrel"
              : "🥂 drankjes"}
        </span>
      </div>

      <ul className="mt-2 divide-y divide-stone-100">
        {order.items.map((it, i) => (
          <li key={i} className="flex items-baseline gap-2 py-1.5">
            <span className="min-w-[2rem] rounded-lg bg-stone-100 px-1.5 text-center font-black tabular-nums">
              {it.qty}×
            </span>
            <span className="font-semibold">{it.name}</span>
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mt-2 rounded-xl bg-amber-50 p-2 text-sm font-semibold text-amber-900">
          📝 {order.note}
        </p>
      )}

      {(onAction || onSecondary) && (
        <div className="mt-3 flex gap-2">
          {onSecondary && secondaryLabel && (
            <Button variant="secondary" size="sm" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
          {onAction && actionLabel && (
            <div className="flex-1">
              <Button full size="sm" onClick={onAction}>
                {actionLabel}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
