import { useId } from 'react';

/** Deterministic, SSR-safe SVG id: prefix + sanitized React useId. */
export function useSvgId(prefix: string): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}
