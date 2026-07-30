import { Hero } from "@/components/home/Hero";
import { BrandMarquee } from "@/components/home/BrandMarquee";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { CTASection } from "@/components/home/CTASection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <BrandMarquee />
      <FeaturedProducts />
      <FeatureGrid />
      <CTASection />
    </>
  );
}
