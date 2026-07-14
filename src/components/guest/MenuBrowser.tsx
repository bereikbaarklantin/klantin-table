"use client";

import { useMemo, useState } from "react";
import { euro } from "@/lib/format";
import { Category, Product } from "@/lib/types";
import { Badge, Stepper } from "../ui";

export type Cart = Record<string, number>; // productId -> aantal

export default function MenuBrowser({
  categories,
  products,
  cart,
  setCart,
  drinksOnlyLocked,
}: {
  categories: Category[];
  products: Product[];
  cart: Cart;
  setCart: (c: Cart) => void;
  /** true = gerechten tijdelijk vergrendeld (rondetimer); dranken kunnen wel. */
  drinksOnlyLocked: boolean;
}) {
  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.sort - b.sort),
    [categories]
  );
  const [activeCat, setActiveCat] = useState<string>(sorted[0]?.id ?? "");
  const active = sorted.find((c) => c.id === activeCat) ?? sorted[0];
  const items = products.filter((p) => p.categoryId === active?.id);

  function setQty(productId: string, qty: number) {
    const next = { ...cart };
    if (qty <= 0) delete next[productId];
    else next[productId] = qty;
    setCart(next);
  }

  return (
    <div>
      {/* Categorie-navigatie */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {sorted.map((c) => {
          const locked = drinksOnlyLocked && c.isFood;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                c.id === active?.id
                  ? "bg-hapas-600 text-white shadow"
                  : "bg-white text-stone-700 border border-stone-200"
              } ${locked ? "opacity-50" : ""}`}
            >
              {c.emoji} {c.name}
              {locked ? " 🔒" : ""}
            </button>
          );
        })}
      </div>

      {drinksOnlyLocked && active?.isFood && (
        <div className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          ⏱️ Uw volgende gerechten-ronde is nog niet open. U kunt gerechten
          alvast in het mandje zetten, maar verzenden kan pas als de timer is
          afgelopen. <strong>Drankjes kunnen altijd direct.</strong>
        </div>
      )}

      {/* Producten */}
      <div className="mt-3 flex flex-col gap-3">
        {items.map((p) => {
          const qty = cart[p.id] ?? 0;
          return (
            <div
              key={p.id}
              className={`flex items-start gap-3 rounded-2xl border bg-white p-3 shadow-sm ${
                p.available ? "border-stone-100" : "border-stone-200 opacity-60"
              }`}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-hapas-100 text-2xl">
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <span aria-hidden>{p.emoji}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{p.name}</h3>
                  <span className="shrink-0 font-bold text-hapas-700">
                    {euro(p.priceCents)}
                  </span>
                </div>
                {p.description && (
                  <p className="mt-0.5 text-sm text-stone-500">{p.description}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {p.allergens.map((a) => (
                    <Badge key={a} tone="stone">
                      {a}
                    </Badge>
                  ))}
                  {!p.available && <Badge tone="red">uitverkocht</Badge>}
                </div>
              </div>
              <div className="shrink-0 self-center">
                {p.available ? (
                  qty === 0 ? (
                    <button
                      onClick={() => setQty(p.id, 1)}
                      className="h-9 w-9 rounded-full bg-hapas-600 text-lg font-bold text-white shadow active:scale-95"
                      aria-label={`${p.name} toevoegen`}
                    >
                      +
                    </button>
                  ) : (
                    <Stepper value={qty} onChange={(v) => setQty(p.id, v)} />
                  )
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
