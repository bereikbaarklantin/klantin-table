"use client";

// ---------------------------------------------------------------------------
// Super-admin dashboard — platformbeheer voor de eigenaar.
// Tenants beheren, commissie-inzicht, nieuwe restaurants aanmaken.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import type { AdminStats, Tenant } from "@/lib/types";
import { euro } from "@/lib/format";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "hapas:admin";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const STATUS_COLORS: Record<string, string> = {
  trial: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  paused: "bg-cream-500/10 text-cream-400 border-cream-500/20",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/25",
};

const STATUS_LABELS: Record<string, string> = {
  trial: "Proefperiode",
  active: "Actief",
  paused: "Gepauzeerd",
  cancelled: "Opgezegd",
};

// ---------------------------------------------------------------------------
// Auth gate
// ---------------------------------------------------------------------------

function AdminLogin({ onAuth }: { onAuth: () => void }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState(false);

  function tryLogin() {
    const expected = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "admin2024";
    if (secret === expected) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      onAuth();
    } else {
      setError(true);
      setSecret("");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in rounded-2xl border border-dark-600/50 bg-dark-800 p-8 shadow-card">
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-700 border border-hapas-500/20 text-2xl">
            🛡️
          </div>
          <h1 className="mt-3 text-2xl font-display font-black text-cream-200">Admin</h1>
          <p className="mt-1 text-sm text-cream-500">
            Voer het beheerderswachtwoord in.
          </p>
        </div>
        <input
          type="password"
          value={secret}
          onChange={(e) => {
            setSecret(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && tryLogin()}
          autoFocus
          placeholder="Wachtwoord"
          className="w-full rounded-xl border border-dark-600/50 bg-dark-700 px-4 py-3 text-center text-cream-200 placeholder-cream-500/40 focus:border-hapas-500/50 focus:outline-none transition"
        />
        {error && (
          <p className="mt-2 text-center text-sm font-semibold text-red-400">
            Ongeldig wachtwoord.
          </p>
        )}
        <button
          onClick={tryLogin}
          className="mt-4 w-full rounded-xl bg-hapas-500 px-4 py-3 font-bold text-dark-900 transition hover:bg-hapas-400 active:scale-[0.98] shadow-gold-sm"
        >
          Inloggen
        </button>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-dark-600/30 bg-dark-800 p-5 shadow-card">
      <p className="text-xs font-bold uppercase tracking-widest text-hapas-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums text-cream-200">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-cream-500">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-dark-700 text-cream-400 border-dark-600"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Nieuw restaurant formulier
// ---------------------------------------------------------------------------

interface NewTenantForm {
  name: string;
  slug: string;
  ownerEmail: string;
  tableCount: number;
  googlePlaceId: string;
}

const EMPTY_FORM: NewTenantForm = {
  name: "",
  slug: "",
  ownerEmail: "",
  tableCount: 10,
  googlePlaceId: "",
};

function CreateTenantPanel({
  onCreated,
  adminSecret,
}: {
  onCreated: () => void;
  adminSecret: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewTenantForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateName(name: string) {
    setForm((f) => ({ ...f, name, slug: slugify(name) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim() || !form.ownerEmail.trim()) {
      setError("Vul alle verplichte velden in.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          ownerEmail: form.ownerEmail.trim(),
          tableCount: form.tableCount,
          googlePlaceId: form.googlePlaceId.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Fout ${res.status}`);
      }

      setSuccess(true);
      setForm(EMPTY_FORM);
      onCreated();
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-dark-600/50 bg-dark-700 px-4 py-2.5 text-cream-200 placeholder-cream-500/40 focus:border-hapas-500/50 focus:outline-none transition";

  return (
    <div className="rounded-2xl border border-dark-600/30 bg-dark-800 shadow-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-lg font-bold text-cream-200">
          + Nieuw restaurant aanmaken
        </span>
        <svg
          className={`h-5 w-5 text-cream-500 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-dark-600/30 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-cream-300">
                Restaurant naam *
              </label>
              <input
                value={form.name}
                onChange={(e) => updateName(e.target.value)}
                placeholder="bijv. Tapas El Sol"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-cream-300">
                Slug *
              </label>
              <input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                }
                placeholder="tapas-el-sol"
                className={`${inputClass} font-mono text-sm`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-cream-300">
                E-mail eigenaar *
              </label>
              <input
                type="email"
                value={form.ownerEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ownerEmail: e.target.value }))
                }
                placeholder="eigenaar@restaurant.nl"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-cream-300">
                Aantal tafels
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={form.tableCount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tableCount: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-cream-300">
                Google Place ID{" "}
                <span className="text-cream-500/60">(optioneel)</span>
              </label>
              <input
                value={form.googlePlaceId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, googlePlaceId: e.target.value }))
                }
                placeholder="ChIJ..."
                className={`${inputClass} font-mono text-sm`}
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>
          )}
          {success && (
            <p className="mt-3 text-sm font-semibold text-emerald-400">
              Restaurant aangemaakt!
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-hapas-500 px-5 py-2.5 font-bold text-dark-900 transition hover:bg-hapas-400 active:scale-[0.98] disabled:opacity-40 shadow-gold-sm"
            >
              {submitting ? "Aanmaken..." : "Restaurant aanmaken"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setForm(EMPTY_FORM);
                setError(null);
              }}
              className="rounded-xl px-5 py-2.5 font-semibold text-cream-500 transition hover:text-cream-200"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adminSecret =
    process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "admin2024";

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const headers = { "x-admin-secret": adminSecret };

      const [statsRes, tenantsRes] = await Promise.all([
        fetch("/api/admin/stats", { headers }),
        fetch("/api/admin/tenants", { headers }),
      ]);

      if (!statsRes.ok || !tenantsRes.ok) {
        throw new Error("Kan data niet ophalen.");
      }

      const [statsData, tenantsData] = await Promise.all([
        statsRes.json(),
        tenantsRes.json(),
      ]);

      setStats(statsData);
      setTenants(tenantsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }, [adminSecret]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEY);
    onLogout();
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-dark-600/30 bg-dark-800/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-display font-black text-cream-200">
              Bestelsysteem Admin
            </h1>
            <p className="text-sm text-cream-500">
              Super-admin dashboard
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-dark-600/50 px-4 py-2 text-sm font-semibold text-cream-400 transition hover:border-red-500/50 hover:text-red-400"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">
            {error}
            <button
              onClick={fetchData}
              className="ml-3 font-semibold underline hover:text-red-200"
            >
              Opnieuw proberen
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-hapas-500 border-t-transparent" />
            <span className="ml-3 text-cream-500">Laden...</span>
          </div>
        )}

        {!loading && stats && (
          <>
            {/* Stats row */}
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Totaal restaurants"
                value={String(stats.totalTenants)}
              />
              <StatCard
                label="Actieve abonnementen"
                value={String(stats.activeTenants)}
              />
              <StatCard
                label="Bestellingen vandaag"
                value={String(stats.totalOrdersToday)}
                sub="Alle tenants"
              />
              <StatCard
                label="Commissie vandaag"
                value={euro(stats.totalCommissionTodayCents)}
                sub="Platformopbrengst"
              />
            </div>

            {/* Per-tenant breakdown */}
            {stats.tenantStats.length > 0 && (
              <div className="mb-8 rounded-2xl border border-dark-600/30 bg-dark-800 p-5 shadow-card">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-hapas-500">
                  Commissie per restaurant (vandaag)
                </h2>
                <div className="space-y-2">
                  {stats.tenantStats.map((ts) => (
                    <div
                      key={ts.tenantId}
                      className="flex items-center justify-between rounded-xl bg-dark-700/50 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-cream-200">
                          {ts.tenantName}
                        </span>
                        <StatusBadge status={ts.subscriptionStatus} />
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-cream-500">
                          {ts.ordersToday} bestelling
                          {ts.ordersToday !== 1 ? "en" : ""}
                        </span>
                        <span className="font-bold text-emerald-400">
                          {euro(ts.commissionTodayCents)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create tenant */}
            <div className="mb-8">
              <CreateTenantPanel
                onCreated={fetchData}
                adminSecret={adminSecret}
              />
            </div>

            {/* Tenant list */}
            <div className="rounded-2xl border border-dark-600/30 bg-dark-800 shadow-card">
              <div className="border-b border-dark-600/30 px-6 py-4">
                <h2 className="text-lg font-display font-bold text-cream-200">Restaurants</h2>
                <p className="text-sm text-cream-500">
                  {tenants.length} restaurant{tenants.length !== 1 ? "s" : ""}{" "}
                  geregistreerd
                </p>
              </div>

              {tenants.length === 0 ? (
                <div className="px-6 py-12 text-center text-cream-500">
                  Nog geen restaurants aangemaakt.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-dark-600/30 text-xs font-bold uppercase tracking-widest text-hapas-500">
                        <th className="px-6 py-3">Restaurant naam</th>
                        <th className="px-6 py-3">Slug</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3 text-center">Tafels</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Aangemaakt</th>
                        <th className="px-6 py-3">Acties</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-600/20">
                      {tenants.map((t) => (
                        <tr
                          key={t.id}
                          className="transition hover:bg-dark-700/30"
                        >
                          <td className="px-6 py-3 font-semibold text-cream-200">
                            {t.name}
                          </td>
                          <td className="px-6 py-3 font-mono text-xs text-cream-500">
                            {t.slug}
                          </td>
                          <td className="px-6 py-3 text-cream-400">
                            {t.ownerEmail}
                          </td>
                          <td className="px-6 py-3 text-center text-cream-400">
                            {t.tableCount}
                          </td>
                          <td className="px-6 py-3">
                            <StatusBadge status={t.subscriptionStatus} />
                          </td>
                          <td className="px-6 py-3 text-cream-500">
                            {new Date(t.createdAt).toLocaleDateString("nl-NL", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-3">
                            <a
                              href={`/${t.slug}/manager`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-hapas-400 transition hover:text-hapas-300 hover:underline"
                            >
                              Bekijken
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Page export — manages auth state
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthed(sessionStorage.getItem(STORAGE_KEY) === "1");
    }
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!authed) {
    return <AdminLogin onAuth={() => setAuthed(true)} />;
  }

  return <AdminDashboard onLogout={() => setAuthed(false)} />;
}
