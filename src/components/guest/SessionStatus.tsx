"use client";

// Statusscherm van de tafel: rondetimer, bestellingen, rekening en
// tafelverzoeken (afrekenen / servetten / bestek / vraag).

import { useState } from "react";
import { euro, mmss, orderTotalCents, timeHM } from "@/lib/format";
import { foodLockRemainingMs } from "@/lib/rules";
import { Order, RequestKind, Session, Settings, VISIT_TYPE_META } from "@/lib/types";
import { useNow } from "../hooks";
import { Badge, Button, Card, SectionTitle } from "../ui";
import { BottomSheet, NumberPicker, useToast } from "../premium-ui";

const STATUS_LABEL: Record<
  Order["status"],
  { text: string; tone: "stone" | "amber" | "blue" | "green" }
> = {
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
  const { addToast } = useToast();
  const [question, setQuestion] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [partySheet, setPartySheet] = useState(false);
  const [partyDraft, setPartyDraft] = useState(session.partySize);

  const remaining = foodLockRemainingMs(session, settings, now);
  const totalMs = settings.roundIntervalMin * 60_000;
  const progress = totalMs > 0 ? 1 - remaining / totalMs : 1;
  const allItems = orders.flatMap((o) => o.items);
  const billTotal = orderTotalCents(allItems);
  const meta = VISIT_TYPE_META[session.visitType];

  async function fire(kind: RequestKind, note?: string) {
    await onRequest(kind, note);
    addToast("Doorgegeven aan de bediening!", "success");
  }

  return (
    <div className="pb-32">
      {/* Sessie-info */}
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm text-cream-500">
            Tafel {session.tableNumber} · {meta.emoji} {meta.label}
          </p>
          {session.visitType === "diner" && (
            <p className="text-sm text-cream-500">
              {session.partySize} personen · ronde {session.roundCount}
              <button
                onClick={() => {
                  setPartyDraft(session.partySize);
                  setPartySheet(true);
                }}
                className="ml-2 text-xs font-semibold text-hapas-400 underline underline-offset-2 hover:text-hapas-300 transition"
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

      {/* NumberPicker BottomSheet voor party size */}
      <BottomSheet
        open={partySheet}
        onClose={() => setPartySheet(false)}
        title="Aantal personen wijzigen"
      >
        <div className="flex justify-center my-4">
          <NumberPicker value={partyDraft} onChange={setPartyDraft} min={1} max={20} />
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setPartySheet(false)}>
            Annuleren
          </Button>
          <div className="flex-1">
            <Button
              full
              onClick={async () => {
                await onChangeParty(partyDraft);
                setPartySheet(false);
                addToast(`Aantal aangepast naar ${partyDraft} personen.`, "success");
              }}
            >
              Opslaan
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Rondetimer */}
      {session.visitType === "diner" && session.roundCount > 0 && (
        <Card className="mt-3 text-center">
          {remaining > 0 ? (
            <>
              <p className="text-sm font-semibold text-cream-500">
                Volgende gerechten-ronde over
              </p>
              <p className="my-1 text-5xl font-black tabular-nums text-hapas-400">
                {mmss(remaining)}
              </p>
              <div className="mx-auto mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-dark-700">
                <div
                  className="h-full bg-hapas-500 transition-all"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-cream-500">
                🥂 <strong className="text-cream-300">Drankjes en desserts-tip:</strong> drankjes kunt u
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
              <p className="text-lg font-bold text-emerald-400">
                ✅ Nieuwe ronde geopend!
              </p>
              <p className="mt-1 text-sm text-cream-500">
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
          <p className="text-sm text-cream-500">
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
                  <p className="text-sm font-semibold text-cream-500">
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
                    <li key={i} className="flex justify-between text-cream-300">
                      <span>
                        {it.qty}× {it.name}
                      </span>
                      <span className="tabular-nums text-cream-500">
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
          💬 Vraag
        </Button>
        <Button
          variant="secondary"
          onClick={onRequestBill}
          disabled={session.status === "awaiting_payment"}
        >
          🧾 Afrekenen
        </Button>
      </div>

      {/* Vraag BottomSheet */}
      <BottomSheet
        open={askOpen}
        onClose={() => setAskOpen(false)}
        title="Vraag aan bediening"
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="Uw vraag…"
          autoFocus
          className="w-full rounded-2xl border border-dark-600/50 bg-dark-700 p-3 text-sm text-cream-200 placeholder:text-cream-500/50 focus:border-hapas-500/50 focus:outline-none transition"
        />
        <div className="mt-3 flex gap-2">
          <Button
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
          <Button variant="ghost" onClick={() => setAskOpen(false)}>
            Annuleren
          </Button>
        </div>
      </BottomSheet>

      {/* Rekening */}
      <SectionTitle>Rekening</SectionTitle>
      <Card>
        <div className="flex items-center justify-between">
          <p className="font-semibold text-cream-200">Totaal tot nu toe</p>
          <p className="text-xl font-bold text-hapas-400 tabular-nums">{euro(billTotal)}</p>
        </div>
        {session.status === "awaiting_payment" ? (
          <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
            🧾 De bediening komt naar u toe om af te rekenen (pin of contant).
            Bedankt voor uw bezoek!
          </div>
        ) : (
          <p className="mt-1 text-sm text-cream-500">
            Klaar? Tik op &quot;Afrekenen&quot; — de bediening komt met de pin naar uw
            tafel.
          </p>
        )}
      </Card>
    </div>
  );
}
