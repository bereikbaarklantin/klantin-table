"use client";

// ---------------------------------------------------------------------------
// Manager-dashboard — scherm 10.
// KPI's, populaire gerechten, interne feedback, instellingen (o.a. het
// bestelinterval 5–20 min) en menubeschikbaarheid (86-lijst).
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useLive } from "@/components/hooks";
import PinGate from "@/components/PinGate";
import { Badge, Button, Card, EmptyState, SectionTitle } from "@/components/ui";
import { ToastProvider, useToast, Skeleton, ConnectionDot, Modal, ConfirmModal } from "@/components/premium-ui";
import { euro, timeHM } from "@/lib/format";
import { store } from "@/lib/store";
import { ALLERGENS, Category, Product, Settings } from "@/lib/types";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-widest text-hapas-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums text-cream-200">{value}</p>
      {sub && <p className="text-xs text-cream-500">{sub}</p>}
    </Card>
  );
}

function SettingsForm() {
  const { data: settings, refresh } = useLive(() => store.getSettings(), []);
  const [draft, setDraft] = useState<Settings | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (settings && !draft) setDraft(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  if (!draft) return null;

  async function save() {
    if (!draft) return;
    await store.updateSettings(draft);
    refresh();
    addToast("Instellingen opgeslagen!", "success");
  }

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-bold text-cream-200">
            ⏱️ Bestelinterval tussen rondes: {draft.roundIntervalMin} minuten
          </label>
          <input
            type="range"
            min={5}
            max={20}
            step={1}
            value={draft.roundIntervalMin}
            onChange={(e) =>
              setDraft({ ...draft, roundIntervalMin: parseInt(e.target.value, 10) })
            }
            className="mt-2 w-full accent-hapas-500"
          />
          <div className="flex justify-between text-xs text-cream-500">
            <span>5 min</span>
            <span>20 min</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-cream-200">
            🥘 Minimum gerechten p.p. (eerste dinerronde)
          </label>
          <div className="mt-1 flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setDraft({ ...draft, minDishesPerPersonRound1: n })}
                className={`rounded-xl px-4 py-2 font-bold transition ${
                  draft.minDishesPerPersonRound1 === n
                    ? "bg-hapas-500 text-dark-900 shadow-gold-sm"
                    : "bg-dark-700 text-cream-400 border border-dark-600/50 hover:border-hapas-500/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-cream-200">⭐ Reviewfunnel</label>
          <div className="mt-1 flex gap-2">
            <button
              onClick={() => setDraft({ ...draft, reviewMode: "compliant" })}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                draft.reviewMode === "compliant"
                  ? "bg-emerald-600/90 text-white shadow-sm"
                  : "bg-dark-700 text-cream-400 border border-dark-600/50"
              }`}
            >
              Compliant (aanbevolen)
            </button>
            <button
              onClick={() => setDraft({ ...draft, reviewMode: "strikt" })}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                draft.reviewMode === "strikt"
                  ? "bg-amber-500/90 text-white shadow-sm"
                  : "bg-dark-700 text-cream-400 border border-dark-600/50"
              }`}
            >
              Strikt (gating)
            </button>
          </div>
          <p className="mt-1 text-xs text-cream-500">
            Compliant: Google-optie bij elke score zichtbaar (conform
            Google-beleid en ACM). Strikt: 1–3 sterren ziet alleen het interne
            formulier — juridisch risico voor eigen rekening.
          </p>
        </div>

        <div>
          <label className="text-sm font-bold text-cream-200">🔗 Google-review-link</label>
          <input
            value={draft.googleReviewUrl}
            onChange={(e) =>
              setDraft({ ...draft, googleReviewUrl: e.target.value })
            }
            className="mt-1 w-full rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm text-cream-200 placeholder:text-cream-500/50 focus:border-hapas-500/50 focus:outline-none transition"
            placeholder="https://search.google.com/local/writereview?placeid=..."
          />
        </div>

        <div>
          <label className="text-sm font-bold text-cream-200">🔐 Pincode personeel</label>
          <input
            value={draft.staffPin}
            onChange={(e) =>
              setDraft({
                ...draft,
                staffPin: e.target.value.replace(/\D/g, "").slice(0, 6),
              })
            }
            className="mt-1 w-32 rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm tracking-widest text-cream-200 focus:border-hapas-500/50 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save}>Instellingen opslaan</Button>
        </div>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════
   CATEGORY FORM MODAL
   ═══════════════════════════════════════════════════ */

function CategoryFormModal({
  open,
  onClose,
  initial,
  nextSort,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Category;
  nextSort: number;
  onSave: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "🍽️");
  const [isFood, setIsFood] = useState(initial?.isFood ?? true);
  const [countsToward, setCountsToward] = useState(initial?.countsTowardMinimum ?? true);
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setEmoji(initial?.emoji ?? "🍽️");
      setIsFood(initial?.isFood ?? true);
      setCountsToward(initial?.countsTowardMinimum ?? true);
    }
  }, [open, initial]);

  async function handleSave() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const input = { name: name.trim(), emoji, isFood, countsTowardMinimum: countsToward, sort: initial?.sort ?? nextSort };
      if (initial) {
        await store.updateCategory(initial.id, input);
        addToast("Categorie bijgewerkt", "success");
      } else {
        await store.addCategory(input);
        addToast("Categorie toegevoegd", "success");
      }
      onSave();
      onClose();
    } catch {
      addToast("Fout bij opslaan", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Categorie bewerken" : "Nieuwe categorie"}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-bold text-cream-400">Naam</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm text-cream-200 focus:border-hapas-500/50 focus:outline-none transition" placeholder="Warme tapas" />
          </div>
          <div className="w-20">
            <label className="text-xs font-bold text-cream-400">Emoji</label>
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="mt-1 w-full rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-center text-lg focus:border-hapas-500/50 focus:outline-none transition" />
          </div>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-cream-300 cursor-pointer">
            <input type="checkbox" checked={isFood} onChange={(e) => { setIsFood(e.target.checked); if (!e.target.checked) setCountsToward(false); }} className="accent-hapas-500" />
            Eten (keuken)
          </label>
          <label className={`flex items-center gap-2 text-sm cursor-pointer ${isFood ? "text-cream-300" : "text-cream-500/40"}`}>
            <input type="checkbox" checked={countsToward} onChange={(e) => setCountsToward(e.target.checked)} disabled={!isFood} className="accent-hapas-500" />
            Telt voor minimum
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuleren</Button>
          <Button onClick={handleSave} disabled={busy || !name.trim()}>{initial ? "Opslaan" : "Toevoegen"}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════
   PRODUCT FORM MODAL
   ═══════════════════════════════════════════════════ */

function ProductFormModal({
  open,
  onClose,
  initial,
  categories,
  defaultCategoryId,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Product;
  categories: Category[];
  defaultCategoryId: string;
  onSave: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [emoji, setEmoji] = useState("🍽️");
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setPriceStr(initial ? (initial.priceCents / 100).toFixed(2) : "");
      setEmoji(initial?.emoji ?? "🍽️");
      setCategoryId(initial?.categoryId ?? defaultCategoryId);
      setAllergens(initial?.allergens ?? []);
    }
  }, [open, initial, defaultCategoryId]);

  function toggleAllergen(a: string) {
    setAllergens((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }

  async function handleSave() {
    if (!name.trim() || !priceStr) return;
    const priceCents = Math.round(parseFloat(priceStr.replace(",", ".")) * 100);
    if (isNaN(priceCents) || priceCents <= 0) {
      addToast("Ongeldige prijs", "error");
      return;
    }
    setBusy(true);
    try {
      const input = { categoryId, name: name.trim(), description: description.trim(), priceCents, allergens, emoji };
      if (initial) {
        await store.updateProduct(initial.id, input);
        addToast("Product bijgewerkt", "success");
      } else {
        await store.addProduct(input);
        addToast("Product toegevoegd", "success");
      }
      onSave();
      onClose();
    } catch {
      addToast("Fout bij opslaan", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Product bewerken" : "Nieuw product"}>
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-bold text-cream-400">Naam</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm text-cream-200 focus:border-hapas-500/50 focus:outline-none transition" placeholder="Patatas bravas" />
          </div>
          <div className="w-20">
            <label className="text-xs font-bold text-cream-400">Emoji</label>
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="mt-1 w-full rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-center text-lg focus:border-hapas-500/50 focus:outline-none transition" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-cream-400">Omschrijving</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm text-cream-200 focus:border-hapas-500/50 focus:outline-none transition resize-none" placeholder="Knapperig gebakken aardappels met pittige saus…" />
        </div>

        <div className="flex gap-3">
          <div className="w-28">
            <label className="text-xs font-bold text-cream-400">Prijs (€)</label>
            <input value={priceStr} onChange={(e) => setPriceStr(e.target.value)} className="mt-1 w-full rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm text-cream-200 focus:border-hapas-500/50 focus:outline-none transition" placeholder="6.50" inputMode="decimal" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-cream-400">Categorie</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm text-cream-200 focus:border-hapas-500/50 focus:outline-none transition">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-cream-400">Allergenen</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ALLERGENS.map((a) => (
              <button key={a} type="button" onClick={() => toggleAllergen(a)} className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${allergens.includes(a) ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-dark-700 text-cream-500 border border-dark-600/50 hover:border-cream-500/30"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuleren</Button>
          <Button onClick={handleSave} disabled={busy || !name.trim() || !priceStr}>{initial ? "Opslaan" : "Toevoegen"}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════
   MENU EDITOR — replaces AvailabilityManager
   ═══════════════════════════════════════════════════ */

function MenuEditor() {
  const { data: menu, refresh } = useLive(() => store.getMenu(), []);
  const { addToast } = useToast();
  const [tab, setTab] = useState<"menu" | "beschikbaarheid">("menu");
  const [catModal, setCatModal] = useState<{ open: boolean; cat?: Category }>({ open: false });
  const [prodModal, setProdModal] = useState<{ open: boolean; prod?: Product; catId?: string }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "cat" | "prod"; id: string; name: string } | null>(null);

  if (!menu) return null;
  const cats = [...menu.categories].sort((a, b) => a.sort - b.sort);

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === "cat") {
        await store.deleteCategory(deleteConfirm.id);
        addToast("Categorie verwijderd", "success");
      } else {
        await store.deleteProduct(deleteConfirm.id);
        addToast("Product verwijderd", "success");
      }
      refresh();
    } catch {
      addToast("Fout bij verwijderen", "error");
    }
    setDeleteConfirm(null);
  }

  return (
    <>
      {/* Tab switcher */}
      <div className="mb-3 flex gap-1 rounded-xl bg-dark-800 p-1 border border-dark-600/30">
        {(["menu", "beschikbaarheid"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${tab === t ? "bg-hapas-500 text-dark-900 shadow-gold-sm" : "text-cream-400 hover:text-cream-200"}`}>
            {t === "menu" ? "📝 Menu beheren" : "🔴 Beschikbaarheid"}
          </button>
        ))}
      </div>

      {tab === "beschikbaarheid" ? (
        /* 86-lijst (beschikbaarheid toggles) */
        <Card>
          <div className="flex flex-col gap-4">
            {cats.map((c) => (
              <div key={c.id}>
                <p className="text-sm font-bold text-cream-500">{c.emoji} {c.name}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {menu.products.filter((p) => p.categoryId === c.id).map((p) => (
                    <button key={p.id} onClick={async () => { await store.setProductAvailability(p.id, !p.available); refresh(); }} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${p.available ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25" : "bg-red-500/15 text-red-400 border border-red-500/20 line-through hover:bg-red-500/25"}`} title={p.available ? "Tik om uit te verkopen" : "Tik om weer aan te zetten"}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-cream-500/60">Tik op een gerecht om het (tijdelijk) van de kaart te halen — doorgestreept = uitverkocht voor gasten.</p>
          </div>
        </Card>
      ) : (
        /* Menu-editor: full CRUD */
        <div className="flex flex-col gap-3">
          <Button variant="secondary" onClick={() => setCatModal({ open: true })} size="sm">
            + Categorie toevoegen
          </Button>

          {cats.map((c) => {
            const prods = menu.products.filter((p) => p.categoryId === c.id);
            return (
              <Card key={c.id}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-cream-200">{c.emoji} {c.name}
                    <span className="ml-2 text-xs font-normal text-cream-500">{c.isFood ? "keuken" : "bar"} · {prods.length} items</span>
                  </p>
                  <div className="flex gap-1">
                    <button onClick={() => setCatModal({ open: true, cat: c })} className="rounded-lg px-2 py-1 text-xs text-cream-400 hover:bg-dark-600/50 transition" title="Bewerken">✏️</button>
                    <button onClick={() => setDeleteConfirm({ type: "cat", id: c.id, name: c.name })} className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition" title="Verwijderen">🗑️</button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  {prods.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl bg-dark-700/50 px-3 py-2 group">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{p.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-cream-200 truncate">{p.name}</p>
                          {p.description && <p className="text-xs text-cream-500 truncate">{p.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-sm font-bold text-hapas-400 tabular-nums">{euro(p.priceCents)}</span>
                        <button onClick={() => setProdModal({ open: true, prod: p })} className="rounded-lg px-2 py-1 text-xs text-cream-400 hover:bg-dark-600/50 transition opacity-60 group-hover:opacity-100" title="Bewerken">✏️</button>
                        <button onClick={() => setDeleteConfirm({ type: "prod", id: p.id, name: p.name })} className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition opacity-60 group-hover:opacity-100" title="Verwijderen">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => setProdModal({ open: true, catId: c.id })} className="mt-2 w-full rounded-xl border border-dashed border-dark-500/50 py-2 text-sm font-semibold text-cream-500 hover:border-hapas-500/40 hover:text-hapas-400 transition">
                  + Product toevoegen
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Category modal */}
      <CategoryFormModal
        open={catModal.open}
        onClose={() => setCatModal({ open: false })}
        initial={catModal.cat}
        nextSort={cats.length > 0 ? Math.max(...cats.map((c) => c.sort)) + 1 : 1}
        onSave={refresh}
      />

      {/* Product modal */}
      <ProductFormModal
        open={prodModal.open}
        onClose={() => setProdModal({ open: false })}
        initial={prodModal.prod}
        categories={cats}
        defaultCategoryId={prodModal.catId ?? prodModal.prod?.categoryId ?? cats[0]?.id ?? ""}
        onSave={refresh}
      />

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={deleteConfirm?.type === "cat" ? "Categorie verwijderen?" : "Product verwijderen?"}
        message={deleteConfirm ? `"${deleteConfirm.name}" wordt permanent verwijderd.${deleteConfirm.type === "cat" ? " Alle producten in deze categorie worden ook verwijderd." : ""}` : ""}
        confirmLabel="Verwijderen"
        variant="danger"
      />
    </>
  );
}


function ManagerSkeleton() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-dark-600/30 bg-dark-800 p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <div>
          <Skeleton className="h-5 w-44 mb-3" />
          <div className="rounded-2xl border border-dark-600/30 bg-dark-800 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between py-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
          <Skeleton className="h-5 w-40 mt-6 mb-3" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-dark-600/30 bg-dark-800 p-4">
                <Skeleton className="h-4 w-36 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="rounded-2xl border border-dark-600/30 bg-dark-800 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full mb-3 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function ManagerBoard() {
  const { data: stats } = useLive(() => store.getStats(), [], 10000);
  const { data: reviews } = useLive(() => store.listInternalReviews(), [], 15000);

  if (!stats) return <ManagerSkeleton />;

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-display font-bold text-cream-200">📊 Manager</h1>
        <div className="flex items-center gap-3">
          <ConnectionDot />
          <Badge tone="gold">{store.mode === "demo" ? "demo-modus" : "live"}</Badge>
        </div>
      </header>

      {/* KPI's */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Actieve tafels"
          value={String(stats?.activeTables ?? 0)}
          sub={
            stats && stats.activeTableNumbers.length > 0
              ? `nr. ${stats.activeTableNumbers.join(", ")}`
              : "—"
          }
        />
        <Stat
          label="Omzet vandaag"
          value={euro(stats?.revenueTodayCents ?? 0)}
          sub={`${stats?.ordersToday ?? 0} bestellingen`}
        />
        <Stat
          label="Gem. besteding"
          value={euro(stats?.avgSpendPerSessionCents ?? 0)}
          sub={`${stats?.avgOrdersPerSession ?? 0} bestellingen / tafel`}
        />
        <Stat
          label="Wachttijd keuken"
          value={
            stats?.avgKitchenMinutes != null
              ? `${stats.avgKitchenMinutes} min`
              : "—"
          }
          sub="gem. nieuw → gereed"
        />
        <Stat
          label="Tafelduur"
          value={
            stats?.avgTableMinutes != null ? `${stats.avgTableMinutes} min` : "—"
          }
          sub="gem. gesloten tafels"
        />
        <Stat
          label="Open keuken"
          value={String(stats?.openKitchenTickets ?? 0)}
        />
        <Stat label="Open drankjes" value={String(stats?.openBarTickets ?? 0)} />
        <Stat label="Open verzoeken" value={String(stats?.openRequests ?? 0)} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <SectionTitle>🏆 Populairste gerechten</SectionTitle>
          <Card>
            {stats && stats.popularProducts.length > 0 ? (
              <ol className="flex flex-col gap-1.5">
                {stats.popularProducts.map((p, i) => (
                  <li key={p.name} className="flex justify-between text-sm text-cream-300">
                    <span>
                      <span className="mr-2 font-black text-hapas-400">
                        {i + 1}.
                      </span>
                      {p.name}
                    </span>
                    <span className="font-bold tabular-nums text-cream-400">{p.qty}×</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-cream-500">Nog geen bestellingen vandaag.</p>
            )}
          </Card>

          <SectionTitle>📨 Interne feedback</SectionTitle>
          <div className="flex flex-col gap-2">
            {(reviews ?? []).length === 0 ? (
              <EmptyState emoji="🌟" text="Geen interne feedback ontvangen." />
            ) : (
              (reviews ?? []).map((r) => (
                <Card key={r.id}>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-cream-200">
                      {"⭐".repeat(r.stars)}
                      <span className="ml-2 text-sm font-semibold text-cream-500">
                        Tafel {r.tableNumber}
                      </span>
                    </p>
                    <span className="text-xs text-cream-500/60">
                      {timeHM(r.createdAt)}
                    </span>
                  </div>
                  {r.feedback && (
                    <p className="mt-1 text-sm text-cream-400">&quot;{r.feedback}&quot;</p>
                  )}
                  {r.contact && (
                    <p className="mt-1 text-xs font-semibold text-hapas-400">
                      Contact: {r.contact}
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        <div>
          <SectionTitle>⚙️ Instellingen</SectionTitle>
          <SettingsForm />

          <SectionTitle>🚀 Pilot</SectionTitle>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-cream-200">Pilot-checklist</p>
                <p className="text-xs text-cream-500">Alle stappen om live te gaan met Klantin Table.</p>
              </div>
              <a href="/manager/pilot" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.97]">
                Checklist →
              </a>
            </div>
          </Card>

          <SectionTitle>📱 QR-codes</SectionTitle>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-cream-200">QR-codes per tafel</p>
                <p className="text-xs text-cream-500">Genereer en print QR-codes voor je tafels.</p>
              </div>
              <a href="/manager/qr" className="inline-flex items-center gap-2 rounded-xl bg-hapas-500 px-4 py-2.5 text-sm font-bold text-dark-900 shadow-gold-sm transition hover:bg-hapas-400 active:scale-[0.97]">
                QR-codes →
              </a>
            </div>
          </Card>

          <SectionTitle>🍽️ Menu</SectionTitle>
          <MenuEditor />
        </div>
      </div>
    </main>
  );
}

export default function ManagerPage() {
  return (
    <PinGate role="managerdashboard">
      <ToastProvider>
        <ManagerBoard />
      </ToastProvider>
    </PinGate>
  );
}
