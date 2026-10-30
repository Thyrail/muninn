import type { SVGProps } from 'react';
import { RAVEN_PATHS, RAVEN_VIEW_BOX } from './raven-paths';

/** Muninn's mark: a raven head in profile. Uses currentColor so it follows the theme. */
export function RavenMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox={RAVEN_VIEW_BOX} fill="currentColor" aria-hidden="true" {...props}>
      {RAVEN_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
