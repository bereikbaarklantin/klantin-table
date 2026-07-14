"use client";

// Reviewfunnel na het sluiten van de tafel.
// Twee modi (instelbaar in manager-dashboard):
// - "compliant" (standaard, aanbevolen): bij ELKE score blijven beide routes
//   zichtbaar (Google + intern). Lage scores krijgen het interne formulier
//   prominent, maar de Google-optie wordt niet verborgen — conform het
//   Google-reviewbeleid (verbod op review gating) en ACM-richtlijnen.
// - "strikt": 1-3 sterren ziet alléén het interne formulier (zoals in de
//   oorspronkelijke spec). Let op: dit is review gating; juridisch risico
//   ligt bij de restauranteigenaar. Zie docs/ARCHITECTURE.md.

import { useState } from "react";
import { Session, Settings } from "@/lib/types";
import { Button, Card } from "../ui";
import { StarRating } from "../premium-ui";

export default function ReviewFlow({
  session,
  settings,
  onSubmit,
}: {
  session: Session;
  settings: Settings;
  onSubmit: (args: {
    stars: number;
    feedback?: string;
    contact?: string;
    routed: "intern" | "google";
  }) => Promise<void>;
}) {
  const [stars, setStars] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [contact, setContact] = useState("");
  const [done, setDone] = useState<null | "intern" | "google">(null);
  const [busy, setBusy] = useState(false);

  const high = stars >= settings.reviewThreshold;
  const showGoogleOption =
    stars > 0 && (high || settings.reviewMode === "compliant");
  const showInternalForm = stars > 0;

  async function submitInternal() {
    setBusy(true);
    await onSubmit({
      stars,
      feedback: feedback.trim() || undefined,
      contact: contact.trim() || undefined,
      routed: "intern",
    });
    setBusy(false);
    setDone("intern");
  }

  async function goGoogle() {
    setBusy(true);
    await onSubmit({ stars, routed: "google" });
    setBusy(false);
    setDone("google");
    if (typeof window !== "undefined") {
      window.open(settings.googleReviewUrl, "_blank", "noopener");
    }
  }

  // ── Bedankt-scherm ────────────────────────────────────────────────────────
  if (done) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6 text-center">
        <div className="animate-fade-in-up">
          <div className="text-5xl">🙏</div>
          <h1 className="mt-3 font-display text-display-md text-cream-200">
            Bedankt!
          </h1>
          <p className="mt-2 text-cream-500">
            {done === "intern"
              ? "Uw feedback is direct doorgestuurd naar ons managementteam. We nemen dit serieus — en als u contactgegevens achterliet, hoort u snel van ons."
              : "Fijn dat u uw ervaring wilt delen. Tot snel bij " +
                settings.restaurantName +
                "!"}
          </p>
        </div>
      </main>
    );
  }

  // ── Review formulier ──────────────────────────────────────────────────────
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
      <Card className="text-center animate-fade-in">
        <div className="text-4xl">👋</div>
        <h1 className="mt-2 font-display text-xl font-bold text-cream-200">
          Hoe tevreden was uw bezoek?
        </h1>
        <p className="mt-1 text-sm text-cream-500">
          Tafel {session.tableNumber} · {settings.restaurantName}
        </p>

        {/* Sterren — premium SVG component */}
        <div className="mt-5 flex justify-center">
          <StarRating value={stars} onChange={setStars} size={40} />
        </div>

        {/* Laag: intern feedback formulier */}
        {showInternalForm && !high && (
          <div className="mt-5 rounded-2xl bg-dark-700/50 border border-dark-600/30 p-4 text-left">
            <p className="font-semibold text-cream-200">
              Dat spijt ons — vertel ons wat beter kon.
            </p>
            <p className="mt-0.5 text-xs text-cream-500">
              Uw bericht gaat rechtstreeks naar de eigenaar.
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              placeholder="Wat kunnen we verbeteren?"
              className="mt-2 w-full rounded-xl border border-dark-600/50 bg-dark-800 p-3 text-sm text-cream-200 placeholder:text-cream-500/50 focus:border-hapas-500/50 focus:outline-none transition"
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="E-mail of telefoon (optioneel)"
              className="mt-2 w-full rounded-xl border border-dark-600/50 bg-dark-800 p-3 text-sm text-cream-200 placeholder:text-cream-500/50 focus:border-hapas-500/50 focus:outline-none transition"
            />
            <div className="mt-3">
              <Button full loading={busy} onClick={submitInternal}>
                Feedback versturen
              </Button>
            </div>
          </div>
        )}

        {/* Hoog: Google + optioneel intern */}
        {showInternalForm && high && (
          <div className="mt-5 animate-fade-in">
            <p className="text-cream-400">
              Geweldig! Zou u dit ook op Google willen delen? Daar helpt u ons
              enorm mee.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button full size="lg" loading={busy} onClick={goGoogle}>
                Deel op Google Reviews
              </Button>
              <Button
                full
                variant="ghost"
                disabled={busy}
                onClick={submitInternal}
              >
                Liever direct feedback aan ons
              </Button>
            </div>
          </div>
        )}

        {/* Compliant-modus: Google-optie bij lage score ook tonen */}
        {showGoogleOption && !high && (
          <button
            onClick={goGoogle}
            className="mt-3 text-xs text-cream-500/50 underline underline-offset-2 hover:text-cream-400 transition"
          >
            Of deel uw ervaring op Google
          </button>
        )}
      </Card>
    </main>
  );
}
