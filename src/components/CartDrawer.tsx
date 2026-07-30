"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { GlassButton } from "@/components/ui/Glass";
import { CloseIcon, PlusIcon, MinusIcon, BagIcon, TruckIcon } from "@/components/icons";
import { ShoeArt } from "@/components/ShoeArt";
import { formatPHP } from "@/lib/utils";

const SHIPPING_THRESHOLD = 5000;

export function CartDrawer() {
  const { isOpen, close, lines, subtotal, count, remove, setQty, clear } = useCart();
  const freeShip = subtotal >= SHIPPING_THRESHOLD || subtotal === 0;
  const remaining = Math.max(0, SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / SHIPPING_THRESHOLD) * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="glass-strong glass-specular fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col rounded-l-3xl"
            role="dialog"
            aria-label="Shopping bag"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-2">
                <BagIcon className="h-5 w-5 text-[--color-brand-3]" />
                <h2 className="text-lg font-bold">
                  Your Bag{" "}
                  <span className="text-sm font-medium text-muted">({count})</span>
                </h2>
              </div>
              <button
                onClick={close}
                aria-label="Close cart"
                className="grid h-9 w-9 place-items-center rounded-full transition-glass hover:bg-white/10"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Shipping progress */}
            {lines.length > 0 && (
              <div className="border-b border-white/10 px-5 py-4">
                <p className="flex items-center gap-2 text-xs text-muted">
                  <TruckIcon className="h-4 w-4 text-[--color-brand-2]" />
                  {freeShip ? (
                    <span className="text-white">You’ve unlocked free nationwide shipping! 🎉</span>
                  ) : (
                    <span>
                      Add <span className="font-semibold text-white">{formatPHP(remaining)}</span>{" "}
                      more for free shipping
                    </span>
                  )}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[--color-brand] to-[--color-brand-2]"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
                  />
                </div>
              </div>
            )}

            {/* Lines */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {lines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="grid h-20 w-20 place-items-center rounded-full glass">
                    <BagIcon className="h-8 w-8 text-muted" />
                  </div>
                  <p className="text-lg font-semibold">Your bag is empty</p>
                  <p className="max-w-[220px] text-sm text-muted">
                    Time to find your next pair. Explore the SOLECITY drop.
                  </p>
                  <GlassButton onClick={close} className="mt-2">
                    Start shopping
                  </GlassButton>
                </div>
              ) : (
                <ul className="space-y-3">
                  <AnimatePresence initial={false}>
                    {lines.map((line) => (
                      <motion.li
                        key={`${line.slug}-${line.size}`}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, x: 40, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="glass flex gap-3 rounded-2xl p-3"
                      >
                        <div
                          className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-xl"
                          style={{
                            background: `linear-gradient(135deg, ${line.gradient.from}44, ${line.gradient.to}44)`,
                          }}
                        >
                          <ShoeArt
                            seed={`cart-${line.slug}-${line.size}`}
                            from={line.gradient.from}
                            to={line.gradient.to}
                            accent={line.gradient.accent}
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {line.name}
                              </p>
                              <p className="text-xs text-muted">
                                {line.brand} · US {line.size}
                              </p>
                            </div>
                            <button
                              onClick={() => remove(line.slug, line.size)}
                              aria-label="Remove item"
                              className="text-xs text-faint transition-colors hover:text-white"
                            >
                              <CloseIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center gap-1 rounded-full glass px-1">
                              <button
                                onClick={() => setQty(line.slug, line.size, line.qty - 1)}
                                aria-label="Decrease quantity"
                                className="grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-white/10"
                              >
                                <MinusIcon className="h-4 w-4" />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold">
                                {line.qty}
                              </span>
                              <button
                                onClick={() => setQty(line.slug, line.size, line.qty + 1)}
                                aria-label="Increase quantity"
                                className="grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-white/10"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <span className="text-sm font-bold text-white">
                              {formatPHP(line.price * line.qty)}
                            </span>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer */}
            {lines.length > 0 && (
              <div className="border-t border-white/10 p-5">
                <div className="mb-1 flex items-center justify-between text-sm text-muted">
                  <span>Subtotal</span>
                  <span className="text-lg font-black text-white">{formatPHP(subtotal)}</span>
                </div>
                <p className="mb-4 text-xs text-faint">
                  Taxes calculated at checkout · Ships nationwide from Cebu City
                </p>
                <GlassButton className="w-full">Checkout · {formatPHP(subtotal)}</GlassButton>
                <button
                  onClick={clear}
                  className="mt-3 w-full text-center text-xs text-faint transition-colors hover:text-white"
                >
                  Clear bag
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
