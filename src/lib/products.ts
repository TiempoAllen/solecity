export type Category = "ANTA" | "Basketball" | "Under Armour" | "Clogs";

export type Availability = "On Hand" | "Pre-Order";

export type Product = {
  slug: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  originalPrice?: number;
  availability: Availability;
  colorway: string;
  rating: number;
  reviews: number;
  authentic: boolean;
  tagline: string;
  description: string;
  sizes: number[];
  gradient: { from: string; to: string; accent: string };
  featured?: boolean;
};

const US_SIZES = [7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12];

export const products: Product[] = [
  {
    slug: "anta-kai-1-speed",
    name: "ANTA Kai 1 “Speed”",
    brand: "ANTA",
    category: "Basketball",
    price: 6490,
    originalPrice: 7290,
    availability: "On Hand",
    colorway: "Nebula Violet",
    rating: 4.9,
    reviews: 128,
    authentic: true,
    tagline: "Kyrie's signature glide, engineered for the hardwood.",
    description:
      "The ANTA Kai 1 pairs a featherlight woven upper with a springy nitrogen-infused midsole for effortless directional changes. Built for guards who live in the paint.",
    sizes: US_SIZES,
    gradient: { from: "#7c3aed", to: "#4f1d96", accent: "rgba(255,255,255,0.9)" },
    featured: true,
  },
  {
    slug: "anta-shock-wave-5",
    name: "ANTA Shock Wave 5",
    brand: "ANTA",
    category: "ANTA",
    price: 5290,
    availability: "On Hand",
    colorway: "Cyber Cyan",
    rating: 4.8,
    reviews: 94,
    authentic: true,
    tagline: "Responsive cushioning that never quits.",
    description:
      "A daily trainer turned court weapon. The Shock Wave 5 uses A-FlashFoam Middle for lightweight rebound, wrapped in a breathable engineered mesh.",
    sizes: US_SIZES,
    gradient: { from: "#22d3ee", to: "#0e7490", accent: "rgba(255,255,255,0.92)" },
    featured: true,
  },
  {
    slug: "ua-curry-flow-11",
    name: "Under Armour Curry Flow 11",
    brand: "Under Armour",
    category: "Under Armour",
    price: 8990,
    originalPrice: 9990,
    availability: "On Hand",
    colorway: "Splash Pink",
    rating: 5.0,
    reviews: 212,
    authentic: true,
    tagline: "Frictionless Flow traction, championship pedigree.",
    description:
      "Chef Curry's eleventh signature features UA Flow — a foam-only outsole that eliminates rubber for absurd grip and a whisper-light ride.",
    sizes: US_SIZES,
    gradient: { from: "#f0abfc", to: "#a21caf", accent: "rgba(255,255,255,0.95)" },
    featured: true,
  },
  {
    slug: "ua-hovr-phantom-4",
    name: "Under Armour HOVR Phantom 4",
    brand: "Under Armour",
    category: "Under Armour",
    price: 7490,
    availability: "Pre-Order",
    colorway: "Midnight Ink",
    rating: 4.7,
    reviews: 67,
    authentic: true,
    tagline: "Zero-gravity feel for the daily miles.",
    description:
      "The HOVR Phantom 4 delivers a plush, energy-returning ride in a slip-on knit collar. Connected UA MapMyRun tech tracks every step.",
    sizes: US_SIZES,
    gradient: { from: "#334155", to: "#0f172a", accent: "rgba(168,196,255,0.9)" },
  },
  {
    slug: "anta-gh3-gordon",
    name: "ANTA GH3 “Gordon Hayward”",
    brand: "ANTA",
    category: "Basketball",
    price: 6990,
    availability: "On Hand",
    colorway: "Aurora Mint",
    rating: 4.6,
    reviews: 51,
    authentic: true,
    tagline: "Lockdown support, all-position versatility.",
    description:
      "A stability-first silhouette with a wide base and multi-directional traction pods. The GH3 keeps you planted through every cut.",
    sizes: US_SIZES,
    gradient: { from: "#34d399", to: "#0f766e", accent: "rgba(255,255,255,0.9)" },
  },
  {
    slug: "solecity-cloud-clog",
    name: "SoleCity Cloud Clog",
    brand: "SoleCity",
    category: "Clogs",
    price: 1890,
    originalPrice: 2290,
    availability: "On Hand",
    colorway: "Sunset Coral",
    rating: 4.8,
    reviews: 176,
    authentic: true,
    tagline: "Marshmallow-soft recovery, all-day comfort.",
    description:
      "Slip into a cloud. The Cloud Clog uses ultra-cushioned EVA and a ventilated upper — the perfect post-game recovery slide or errand-day companion.",
    sizes: [6, 7, 8, 9, 10, 11],
    gradient: { from: "#fb923c", to: "#c2410c", accent: "rgba(255,255,255,0.95)" },
    featured: true,
  },
  {
    slug: "anta-clog-drift",
    name: "ANTA Drift Clog",
    brand: "ANTA",
    category: "Clogs",
    price: 2190,
    availability: "Pre-Order",
    colorway: "Glacier Blue",
    rating: 4.5,
    reviews: 38,
    authentic: true,
    tagline: "Sporty slip-on with a grippy lug sole.",
    description:
      "A rugged clog with a contoured footbed and aggressive lugs. Water-friendly and stupid comfortable — built for the Cebu heat.",
    sizes: [6, 7, 8, 9, 10, 11],
    gradient: { from: "#60a5fa", to: "#1d4ed8", accent: "rgba(255,255,255,0.92)" },
  },
  {
    slug: "ua-spawn-6",
    name: "Under Armour Spawn 6",
    brand: "Under Armour",
    category: "Basketball",
    price: 6790,
    availability: "On Hand",
    colorway: "Volt Strike",
    rating: 4.7,
    reviews: 83,
    authentic: true,
    tagline: "Budget-proof performance for every playmaker.",
    description:
      "The Spawn 6 punches above its price with Micro-G cushioning and a supportive TPU cage. A team-shoe favourite that just keeps hooping.",
    sizes: US_SIZES,
    gradient: { from: "#a3e635", to: "#4d7c0f", accent: "rgba(20,20,20,0.85)" },
  },
];

export const categories: Array<{ label: Category | "All"; count: number }> = [
  { label: "All", count: products.length },
  { label: "ANTA", count: products.filter((p) => p.category === "ANTA").length },
  {
    label: "Basketball",
    count: products.filter((p) => p.category === "Basketball").length,
  },
  {
    label: "Under Armour",
    count: products.filter((p) => p.category === "Under Armour").length,
  },
  { label: "Clogs", count: products.filter((p) => p.category === "Clogs").length },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getFeatured(): Product[] {
  return products.filter((p) => p.featured);
}

export function getRelated(slug: string, category: Category): Product[] {
  return products.filter((p) => p.slug !== slug && p.category === category).slice(0, 3);
}
