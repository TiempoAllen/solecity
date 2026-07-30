"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ShoeArt } from "@/components/ShoeArt";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { EASE_OUT } from "@/components/motion/Reveal";
import { GlassBadge } from "@/components/ui/Glass";
import { ArrowIcon, BoltIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { getFeatured } from "@/lib/products";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE_OUT },
  },
};

export function Hero() {
  const hero = getFeatured()[0];

  return (
    <section className="relative mx-auto max-w-6xl px-4 pt-32 sm:px-6 sm:pt-40">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <GlassBadge className="text-[13px]">
              <BoltIcon className="h-3.5 w-3.5 text-[--color-brand-3]" />
              Est. 2023 · Cebu City
            </GlassBadge>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-5 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Step into
            <br />
            the <span className="brand-gradient-text">SOLECITY</span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-md text-lg text-muted">
            Authentic ANTA, Under Armour, basketball shoes & clogs — hand-picked, verified legit,
            and shipped nationwide from Cebu.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
            <MagneticButton>
              <Link
                href="/products"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_40px_-8px_var(--color-accent-glow)]"
              >
                <span className="absolute inset-0 -z-10 bg-gradient-to-r from-[--color-brand] via-[--color-brand-3] to-[--color-brand-2] transition-transform duration-500 group-hover:scale-110" />
                Shop the collection
                <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </MagneticButton>
            <Link
              href="/products?category=Basketball"
              className="glass rounded-full px-7 py-3.5 text-sm font-semibold text-foreground transition-glass hover:bg-white/10"
            >
              Basketball drops
            </Link>
          </motion.div>

          <motion.ul
            variants={item}
            className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted"
          >
            <li className="flex items-center gap-2">
              <ShieldIcon className="h-4 w-4 text-[--color-brand-3]" /> 100% Authentic
            </li>
            <li className="flex items-center gap-2">
              <TruckIcon className="h-4 w-4 text-[--color-brand-2]" /> Nationwide shipping
            </li>
            <li className="flex items-center gap-2">
              <BoltIcon className="h-4 w-4 text-[--color-brand]" /> Pre-order pairs weekly
            </li>
          </motion.ul>
        </motion.div>

        {/* Hero showpiece */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="relative"
        >
          <div className="glass-strong glass-specular relative aspect-square overflow-hidden rounded-[2.5rem] p-8">
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(120% 120% at 30% 20%, ${hero.gradient.from}55, transparent 55%), radial-gradient(120% 120% at 80% 90%, ${hero.gradient.to}55, transparent 55%)`,
              }}
            />
            <div className="relative grid h-full place-items-center">
              <ShoeArt
                seed="hero"
                from={hero.gradient.from}
                to={hero.gradient.to}
                accent={hero.gradient.accent}
                float
                className="drop-shadow-[0_35px_45px_rgba(0,0,0,0.55)]"
              />
            </div>

            {/* Floating spec chips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="glass absolute bottom-6 left-6 rounded-2xl px-4 py-3"
            >
              <p className="text-[11px] uppercase tracking-wide text-faint">Featured</p>
              <p className="text-sm font-bold text-white">{hero.name}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.6 }}
              className="glass absolute right-6 top-6 rounded-2xl px-4 py-3 text-center"
            >
              <p className="brand-gradient-text text-lg font-black">4.9★</p>
              <p className="text-[11px] text-faint">Rated by buyers</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
