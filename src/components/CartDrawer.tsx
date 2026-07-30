"use client";

import { Minus, Plus, ShoppingBag, Truck, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { ShoeArt } from "@/components/ShoeArt";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPHP } from "@/lib/utils";

const SHIPPING_THRESHOLD = 5000;

export function CartDrawer() {
  const { isOpen, close, lines, subtotal, count, remove, setQty, clear } = useCart();
  const freeShip = subtotal >= SHIPPING_THRESHOLD || subtotal === 0;
  const remaining = Math.max(0, SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / SHIPPING_THRESHOLD) * 100);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="flex-row items-center gap-2">
          <ShoppingBag className="size-5" />
          <SheetTitle>
            Your Bag{" "}
            <span className="text-sm font-normal text-muted-foreground">({count})</span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Items in your shopping bag
          </SheetDescription>
        </SheetHeader>
        <Separator />

        {lines.length > 0 && (
          <>
            <div className="px-4 py-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="size-4" />
                {freeShip ? (
                  <span className="text-foreground">
                    You&rsquo;ve unlocked free nationwide shipping!
                  </span>
                ) : (
                  <span>
                    Add{" "}
                    <span className="font-semibold text-foreground">
                      {formatPHP(remaining)}
                    </span>{" "}
                    more for free shipping
                  </span>
                )}
              </p>
              <Progress value={progress} className="mt-2" />
            </div>
            <Separator />
          </>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="grid size-16 place-items-center rounded-full bg-muted">
                <ShoppingBag className="size-7 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold">Your bag is empty</p>
              <p className="max-w-[220px] text-sm text-muted-foreground">
                Time to find your next pair. Explore the SOLECITY drop.
              </p>
              <Button onClick={close} className="mt-1">
                Start shopping
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {lines.map((line) => (
                <li
                  key={`${line.slug}-${line.size}`}
                  className="flex gap-3 rounded-lg border p-3"
                >
                  <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                    <ShoeArt
                      seed={`cart-${line.slug}-${line.size}`}
                      from={line.gradient.from}
                      to={line.gradient.to}
                      accent={line.gradient.accent}
                      className="scale-90"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{line.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {line.brand} · US {line.size}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove item"
                        onClick={() => remove(line.slug, line.size)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Decrease quantity"
                          onClick={() => setQty(line.slug, line.size, line.qty - 1)}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums">
                          {line.qty}
                        </span>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Increase quantity"
                          onClick={() => setQty(line.slug, line.size, line.qty + 1)}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatPHP(line.price * line.qty)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <SheetFooter>
            <Separator className="mb-1" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-lg font-bold">{formatPHP(subtotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Taxes calculated at checkout · Ships nationwide from Cebu City
            </p>
            <Button className="w-full">Checkout · {formatPHP(subtotal)}</Button>
            <Button variant="ghost" size="sm" onClick={clear}>
              Clear bag
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
