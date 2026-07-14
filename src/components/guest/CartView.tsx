"use client";

import { useMemo, useState } from "react";
import { euro, orderTotalCents } from "@/lib/format";
import { validateSubmission } from "@/lib/rules";
import { Category, OrderItem, Product, Session, Settings } from "@/lib/types";
import { Button, Card, Stepper } from "../ui";
import { Cart } from "./MenuBrowser";

export default function CartView({
  session,
  settings,
  categories,
  products,
  cart,
  setCart,
  onClose,
  onSubmitted,
}: {
  session: Session;
  settings: Settings;
  categories: Category[];
  products: Product[];
  cart: Cart;
  setCart: (c: Cart) => void;
  onClose: () => void;
  onSubmitted: (items: OrderItem[], note: string) => Promise<string[] | null>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const items: OrderItem[] = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, qty]) => {
          const p = products.find((x) => x.id === productId);
          return p
            ? { productId, qty, name: p.name, priceCents: p.priceCents }
            : null;
        })
        .filter((x): x is OrderItem => x !== null),
    [cart, products]
  );

  const validation = useMemo(
    () =>
      validateSubmission({
        session,
        items,
        products,
        categories,
        settings,
      }),
    [session, items, products, categories, settings]
  );

  const total = orderTotalCents(items);
  const isFirstDinnerRound =
    session.visitType === "diner" && session.roundCount === 0;

  async function submit() {
    setBusy(true);
    setErrors([]);
    const errs = await onSubmitted(items, note);
    setBusy(false);
    if (errs && errs.length > 0) setErrors(errs);
  }

  function setQty(productId: string, qty: number) {
    const next = { ...cart };
    if (qty <= 0) delete next[productId];
    else next[productId] = qty;
    setCart(next);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-hapas-50">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold">Uw bestelling</h1>
        <button
          onClick={onClose}
          className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold"
        >
          ← Terug naar menu
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-40">
        {/* Voortgang eerste ronde (diner) */}
        {isFirstDinnerRound && validation.minimumRequired > 0 && (
          <Card className="mb-3 bg-hapas-100/60">
            <p className="text-sm font-semibold text-hapas-900">
              Eerste ronde: minimaal {settings.minDishesPerPersonRound1}{" "}
              gerechten p.p.
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full bg-hapas-600 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (validation.minimumCounted /
                      Math.max(1, validation.minimumRequired)) *
                      100
                  )}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-hapas-800">
              {validation.minimumCounted} van {validation.minimumRequired}{" "}
              gerechten gekozen voor {session.partySize}{" "}
              {session.partySize === 1 ? "persoon" : "personen"}. Daarna bestelt
              u elke ronde zo veel of weinig als u wilt.
            </p>
          </Card>
        )}

        {items.length === 0 ? (
          <p className="py-16 text-center text-stone-500">
            Uw mandje is nog leeg.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((it) => (
              <div
                key={it.productId}
                className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"
              >
                <div>
                  <p className="font-semibold">{it.name}</p>
                  <p className="text-sm text-stone-500">
                    {euro(it.priceCents)} p.st.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Stepper
                    value={it.qty}
                    onChange={(v) => setQty(it.productId, v)}
                  />
                  <span className="w-16 text-right font-bold tabular-nums">
                    {euro(it.qty * it.priceCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Opmerking voor de keuken (allergie, zonder ui, ...)"
          rows={2}
          className="mt-4 w-full rounded-xl border border-stone-200 p-3 text-sm"
        />

        {(errors.length > 0 || (!validation.ok && items.length > 0)) && (
          <div className="mt-3 rounded-xl bg-red-50 p-3">
            {(errors.length > 0 ? errors : validation.errors).map((e, i) => (
              <p key={i} className="text-sm font-semibold text-red-700">
                • {e}
              </p>
            ))}
          </div>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white p-4">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4">
          <div>
            <p className="text-xs text-stone-500">Totaal deze bestelling</p>
            <p className="text-xl font-bold">{euro(total)}</p>
          </div>
          <div className="flex-1">
            <Button
              full
              size="lg"
              disabled={!validation.ok || busy || items.length === 0}
              onClick={submit}
            >
              {busy ? "Versturen…" : "Bestelling versturen"}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
