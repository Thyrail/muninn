import type { SVGProps } from 'react';

/**
 * Muninn's mark: a geometric raven profile. Uses currentColor so it follows the theme;
 * the eye is cut out with a mask so it works on any background.
 */
export function RavenMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...props}>
      <mask id="muninn-raven-eye">
        <rect width="32" height="32" fill="white" />
        <circle cx="18.2" cy="10.6" r="1.2" fill="black" />
      </mask>
      <path
        mask="url(#muninn-raven-eye)"
        d="M8 29 10.6 17.2C11.3 11.6 14 7.6 18 7.2L21.6 7.9C25 8.2 28.6 10 30.6 12.7L23.2 13.2 21.3 13.8 22 16.9 19.7 15.9 20.3 19.3 18.2 18.4 18.5 21.9 17.5 21.3 16.9 29Z"
      />
    </svg>
  );
}
