import { useState } from 'react';
import { ISO2, countryByCode } from '../content/names';

/** Country flag image (bundled in /public/flags, public domain via flagcdn). Falls back to the code. */
export function Flag({ code, size = 20 }: { code: string; size?: number }) {
  const iso = ISO2[code];
  const [failed, setFailed] = useState(false);
  const name = countryByCode(code).name;
  if (!iso || failed) return <span className="cc" title={name}>{code}</span>;
  return (
    <img
      className="flag"
      src={`/flags/${iso}.png`}
      alt={name}
      title={name}
      width={size}
      height={Math.round(size * 0.68)}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: Math.round(size * 0.68) }}
    />
  );
}
