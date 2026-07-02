"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { MlbGame } from "@/core/mlb/types";
import type { TeamCode } from "@/core/teams/teamColors";
import {
  getActiveRoster,
  getScheduleForDate,
  getScheduleForTeam,
  todayIso,
} from "@/core/mlb/mlbClient";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { findOrCreateGame } from "@/core/games/gameService";
import {
  type ActiveCheckin,
  clearCheckin,
  isCheckinForToday,
  loadCheckin,
  saveCheckin,
} from "@/lib/checkin";
import TutorialLine from "./TutorialLine";

type Phase = "loading" | "suggest" | "slate" | "checkedin" | "error";

function matchupLabel(homeName: string, awayName: string): string {
  return `${homeName} vs. ${awayName}`;
}

export default function CheckIn({
  userId,
  homeTeam,
}: {
  userId: string;
  homeTeam: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [suggested, setSuggested] = useState<MlbGame | null>(null);
  const [slate, setSlate] = useState<MlbGame[]>([]);
  const [active, setActive] = useState<ActiveCheckin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyPk, setBusyPk] = useState<number | null>(null);

  const beginFlow = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      if (homeTeam) {
        const games = await getScheduleForTeam(homeTeam as TeamCode, todayIso());
        if (games.length > 0) {
          setSuggested(games[0]);
          setPhase("suggest");
          return;
        }
      }
      const games = await getScheduleForDate(todayIso());
      setSlate(games);
      setPhase("slate");
    } catch {
      setError(
        "Couldn't reach the MLB schedule. Check your connection and retry."
      );
      setPhase("error");
    }
  }, [homeTeam]);

  useEffect(() => {
    // Hydrate client-only persisted state (localStorage) after mount. Doing this
    // in a lazy initializer would mismatch SSR (no localStorage on the server).
    /* eslint-disable react-hooks/set-state-in-effect */
    const existing = loadCheckin();
    if (existing && isCheckinForToday(existing, todayIso())) {
      setActive(existing);
      setPhase("checkedin");
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    beginFlow();
  }, [beginFlow]);

  const confirmGame = useCallback(
    async (game: MlbGame) => {
      setError(null);
      if (!game.home.code || !game.away.code) {
        setError("This game's teams couldn't be matched. Try another.");
        return;
      }
      setBusyPk(game.gamePk);
      try {
        const [homeRoster, awayRoster] = await Promise.all([
          getActiveRoster(game.home.code),
          getActiveRoster(game.away.code),
        ]);

        const supabase = getSupabaseBrowserClient();
        // Use the LOCAL date (what the schedule was queried with) so it matches
        // todayIso() everywhere. The MLB gameDate is UTC and can roll to the next
        // calendar day for evening games, which would fail the "is this check-in
        // for today?" check on the catch screen.
        const gameDate = todayIso();
        const result = await findOrCreateGame(supabase, {
          userId,
          gameDate,
          homeTeam: game.home.code,
          awayTeam: game.away.code,
          venue: game.venue,
          mlbGamePk: game.gamePk,
        });
        if (!result.ok || !result.data) {
          setError(result.error ?? "Couldn't save the game.");
          return;
        }

        const checkin: ActiveCheckin = {
          gameId: result.data.id,
          gamePk: game.gamePk,
          gameDate,
          homeCode: game.home.code,
          awayCode: game.away.code,
          homeName: game.home.name,
          awayName: game.away.name,
          venue: game.venue,
          roster: [...homeRoster, ...awayRoster],
          checkedInAt: new Date().toISOString(),
        };
        saveCheckin(checkin);
        setActive(checkin);
        setPhase("checkedin");
      } catch {
        setError("Couldn't load rosters. Check your connection and retry.");
      } finally {
        setBusyPk(null);
      }
    },
    [userId]
  );

  function endGame() {
    clearCheckin();
    setActive(null);
    setSuggested(null);
    beginFlow();
  }

  return (
    <main className="game-screen">
      <header className="home-header">
        <Link className="btn ghost" href="/">
          ‹ Home
        </Link>
        <span className="name">Game Mode</span>
        <span style={{ width: 48 }} />
      </header>

      {error ? <div className="alert error">{error}</div> : null}

      {phase === "loading" ? (
        <div className="spinner-screen">Finding today&apos;s game…</div>
      ) : null}

      {phase === "suggest" && suggested ? (
        <div className="card">
          <span className="pill">You&apos;re at</span>
          <h2>{matchupLabel(suggested.home.name, suggested.away.name)}</h2>
          {suggested.venue ? (
            <p className="muted">{suggested.venue}</p>
          ) : null}
          <button
            className="btn"
            onClick={() => confirmGame(suggested)}
            disabled={busyPk !== null}
          >
            {busyPk === suggested.gamePk ? "Checking in…" : "Confirm — I'm here"}
          </button>
          <button
            className="btn secondary"
            onClick={() => beginFlowToSlate()}
            disabled={busyPk !== null}
          >
            Not this game?
          </button>
        </div>
      ) : null}

      {phase === "slate" ? (
        <div className="card">
          <h2>Today&apos;s games</h2>
          {slate.length === 0 ? (
            <p className="muted">
              No MLB games found for today. Come back on game day.
            </p>
          ) : (
            <ul className="game-list">
              {slate.map((g) => (
                <li key={g.gamePk}>
                  <button
                    className="game-row"
                    onClick={() => confirmGame(g)}
                    disabled={busyPk !== null}
                  >
                    <span className="game-row-teams">
                      {matchupLabel(g.home.name, g.away.name)}
                    </span>
                    {g.venue ? (
                      <span className="game-row-venue">{g.venue}</span>
                    ) : null}
                    {busyPk === g.gamePk ? (
                      <span className="game-row-venue">Checking in…</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {phase === "checkedin" && active ? (
        <div className="card">
          <span className="pill">Checked in</span>
          <h2>{matchupLabel(active.homeName, active.awayName)}</h2>
          <p className="muted">
            {active.venue ? `${active.venue} · ` : ""}
            {active.roster.length} people on the rosters
          </p>

          <TutorialLine />

          <div className="gm-actions">
            <Link className="tile-btn hero" href="/game/catch">
              <span className="tile-title">Catch</span>
              <span className="tile-sub">Log a ball — How → Who</span>
            </Link>
            <div className="tile-btn disabled" aria-disabled>
              <span className="tile-title">Scouting</span>
              <span className="tile-sub">Who to target here</span>
              <span className="pill">Phase 2</span>
            </div>
          </div>

          <button className="btn ghost" onClick={endGame}>
            Check into a different game
          </button>
        </div>
      ) : null}

      {phase === "error" ? (
        <div className="card">
          <button className="btn" onClick={beginFlow}>
            Retry
          </button>
        </div>
      ) : null}
    </main>
  );

  function beginFlowToSlate() {
    setSuggested(null);
    (async () => {
      setPhase("loading");
      try {
        const games = await getScheduleForDate(todayIso());
        setSlate(games);
        setPhase("slate");
      } catch {
        setError(
          "Couldn't reach the MLB schedule. Check your connection and retry."
        );
        setPhase("error");
      }
    })();
  }
}
