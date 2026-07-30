import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { ShieldIcon, TruckIcon, BoltIcon, InstagramIcon } from "@/components/icons";

const features = [
  {
    icon: ShieldIcon,
    title: "Verified Authentic",
    body: "Every pair is inspected and guaranteed legit. Original ANTA & Under Armour, no fakes — ever.",
  },
  {
    icon: TruckIcon,
    title: "Ships Nationwide",
    body: "From Cebu City to your doorstep anywhere in the Philippines. Fast, tracked, and secure.",
  },
  {
    icon: BoltIcon,
    title: "Fresh Pre-Orders",
    body: "Reserve upcoming drops before they land. On-hand and pre-order pairs, updated weekly.",
  },
  {
    icon: InstagramIcon,
    title: "DM to Order",
    body: "Prefer to chat? Slide into @solecity.est23 and we’ll sort your desired pair personally.",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-6">
      <Reveal className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[--color-brand-3]">
          Why SOLECITY
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          The trusted way to cop your next pair
        </h2>
      </Reveal>

      <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <StaggerItem key={f.title}>
            <div className="glass glass-specular group h-full rounded-3xl p-6 transition-glass hover:-translate-y-1 hover:glow-ring">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[--color-brand]/30 to-[--color-brand-2]/30 text-[--color-brand-3] transition-transform duration-500 group-hover:scale-110">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
