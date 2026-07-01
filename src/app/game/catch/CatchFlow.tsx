"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AcquisitionType } from "@/core/types/database";
import { type ActiveCheckin, isCheckinForToday, loadCheckin } from "@/lib/checkin";
import { todayIso } from "@/core/mlb/mlbClient";

type Step = "how" | "who";

const HOW_OPTIONS: { value: AcquisitionType; label: string }[] = [
  { value: "home_run", label: "Home Run" },
  { value: "foul_ball", label: "Foul Ball" },
  { value: "toss_up", label: "Toss-up" },
  { value: "batting_practice", label: "Batting Practice" },
  { value: "other", label: "Other" },
];

export default function CatchFlow({ userId }: { userId: string }) {
  void userId; // used when saving the catch (WP5)

  const [checkin, setCheckin] = useState<ActiveCheckin | null>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("how");
  const [how, setHow] = useState<AcquisitionType | null>(null);

  useEffect(() => {
    const existing = loadCheckin();
    if (existing && isCheckinForToday(existing, todayIso())) {
      setCheckin(existing);
    }
    setReady(true);
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
        <div className="card">
          <h2>Who gave it up?</h2>
          <p className="muted">
            Roster picker coming next (WP4). You picked:{" "}
            <strong>{how}</strong>.
          </p>
        </div>
      )}
    </main>
  );
}
