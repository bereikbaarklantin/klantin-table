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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <Card>
        <h1 className="text-lg font-bold">Personeelstoegang</h1>
        <p className="mt-1 text-sm text-stone-500">
          Voer de pincode in voor het {role}. (Demo-standaard: 1234)
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
          className="mt-4 w-full rounded-xl border border-stone-300 p-3 text-center text-2xl tracking-[0.5em]"
          placeholder="••••"
        />
        {error && (
          <p className="mt-2 text-sm font-semibold text-red-600">
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
