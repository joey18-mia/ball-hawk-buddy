"use client";

import { useMemo, useState } from "react";
import type { MlbPerson } from "@/core/mlb/types";
import type { TeamCode } from "@/core/teams/teamColors";
import { borderForTeam } from "@/core/teams/teamColors";
import { headshotUrl } from "@/core/mlb/mlbClient";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Pick black or white text for legibility on a given background hex. */
function readableTextColor(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Relative luminance (sRGB approximation).
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0a1628" : "#ffffff";
}

function PersonTile({
  person,
  homeCode,
  onPick,
  disabled,
}: {
  person: MlbPerson;
  homeCode: TeamCode;
  onPick: (p: MlbPerson) => void;
  disabled: boolean;
}) {
  const [imgOk, setImgOk] = useState(false);
  const color = borderForTeam(person.teamCode, homeCode);
  const textColor = readableTextColor(color);

  return (
    <button
      className="person-tile"
      style={{ borderColor: color }}
      onClick={() => onPick(person)}
      disabled={disabled}
    >
      <span className="avatar" style={{ background: color, color: textColor }}>
        <span className="avatar-initials">{initials(person.fullName)}</span>
        {/*
          Colored initials render immediately; the external headshot lazy-loads
          on top with an onError fallback. A plain <img> is deliberate here (not
          next/image): weak-signal tiles must degrade to initials, and headshots
          are external URLs we don't want to proxy/optimize.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`avatar-img ${imgOk ? "loaded" : ""}`}
          src={headshotUrl(person.mlbPersonId)}
          alt=""
          loading="lazy"
          onLoad={() => setImgOk(true)}
          onError={() => setImgOk(false)}
        />
        {person.jerseyNumber != null ? (
          <span className="jersey-badge">{person.jerseyNumber}</span>
        ) : null}
      </span>
      <span className="person-name">{person.fullName}</span>
      <span className="team-chip">{person.teamCode}</span>
    </button>
  );
}

export default function WhoPicker({
  roster,
  homeCode,
  onPick,
  onSkip,
  disabled = false,
}: {
  roster: MlbPerson[];
  homeCode: TeamCode;
  onPick: (p: MlbPerson) => void;
  onSkip: () => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");

  const ordered = useMemo(() => {
    return [...roster].sort((a, b) => {
      // Home team first, then alphabetical by name.
      const ah = a.teamCode === homeCode ? 0 : 1;
      const bh = b.teamCode === homeCode ? 0 : 1;
      if (ah !== bh) return ah - bh;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [roster, homeCode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return ordered;
    return ordered.filter(
      (p) =>
        // "contains" match, not prefix (spec §3) — plus jersey number.
        p.fullName.toLowerCase().includes(q) ||
        (p.jerseyNumber != null && String(p.jerseyNumber).includes(q))
    );
  }, [ordered, query]);

  return (
    <div className="who-picker">
      <input
        className="who-search"
        type="text"
        inputMode="search"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Search name or number…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="person-grid">
        {filtered.map((p) => (
          <PersonTile
            key={p.mlbPersonId}
            person={p}
            homeCode={homeCode}
            onPick={onPick}
            disabled={disabled}
          />
        ))}

        {/* Skip tile — always last, fixed gray, no team color (spec §3). */}
        <button
          className="person-tile skip-tile"
          onClick={onSkip}
          disabled={disabled}
        >
          <span className="avatar skip-avatar">
            <span className="avatar-initials">?</span>
          </span>
          <span className="person-name">Skip</span>
          <span className="team-chip skip-chip">none</span>
        </button>
      </div>
    </div>
  );
}
