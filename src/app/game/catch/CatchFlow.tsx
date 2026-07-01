"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AcquisitionType } from "@/core/types/database";
import type { MlbPerson } from "@/core/mlb/types";
import { type ActiveCheckin, isCheckinForToday, loadCheckin } from "@/lib/checkin";
import { todayIso } from "@/core/mlb/mlbClient";
import { enqueueCatch } from "@/lib/offline/catchQueue";
import WhoPicker from "./WhoPicker";

type Step = "how" | "who";

const HOW_OPTIONS: { value: AcquisitionType; label: string }[] = [
  { value: "home_run", label: "Home Run" },
  { value: "foul_ball", label: "Foul Ball" },
  { value: "toss_up", label: "Toss-up" },
  { value: "batting_practice", label: "Batting Practice" },
  { value: "other", label: "Other" },
];

function howLabel(value: AcquisitionType): string {
  return HOW_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

interface Logged {
  how: AcquisitionType;
  personName: string | null;
}

export default function CatchFlow({ userId }: { userId: string }) {
  const [checkin, setCheckin] = useState<ActiveCheckin | null>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("how");
  const [how, setHow] = useState<AcquisitionType | null>(null);
  const [logged, setLogged] = useState<Logged | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Hydrate client-only persisted state (localStorage) after mount. Doing this
    // in a lazy initializer would mismatch SSR (no localStorage on the server).
    /* eslint-disable react-hooks/set-state-in-effect */
    const existing = loadCheckin();
    if (existing && isCheckinForToday(existing, todayIso())) {
      setCheckin(existing);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (!ready) {
    return (
      <main className="game-screen">
        <div className="spinner-screen">Loading…</div>
      </main>
    );
  }

  if (!checkin) {
    return (
      <main className="game-screen">
        <div className="card">
          <h2>Check in first</h2>
          <p className="muted">
            Catches are logged against a game. Head to Game Mode and confirm
            today&apos;s game, then come back to log catches.
          </p>
          <Link className="btn" href="/game">
            Go to Game Mode
          </Link>
        </div>
      </main>
    );
  }

  function selectHow(value: AcquisitionType) {
    setHow(value);
    setStep("who");
  }

  async function commit(person: MlbPerson | null) {
    if (how == null || !checkin || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Queue-first: write locally, then let SyncManager flush to Supabase.
      // This keeps the tap instant and works fully offline (spec §7).
      await enqueueCatch({
        userId,
        gameId: checkin.gameId,
        gamePk: checkin.gamePk,
        gameDate: checkin.gameDate,
        homeCode: checkin.homeCode,
        awayCode: checkin.awayCode,
        venue: checkin.venue,
        acquisitionType: how,
        occurredAt: new Date().toISOString(),
        person: person
          ? {
              mlbPersonId: person.mlbPersonId,
              fullName: person.fullName,
              teamCode: person.teamCode,
              jerseyNumber: person.jerseyNumber,
              position: person.position,
              personType: person.personType,
            }
          : null,
      });
      setLogged({ how, personName: person?.fullName ?? null });
    } catch {
      setError("Couldn't save the catch. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function logAnother() {
    setLogged(null);
    setHow(null);
    setError(null);
    setStep("how");
  }

  // Confirmation after a catch is logged — the sentence, in capture language.
  if (logged) {
    const sentence = logged.personName
      ? `${howLabel(logged.how)} from ${logged.personName}`
      : `${howLabel(logged.how)} — skipped (add player later)`;
    return (
      <main className="game-screen">
        <div className="card">
          <span className="pill">Logged</span>
          <h2>{sentence}</h2>
          <p className="muted">
            {checkin.homeName} vs. {checkin.awayName}
          </p>
          <button className="btn" onClick={logAnother}>
            Log another catch
          </button>
          <Link className="btn secondary" href="/game">
            Done
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="game-screen">
      <header className="home-header">
        {step === "how" ? (
          <Link className="btn ghost" href="/game">
            ‹ Game
          </Link>
        ) : (
          <button className="btn ghost" onClick={() => setStep("how")}>
            ‹ How
          </button>
        )}
        <span className="name">
          {checkin.homeName} vs. {checkin.awayName}
        </span>
        <span style={{ width: 48 }} />
      </header>

      {step === "how" ? (
        <div className="card">
          <h2>How&apos;d you get it?</h2>
          <div className="how-grid">
            {HOW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className="how-btn"
                onClick={() => selectHow(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="card who-card">
          <h2>Who gave it up?</h2>
          {error ? <div className="alert error">{error}</div> : null}
          <WhoPicker
            roster={checkin.roster}
            homeCode={checkin.homeCode}
            onPick={(p: MlbPerson) => commit(p)}
            onSkip={() => commit(null)}
            disabled={saving}
          />
        </div>
      )}
    </main>
  );
}
