import { ImageResponse } from 'next/og';

export const alt = 'Muninn: Antworten nur aus deinen Quellen, jede Aussage belegt.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Theme colors as hex (Satori does not support oklch): raven-black ink and the brass accent.
const BACKGROUND = '#11141a';
const FOREGROUND = '#efece6';
const MUTED = '#9aa1ad';
const ACCENT = '#dcb47c';

/** Same path as `RavenMark`; the eye is drawn on top because Satori has no SVG masks. */
const RAVEN_PATH =
  'M8 29 10.6 17.2C11.3 11.6 14 7.6 18 7.2L21.6 7.9C25 8.2 28.6 10 30.6 12.7L23.2 13.2 21.3 13.8 22 16.9 19.7 15.9 20.3 19.3 18.2 18.4 18.5 21.9 17.5 21.3 16.9 29Z';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px 96px',
        background: BACKGROUND,
        color: FOREGROUND,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <svg width="112" height="112" viewBox="0 0 32 32">
          <path d={RAVEN_PATH} fill={ACCENT} />
          <circle cx="18.2" cy="10.6" r="1.2" fill={BACKGROUND} />
        </svg>
        <div style={{ fontSize: 104, fontWeight: 600, letterSpacing: -2 }}>Muninn</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 52, lineHeight: 1.2, maxWidth: 900 }}>
          Antworten nur aus deinen Quellen, jede Aussage belegt.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, color: MUTED }}>
          <div style={{ width: 40, height: 4, background: ACCENT }} />
          PDFs, Webseiten und Texte durchsuchen, mit Zitaten
        </div>
      </div>
    </div>,
    size,
  );
}
