import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { RAVEN_PATHS, RAVEN_VIEW_BOX } from '@/components/brand/raven-paths';

export const alt = 'Muninn: Antworten nur aus deinen Quellen, jede Aussage belegt.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Theme colors as hex (Satori does not support oklch).
const FOREGROUND = '#efece6';
const MUTED = '#9aa1ad';
const ACCENT = '#e2b866';

export default async function OpenGraphImage() {
  // Rendered at build time; the banner shows Hugin and Munin on the right half.
  const banner = await readFile(path.join(process.cwd(), 'public/brand/ravens.jpg'));
  const src = `data:image/jpeg;base64,${banner.toString('base64')}`;

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>
      {/* 1600 × 914 scaled to cover 1200 × 630. */}
      <img src={src} alt="" width={1200} height={686} style={{ position: 'absolute', top: -28 }} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          color: FOREGROUND,
          width: 640,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <svg width="96" height="96" viewBox={RAVEN_VIEW_BOX} fill={ACCENT}>
            {RAVEN_PATHS.map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
          <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -2 }}>Muninn</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 46, lineHeight: 1.25 }}>
            Antworten nur aus deinen Quellen, jede Aussage belegt.
          </div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 28, color: MUTED }}
          >
            <div style={{ width: 40, height: 4, background: ACCENT }} />
            PDFs, Webseiten und Texte
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
