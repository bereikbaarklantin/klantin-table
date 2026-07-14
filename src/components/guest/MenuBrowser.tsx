"use client";

import { useMemo, useState } from "react";
import { euro } from "@/lib/format";
import { Category, Product } from "@/lib/types";
import { Badge, Stepper } from "../ui";
import { FilterChips, SearchBar } from "../premium-ui";

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
  const [search, setSearch] = useState("");
  const active = sorted.find((c) => c.id === activeCat) ?? sorted[0];

  const items = useMemo(() => {
    let list = products.filter((p) => p.categoryId === active?.id);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, active?.id, search]);

  const filterOptions = useMemo(
    () =>
      sorted.map((c) => ({
        value: c.id,
        label: `${c.emoji} ${c.name}${drinksOnlyLocked && c.isFood ? " 🔒" : ""}`,
      })),
    [sorted, drinksOnlyLocked]
  );

  function setQty(productId: string, qty: number) {
    const next = { ...cart };
    if (qty <= 0) delete next[productId];
    else next[productId] = qty;
    setCart(next);
  }

  return (
    <div>
      {/* Zoekbalk */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Zoek in het menu…"
      />

      {/* Categorie-chips */}
      {!search.trim() && (
        <div className="mt-3">
          <FilterChips
            options={filterOptions}
            selected={activeCat}
            onChange={(id) => setActiveCat(id)}
          />
        </div>
      )}

      {/* Timer-lock melding */}
      {drinksOnlyLocked && active?.isFood && !search.trim() && (
        <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
          ⏱️ Uw volgende gerechten-ronde is nog niet open. U kunt gerechten
          alvast in het mandje zetten, maar verzenden kan pas als de timer is
          afgelopen. <strong className="text-amber-200">Drankjes kunnen altijd direct.</strong>
        </div>
      )}

      {/* Producten */}
      <div className="mt-3 flex flex-col gap-3 stagger-children">
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="text-4xl opacity-50">🔍</span>
            <p className="text-sm text-cream-500">Geen resultaten gevonden.</p>
          </div>
        )}
        {items.map((p) => {
          const qty = cart[p.id] ?? 0;
          return (
            <div
              key={p.id}
              className={`flex items-start gap-3 rounded-2xl border bg-dark-800 p-3 shadow-card transition-all ${
                p.available
                  ? "border-dark-600/30 hover:border-hapas-500/20"
                  : "border-dark-600/20 opacity-50"
              }`}
            >
              {/* Product afbeelding/emoji */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-dark-700 text-2xl border border-dark-600/30">
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

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold leading-tight text-cream-200">
                    {p.name}
                  </h3>
                  <span className="shrink-0 font-bold text-hapas-400 tabular-nums">
                    {euro(p.priceCents)}
                  </span>
                </div>
                {p.description && (
                  <p className="mt-0.5 text-sm text-cream-500 line-clamp-2">
                    {p.description}
                  </p>
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

              {/* Stepper / add button */}
              <div className="shrink-0 self-center">
                {p.available ? (
                  qty === 0 ? (
                    <button
                      onClick={() => setQty(p.id, 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-hapas-500 text-lg font-bold text-dark-900 shadow-gold-sm active:scale-95 hover:bg-hapas-400 transition-all"
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
