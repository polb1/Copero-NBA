import { useState } from 'react';
import { CLUB_LOGOS } from '../data/clubLogos';
import { OFFICIAL_LOGOS } from '../data/logos';
import { findClub } from '../data/clubs';
import { Flag } from './Flag';

/** Crest of a non-NBA club or university (bundled in public/crests), falling back to the club's country flag. */
export function ClubLogo({ name, size = 40 }: { name: string; size?: number }) {
  const url = OFFICIAL_LOGOS ? CLUB_LOGOS[name] : undefined;
  const [failed, setFailed] = useState(false);
  const club = findClub(name);
  if (url && !failed) {
    // Padding in px (a % padding would be relative to the parent width and squash the crest).
    return <img className="team-logo club-logo" src={url} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(true)} style={{ width: size, height: size, padding: Math.max(1, Math.round(size * 0.08)) }} />;
  }
  return club ? <Flag code={club.country} size={Math.round(size * 0.9)} /> : <span aria-hidden="true">🏀</span>;
}
