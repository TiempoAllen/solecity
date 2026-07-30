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

/** BrandMarquee — static strip of brand/keyword labels. */
export function BrandMarquee() {
  return (
    <div className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
      <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-y py-6">
        {brands.map((b) => (
          <li
            key={b}
            className="text-sm font-semibold tracking-wide text-muted-foreground/60"
          >
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
