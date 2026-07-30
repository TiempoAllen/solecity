const brands = [
  "ANTA",
  "UNDER ARMOUR",
  "AUTHENTIC ONLY",
  "BASKETBALL",
  "CLOGS",
  "PRE-ORDER",
  "SHIPS NATIONWIDE",
  "CEBU CITY",
];

/** BrandMarquee — infinite scrolling strip of brand/keyword chips. */
export function BrandMarquee() {
  return (
    <div className="relative mt-20 overflow-hidden py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[--color-void] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[--color-void] to-transparent" />
      <div className="flex w-max marquee-track">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
            {brands.map((b) => (
              <span
                key={`${dup}-${b}`}
                className="mx-4 flex items-center gap-4 text-2xl font-black tracking-tight text-white/25 sm:text-3xl"
              >
                {b}
                <span className="text-[--color-brand]/40">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
