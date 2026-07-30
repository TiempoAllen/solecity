"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/** Shared "glass" easing curve, typed as a cubic-bezier tuple for Framer Motion. */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const directionOffset = {
  up: { y: 28, x: 0 },
  down: { y: -28, x: 0 },
  left: { x: 28, y: 0 },
  right: { x: -28, y: 0 },
  none: { x: 0, y: 0 },
} as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: keyof typeof directionOffset;
  once?: boolean;
};

/** Reveal — Framer Motion entrance: fades + slides children in on scroll. */
export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.7,
  direction = "up",
  once = true,
}: RevealProps) {
  const offset = directionOffset[direction];
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/** Container that staggers the entrance of its <Stagger.Item> children. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.65, ease: EASE_OUT },
  },
};

type StaggerProps = {
  children: ReactNode;
  className?: string;
  once?: boolean;
};

export function Stagger({ children, className, once = true }: StaggerProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
