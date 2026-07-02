"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MlbPerson } from "@/core/mlb/types";
import type { Ball, Game, Player } from "@/core/types/database";
import type { TeamCode } from "@/core/teams/teamColors";
import {
  BRAND_OPTIONS,
  ballBrandRevealsSpeciality,
  CONDITION_OPTIONS,
  LOCATION_OPTIONS,
  SNAG_METHOD_OPTIONS,
  SPECIALITY_OPTIONS,
} from "@/core/balls/enrichFieldLabels";
import { updateBall } from "@/core/balls/ballService";
import { findOrCreatePlayer } from "@/core/players/playerService";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  formatBallSentence,
  hasUnresolvedSkip,
  howLabel,
  sentenceFromContext,
} from "@/core/balls/ballDisplay";
import type { BallSpeciality } from "@/core/types/database";
import WhoPicker from "@/app/game/catch/WhoPicker";

export default function EnrichBallForm({
  userId,
  ball,
  game,
  player,
  roster,
  homeCode,
  backHref,
}: {
  userId: string;
  ball: Ball;
  game: Game;
  player: Player | null;
  roster: MlbPerson[] | null;
  homeCode: TeamCode;
  backHref: string;
}) {
  const router = useRouter();
  const skipped = hasUnresolvedSkip(ball);

  const [location, setLocation] = useState(ball.location ?? "");
  const [speciality, setSpeciality] = useState<BallSpeciality[]>(
    ball.speciality ?? []
  );
  const [notes, setNotes] = useState(ball.notes ?? "");
  const [snagMethod, setSnagMethod] = useState(ball.snag_method ?? "");
  const [ballCondition, setBallCondition] = useState(ball.ball_condition ?? "");
  const [ballBrand, setBallBrand] = useState(ball.ball_brand ?? "");
  const showSpeciality = ballBrandRevealsSpeciality(ballBrand);
  const [kept, setKept] = useState(
    ball.kept === null ? "" : ball.kept ? "yes" : "no"
  );
  const [assignStep, setAssignStep] = useState(false);
  const [pickedPerson, setPickedPerson] = useState<MlbPerson | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSpeciality(value: BallSpeciality) {
    setSpeciality((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function handleBallBrandChange(value: string) {
    setBallBrand(value);
    if (!ballBrandRevealsSpeciality(value)) {
      setSpeciality([]);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const client = getSupabaseBrowserClient();
      let playerId: string | undefined;

      if (pickedPerson) {
        const p = await findOrCreatePlayer(client, {
          mlbPersonId: pickedPerson.mlbPersonId,
          fullName: pickedPerson.fullName,
          team: pickedPerson.teamCode,
          personType: pickedPerson.personType,
          position: pickedPerson.position,
          jerseyNumber: pickedPerson.jerseyNumber,
        });
        if (!p.ok || !p.data) {
          setError(p.error ?? "Couldn't assign that player.");
          return;
        }
        playerId = p.data.id;
      }

      const result = await updateBall(client, ball.id, userId, {
        ...(playerId !== undefined ? { playerId } : {}),
        location: (location as Ball["location"]) || null,
        speciality: showSpeciality && speciality.length > 0 ? speciality : null,
        notes: notes || null,
        snagMethod: (snagMethod as Ball["snag_method"]) || null,
        ballCondition: (ballCondition as Ball["ball_condition"]) || null,
        ballBrand: (ballBrand as Ball["ball_brand"]) || null,
        kept: kept === "" ? null : kept === "yes",
      });

      if (!result.ok) {
        setError(result.error ?? "Couldn't save changes.");
        return;
      }

      router.push(backHref);
      router.refresh();
    } catch {
      setError("Couldn't save changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const sentence = pickedPerson
    ? formatBallSentence({
        acquisitionType: ball.acquisition_type,
        playerName: pickedPerson.fullName,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        gameDate: game.game_date,
      })
    : sentenceFromContext(ball, game, player);

  if (assignStep && roster && roster.length > 0) {
    return (
      <main className="game-screen">
        <header className="home-header">
          <button className="btn ghost" onClick={() => setAssignStep(false)}>
            ‹ Back
          </button>
          <span className="name">Assign player</span>
          <span style={{ width: 48 }} />
        </header>
        <div className="card who-card">
          <h2>Who gave it up?</h2>
          <WhoPicker
            roster={roster}
            homeCode={homeCode}
            onPick={(p) => {
              setPickedPerson(p);
              setAssignStep(false);
            }}
            onSkip={() => setAssignStep(false)}
            disabled={saving}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="stack-screen enrich-form-screen">
      <header className="home-header enrich-form-header">
        <Link className="btn ghost" href={backHref}>
          ‹ Back
        </Link>
        <span className="name">Enrich</span>
        <span style={{ width: 48 }} />
      </header>

      <div className="card enrich-form-card">
        <span className="pill">{howLabel(ball.acquisition_type)}</span>
        <p className="enrich-form-sentence">{sentence}</p>

        {skipped ? (
          <div className="enrich-skip-block">
            <p className="muted enrich-sub">Player was skipped at capture.</p>
            {pickedPerson ? (
              <p className="enrich-picked">
                Assigned: <strong>{pickedPerson.fullName}</strong>
              </p>
            ) : roster && roster.length > 0 ? (
              <button
                type="button"
                className="btn secondary"
                onClick={() => setAssignStep(true)}
                disabled={saving}
              >
                Assign a player
              </button>
            ) : (
              <p className="muted enrich-sub">
                No roster on file for this game — HR assist coming soon.
              </p>
            )}
          </div>
        ) : null}

        {error ? <div className="alert error">{error}</div> : null}

        <div className="field">
          <label htmlFor="location">Location</label>
          <select
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">—</option>
            {LOCATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="snag">Snag method</label>
          <select
            id="snag"
            value={snagMethod}
            onChange={(e) => setSnagMethod(e.target.value)}
          >
            <option value="">—</option>
            {SNAG_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="condition">Ball condition</label>
          <select
            id="condition"
            value={ballCondition}
            onChange={(e) => setBallCondition(e.target.value)}
          >
            <option value="">—</option>
            {CONDITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="brand">Ball type</label>
          <select
            id="brand"
            value={ballBrand}
            onChange={(e) => handleBallBrandChange(e.target.value)}
          >
            <option value="">—</option>
            {BRAND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {showSpeciality ? (
          <fieldset className="enrich-fieldset">
            <legend>Speciality</legend>
            <p className="muted enrich-sub">
              City Connect, milestone, postseason, etc.
            </p>
            <div className="enrich-check-grid">
              {SPECIALITY_OPTIONS.map((o) => (
                <label key={o.value} className="enrich-check">
                  <input
                    type="checkbox"
                    checked={speciality.includes(o.value)}
                    onChange={() => toggleSpeciality(o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="field">
          <label htmlFor="kept">Kept the ball?</label>
          <select
            id="kept"
            value={kept}
            onChange={(e) => setKept(e.target.value)}
          >
            <option value="">—</option>
            <option value="yes">Kept it</option>
            <option value="no">Gave away / traded</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional — milestone, story, etc."
          />
        </div>

        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </button>
      </div>
    </main>
  );
}
