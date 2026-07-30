import { cn } from "@/lib/utils";
import type { ElementType, ReactNode } from "react";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  specular?: boolean;
  as?: ElementType;
};

/**
 * GlassPanel — the shared frosted-glass surface used across SOLECITY.
 * Composes the `.glass` / `.glass-strong` utilities plus an optional
 * specular edge highlight for the liquid-glass look.
 */
export function GlassPanel({
  children,
  className,
  strong = false,
  specular = true,
  as: Tag = "div",
}: GlassPanelProps) {
  return (
    <Tag
      className={cn(
        "rounded-3xl",
        strong ? "glass-strong" : "glass",
        specular && "glass-specular",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

type GlassButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "ghost";
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

/** GlassButton — glass-styled button, primary (brand gradient) or ghost. */
export function GlassButton({
  children,
  className,
  variant = "primary",
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-semibold tracking-wide transition-glass",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brand] focus-visible:ring-offset-2 focus-visible:ring-offset-[--color-void]",
        variant === "primary"
          ? "text-white shadow-[0_8px_30px_-8px_var(--color-accent-glow)] hover:shadow-[0_12px_40px_-6px_var(--color-accent-glow)]"
          : "glass text-foreground hover:bg-white/10",
        className,
      )}
      {...props}
    >
      {variant === "primary" && (
        <span className="absolute inset-0 -z-10 bg-gradient-to-r from-[--color-brand] via-[--color-brand-3] to-[--color-brand-2] transition-transform duration-500 group-hover:scale-110" />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

type GlassBadgeProps = {
  children: ReactNode;
  className?: string;
};

/** GlassBadge — small pill label used for tags and eyebrow text. */
export function GlassBadge({ children, className }: GlassBadgeProps) {
  return (
    <span
      className={cn(
        "glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tracking-wide text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
