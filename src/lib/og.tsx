import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Shared social card builder. Each route's opengraph-image.tsx is a thin
 * wrapper: `export default () => buildOgImage("Title")` plus the shared
 * size/contentType/`dynamic = "force-static"` exports.
 *
 * Everything is baked at build time (Cue lesson: Next's bundled output
 * defeats @vercel/nft's tracing of these readFile calls, so an on-demand
 * render on Vercel would 500 with ENOENT — force-static keeps the reads at
 * build time where the repo files exist).
 *
 * The card carries the actual brand artwork: the traced wordmark and
 * monogram SVGs inlined as data URIs, plus static EB Garamond cuts for the
 * title (satori cannot consume the variable font that next/font serves the
 * pages with; assets/fonts holds Google's static 500/600 TTFs).
 *
 * If a non-Latin page is ever added, register a font that covers its script
 * here FIRST — satori silently falls back for missing glyphs (Cue shipped
 * English-looking Arabic cards for weeks).
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

type OgAssets = {
  fonts: { name: string; data: Buffer; weight: 500 | 600; style: "normal" }[];
  wordmark: string;
  monogram: string;
};

let assets: Promise<OgAssets> | null = null;
function loadAssets(): Promise<OgAssets> {
  assets ??= Promise.all([
    readFile(join(process.cwd(), "assets/fonts/EBGaramond-Medium.ttf")),
    readFile(join(process.cwd(), "assets/fonts/EBGaramond-SemiBold.ttf")),
    readFile(join(process.cwd(), "public/brand/wordmark-ink.svg")),
    readFile(join(process.cwd(), "public/brand/monogram-ink.svg")),
  ]).then(([medium, semibold, wordmark, monogram]) => ({
    fonts: [
      { name: "EB Garamond", data: medium, weight: 500 as const, style: "normal" as const },
      { name: "EB Garamond", data: semibold, weight: 600 as const, style: "normal" as const },
    ],
    wordmark: `data:image/svg+xml;base64,${wordmark.toString("base64")}`,
    monogram: `data:image/svg+xml;base64,${monogram.toString("base64")}`,
  }));
  return assets;
}

const INK = "#111111";
const PAPER = "#FAFAF8";
const MUTED = "#52524E";

export async function buildOgImage(title: string) {
  const { fonts, wordmark, monogram } = await loadAssets();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: PAPER,
          padding: "72px 84px",
          fontFamily: "EB Garamond",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wordmark} width={276} height={108} alt="" />

        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* The double rule, as on the site. */}
          <div style={{ display: "flex", flexDirection: "column", width: 150 }}>
            <div style={{ height: 3, backgroundColor: INK }} />
            <div style={{ height: 4 }} />
            <div style={{ height: 1.5, backgroundColor: INK }} />
          </div>
          <div
            style={{
              marginTop: 34,
              fontSize: 76,
              fontWeight: 500,
              color: INK,
              lineHeight: 1.08,
              letterSpacing: "-1px",
              maxWidth: 980,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 27, fontWeight: 500, color: MUTED }}>
            qasem-portal.com
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={monogram} width={64} height={64} alt="" />
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
