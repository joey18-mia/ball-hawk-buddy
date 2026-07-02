"use client";

/**
 * Drains the offline catch queue into Supabase. For each queued catch we ensure
 * the game row exists, reuse-or-create the player row (so OOP counts aggregate),
 * then insert the ball — removing the item on success and bumping an attempt
 * counter on failure so it retries next flush.
 */

import type { AppSupabaseClient } from "@/core/auth/authService";
import { findOrCreateGame } from "@/core/games/gameService";
import { findOrCreatePlayer } from "@/core/players/playerService";
import { insertBall } from "@/core/balls/ballService";
import {
  countCatches,
  getAllCatches,
  removeCatch,
  updateCatch,
  type QueuedCatch,
} from "./catchQueue";

let flushing = false;

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

async function bumpAttempts(item: QueuedCatch): Promise<void> {
  await updateCatch({ ...item, attempts: item.attempts + 1 });
}

export interface FlushResult {
  synced: number;
  remaining: number;
}

export async function flushQueue(
  client: AppSupabaseClient
): Promise<FlushResult> {
  if (flushing || !isOnline()) {
    return { synced: 0, remaining: await countCatches() };
  }
  flushing = true;
  let synced = 0;
  let failed = 0;
  try {
    const items = await getAllCatches();
    if (items.length > 0) {
      console.info(`[sync] flushing ${items.length} queued catch(es)…`);
    }
    for (const item of items) {
      try {
        let gameId = item.gameId;
        if (!gameId) {
          const g = await findOrCreateGame(client, {
            userId: item.userId,
            gameDate: item.gameDate,
            homeTeam: item.homeCode,
            awayTeam: item.awayCode,
            venue: item.venue,
            mlbGamePk: item.gamePk,
          });
          if (!g.ok || !g.data) {
            console.error(
              `[sync] game step failed (localId=${item.localId}):`,
              g.ok ? "no data returned" : g.error
            );
            failed++;
            await bumpAttempts(item);
            continue;
          }
          gameId = g.data.id;
        }

        let playerId: string | null = null;
        if (item.person) {
          const p = await findOrCreatePlayer(client, {
            mlbPersonId: item.person.mlbPersonId,
            fullName: item.person.fullName,
            team: item.person.teamCode,
            personType: item.person.personType,
            position: item.person.position,
            jerseyNumber: item.person.jerseyNumber,
          });
          if (!p.ok || !p.data) {
            console.error(
              `[sync] player step failed (localId=${item.localId}, person=${item.person.fullName}):`,
              p.ok ? "no data returned" : p.error
            );
            failed++;
            await bumpAttempts(item);
            continue;
          }
          playerId = p.data.id;
        }

        const b = await insertBall(client, {
          userId: item.userId,
          gameId,
          playerId,
          acquisitionType: item.acquisitionType,
          occurredAt: item.occurredAt,
        });
        if (!b.ok) {
          console.error(
            `[sync] ball insert failed (localId=${item.localId}):`,
            b.error
          );
          failed++;
          await bumpAttempts(item);
          continue;
        }

        await removeCatch(item.localId);
        synced++;
      } catch (err) {
        console.error(
          `[sync] unexpected error (localId=${item.localId}):`,
          err
        );
        failed++;
        await bumpAttempts(item);
      }
    }
    if (synced > 0 || failed > 0) {
      console.info(`[sync] done — synced=${synced}, failed=${failed}`);
    }
  } finally {
    flushing = false;
  }
  return { synced, remaining: await countCatches() };
}
