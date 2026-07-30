import { cn } from "@/lib/utils";

type ShoeArtProps = {
  from: string;
  to: string;
  accent?: string;
  seed: string;
  className?: string;
  float?: boolean;
};

/**
 * ShoeArt — a stylised side-profile sneaker rendered entirely in SVG so it
 * works fully offline. Each product supplies its own gradient (`from`/`to`)
 * and accent colour, giving every card a distinct colourway.
 */
export function ShoeArt({
  from,
  to,
  accent = "rgba(255,255,255,0.85)",
  seed,
  className,
  float = false,
}: ShoeArtProps) {
  const gid = `body-${seed}`;
  const sid = `sole-${seed}`;
  const hid = `shine-${seed}`;

  return (
    <svg
      viewBox="0 0 420 260"
      className={cn("h-full w-full", float && "[animation:float_6s_ease-in-out_infinite]", className)}
      role="img"
      aria-label="Sneaker illustration"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <linearGradient id={sid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(210,210,225,0.75)" />
        </linearGradient>
        <linearGradient id={hid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Upper body */}
      <path
        d="M60 152
           C60 118 82 92 126 90
           L156 89
           C172 88 180 96 186 110
           C192 124 206 132 226 134
           L306 140
           C338 143 362 150 378 162
           C386 168 385 176 374 179
           L98 186
           C72 186 60 178 60 152 Z"
        fill={`url(#${gid})`}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="1.5"
      />

      {/* Toe cap accent */}
      <path
        d="M306 140 C338 143 362 150 378 162 C386 168 385 176 374 179 L318 180
           C312 166 310 152 306 140 Z"
        fill="rgba(0,0,0,0.14)"
      />

      {/* Swoosh-style accent stripe */}
      <path
        d="M132 168 C176 150 232 146 320 158 C300 168 268 172 232 172 C196 172 160 172 132 168 Z"
        fill={accent}
        opacity="0.9"
      />

      {/* Collar + ankle */}
      <path
        d="M126 90 C110 96 100 112 100 132 L118 132 C118 116 126 102 148 96 Z"
        fill="rgba(0,0,0,0.16)"
      />

      {/* Laces */}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={150 + i * 22}
          y1={104 + i * 8}
          x2={168 + i * 22}
          y2={116 + i * 8}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      ))}

      {/* Top highlight */}
      <path
        d="M70 120 C82 100 104 92 128 92 L150 92 C138 100 120 106 104 122 Z"
        fill={`url(#${hid})`}
      />

      {/* Sole */}
      <path
        d="M52 176 L376 166
           C392 165 398 180 384 189
           C376 194 364 197 348 197
           L84 202
           C64 202 52 194 50 185
           C49 179 49 177 52 176 Z"
        fill={`url(#${sid})`}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="1.5"
      />

      {/* Sole tread lines */}
      {[92, 140, 190, 240, 290, 336].map((x) => (
        <line
          key={x}
          x1={x}
          y1="182"
          x2={x + 4}
          y2="196"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
