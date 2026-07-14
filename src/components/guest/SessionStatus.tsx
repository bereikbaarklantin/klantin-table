"use client";

// Statusscherm van de tafel: rondetimer, bestellingen, rekening en
// tafelverzoeken (afrekenen / servetten / bestek / vraag).

import { useState } from "react";
import { euro, mmss, orderTotalCents, timeHM } from "@/lib/format";
import { foodLockRemainingMs } from "@/lib/rules";
import { Order, RequestKind, Session, Settings, VISIT_TYPE_META } from "@/lib/types";
import { useNow } from "../hooks";
import { Badge, Button, Card, SectionTitle } from "../ui";

const STATUS_LABEL: Record<Order["status"], { text: string; tone: "stone" | "amber" | "blue" | "green" }> = {
  nieuw: { text: "Ontvangen", tone: "stone" },
  in_bereiding: { text: "In bereiding", tone: "amber" },
  gereed: { text: "Komt eraan", tone: "blue" },
  uitgeserveerd: { text: "Geserveerd", tone: "green" },
};

export default function SessionStatus({
  session,
  settings,
  orders,
  onRequest,
  onRequestBill,
  onGoMenu,
  onUpgrade,
  onChangeParty,
}: {
  session: Session;
  settings: Settings;
  orders: Order[];
  onRequest: (kind: RequestKind, note?: string) => Promise<void>;
  onRequestBill: () => Promise<void>;
  onGoMenu: () => void;
  onUpgrade: () => void;
  onChangeParty: (n: number) => Promise<void>;
}) {
  const now = useNow();
  const [question, setQuestion] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const remaining = foodLockRemainingMs(session, settings, now);
  const totalMs = settings.roundIntervalMin * 60_000;
  const progress = totalMs > 0 ? 1 - remaining / totalMs : 1;
  const allItems = orders.flatMap((o) => o.items);
  const billTotal = orderTotalCents(allItems);
  const meta = VISIT_TYPE_META[session.visitType];

  async function fire(kind: RequestKind, note?: string) {
    await onRequest(kind, note);
    setSent(kind);
    setTimeout(() => setSent(null), 2500);
  }

  return (
    <div className="pb-32">
      {/* Sessie-info */}
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-500">
            Tafel {session.tableNumber} · {meta.emoji} {meta.label}
          </p>
          {session.visitType === "diner" && (
            <p className="text-sm text-stone-500">
              {session.partySize} personen · ronde {session.roundCount}
              <button
                onClick={() => {
                  const v = prompt(
                    "Aantal personen aan tafel:",
                    String(session.partySize)
                  );
                  const n = v ? parseInt(v, 10) : NaN;
                  if (!isNaN(n) && n > 0 && n <= 20) void onChangeParty(n);
                }}
                className="ml-2 text-xs font-semibold text-hapas-700 underline"
              >
                wijzig
              </button>
            </p>
          )}
        </div>
        {session.visitType !== "diner" && session.status === "open" && (
          <Button variant="secondary" size="sm" onClick={onUpgrade}>
            Upgraden naar diner
          </Button>
        )}
      </Card>

      {/* Rondetimer (scherm 7) */}
      {session.visitType === "diner" && session.roundCount > 0 && (
        <Card className="mt-3 text-center">
          {remaining > 0 ? (
            <>
              <p className="text-sm font-semibold text-stone-500">
                Volgende gerechten-ronde over
              </p>
              <p className="my-1 text-5xl font-black tabular-nums text-hapas-700">
                {mmss(remaining)}
              </p>
              <div className="mx-auto mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full bg-hapas-500 transition-all"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-stone-500">
                🥂 <strong>Drankjes en desserts-tip:</strong> drankjes kunt u
                altijd direct bestellen — de timer geldt alleen voor gerechten.
              </p>
              <div className="mt-3">
                <Button variant="secondary" onClick={onGoMenu}>
                  Drankjes bestellen
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-emerald-700">
                ✅ Nieuwe ronde geopend!
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Bestel zo veel of weinig gerechten als u wilt.
              </p>
              <div className="mt-3">
                <Button size="lg" onClick={onGoMenu}>
                  Volgende ronde bestellen
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Bestellingen */}
      <SectionTitle>Uw bestellingen</SectionTitle>
      {orders.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-500">
            Nog geen bestellingen. Open het menu om te beginnen.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((o) => {
            const s = STATUS_LABEL[o.status];
            return (
              <Card key={o.id}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-500">
                    {timeHM(o.createdAt)} ·{" "}
                    {o.station === "kitchen"
                      ? o.roundNumber
                        ? `Ronde ${o.roundNumber}`
                        : "Keuken"
                      : "Bar"}
                  </p>
                  <Badge tone={s.tone}>{s.text}</Badge>
                </div>
                <ul className="mt-2 text-sm">
                  {o.items.map((it, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {it.qty}× {it.name}
                      </span>
                      <span className="tabular-nums text-stone-500">
                        {euro(it.qty * it.priceCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tafelverzoeken */}
      <SectionTitle>Iets nodig?</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => fire("servetten")}>
          🧻 Servetten
        </Button>
        <Button variant="secondary" onClick={() => fire("bestek")}>
          🍴 Bestek
        </Button>
        <Button variant="secondary" onClick={() => setAskOpen(true)}>
          💬 Vraag aan bediening
        </Button>
        <Button
          variant="secondary"
          onClick={onRequestBill}
          disabled={session.status === "awaiting_payment"}
        >
          🧾 Afrekenen
        </Button>
      </div>
      {sent && (
        <p className="mt-2 text-center text-sm font-semibold text-emerald-700">
          ✅ Doorgegeven aan de bediening.
        </p>
      )}
      {askOpen && (
        <Card className="mt-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="Uw vraag…"
            className="w-full rounded-xl border border-stone-200 p-3 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (question.trim()) {
                  void fire("vraag", question.trim());
                  setQuestion("");
                  setAskOpen(false);
                }
              }}
            >
              Versturen
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAskOpen(false)}>
              Annuleren
            </Button>
          </div>
        </Card>
      )}

      {/* Rekening */}
      <SectionTitle>Rekening</SectionTitle>
      <Card>
        <div className="flex items-center justify-between">
          <p className="font-semibold">Totaal tot nu toe</p>
          <p className="text-xl font-bold">{euro(billTotal)}</p>
        </div>
        {session.status === "awaiting_payment" ? (
          <div className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            🧾 De bediening komt naar u toe om af te rekenen (pin of contant).
            Bedankt voor uw bezoek!
          </div>
        ) : (
          <p className="mt-1 text-sm text-stone-500">
            Klaar? Tik op “Afrekenen” — de bediening komt met de pin naar uw
            tafel.
          </p>
        )}
      </Card>
    </div>
  );
}
