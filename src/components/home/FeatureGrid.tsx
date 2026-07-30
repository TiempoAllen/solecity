import { AtSign, Shield, Truck, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

const features = [
  {
    icon: Shield,
    title: "Verified Authentic",
    body: "Every pair is inspected and guaranteed legit. Original ANTA & Under Armour, no fakes — ever.",
  },
  {
    icon: Truck,
    title: "Ships Nationwide",
    body: "From Cebu City to your doorstep anywhere in the Philippines. Fast, tracked, and secure.",
  },
  {
    icon: Zap,
    title: "Fresh Pre-Orders",
    body: "Reserve upcoming drops before they land. On-hand and pre-order pairs, updated weekly.",
  },
  {
    icon: AtSign,
    title: "DM to Order",
    body: "Prefer to chat? Slide into @solecity.est23 and we'll sort your desired pair personally.",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
      <Reveal className="max-w-xl">
        <p className="text-sm text-muted-foreground">Why SOLECITY</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          The trusted way to cop your next pair
        </h2>
      </Reveal>

      <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <StaggerItem key={f.title}>
            <Card className="h-full gap-0 p-6">
              <div className="grid size-11 place-items-center rounded-md bg-muted">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
