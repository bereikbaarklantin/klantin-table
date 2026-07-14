"use client";

// Eenvoudige pincode-toegang voor personeelsschermen (pilotniveau).
// Productie: vervangen door Supabase Auth met rollen (zie docs/ROADMAP.md).

import { useEffect, useState } from "react";
import { store } from "@/lib/store";
import { Button, Card } from "./ui";

export default function PinGate({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUnlocked(sessionStorage.getItem("hapas:staff") === "1");
    }
    setChecked(true);
  }, []);

  async function tryUnlock() {
    const settings = await store.getSettings();
    if (pin === settings.staffPin) {
      sessionStorage.setItem("hapas:staff", "1");
      setUnlocked(true);
    } else {
      setError(true);
      setPin("");
    }
  }

  if (!checked) return null;
  if (unlocked) return <>{children}</>;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
      <Card className="animate-fade-in">
        <div className="text-center mb-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-700 border border-hapas-500/20 text-2xl">
            🔒
          </div>
        </div>
        <h1 className="text-lg font-display font-bold text-cream-200 text-center">
          Personeelstoegang
        </h1>
        <p className="mt-1 text-sm text-cream-500 text-center">
          Voer de pincode in voor het {role}.
        </p>
        <input
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
          inputMode="numeric"
          autoFocus
          className="mt-4 w-full rounded-2xl border border-dark-600/50 bg-dark-700 p-3 text-center text-2xl tracking-[0.5em] text-cream-200 placeholder:text-cream-500/40 focus:border-hapas-500/50 focus:outline-none transition"
          placeholder="••••"
        />
        {error && (
          <p className="mt-2 text-sm font-semibold text-red-400 text-center">
            Onjuiste pincode.
          </p>
        )}
        <div className="mt-4">
          <Button full size="lg" onClick={tryUnlock}>
            Ontgrendelen
          </Button>
        </div>
      </Card>
    </main>
  );
}
