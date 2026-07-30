"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/products";

export type CartLine = {
  slug: string;
  name: string;
  brand: string;
  price: number;
  size: number;
  qty: number;
  gradient: Product["gradient"];
};

type CartState = { lines: CartLine[] };

type CartAction =
  | { type: "add"; product: Product; size: number }
  | { type: "remove"; slug: string; size: number }
  | { type: "qty"; slug: string; size: number; qty: number }
  | { type: "clear" }
  | { type: "hydrate"; lines: CartLine[] };

function keyOf(slug: string, size: number) {
  return `${slug}__${size}`;
}

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { lines: action.lines };
    case "add": {
      const k = keyOf(action.product.slug, action.size);
      const existing = state.lines.find((l) => keyOf(l.slug, l.size) === k);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            keyOf(l.slug, l.size) === k ? { ...l, qty: l.qty + 1 } : l,
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          {
            slug: action.product.slug,
            name: action.product.name,
            brand: action.product.brand,
            price: action.product.price,
            size: action.size,
            qty: 1,
            gradient: action.product.gradient,
          },
        ],
      };
    }
    case "remove":
      return {
        lines: state.lines.filter(
          (l) => keyOf(l.slug, l.size) !== keyOf(action.slug, action.size),
        ),
      };
    case "qty":
      return {
        lines: state.lines
          .map((l) =>
            keyOf(l.slug, l.size) === keyOf(action.slug, action.size)
              ? { ...l, qty: Math.max(0, action.qty) }
              : l,
          )
          .filter((l) => l.qty > 0),
      };
    case "clear":
      return { lines: [] };
    default:
      return state;
  }
}

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (product: Product, size: number) => void;
  remove: (slug: string, size: number) => void;
  setQty: (slug: string, size: number, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "solecity-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lines: [] });
  const [isOpen, setIsOpen] = useState(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", lines: JSON.parse(raw) });
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  // Persist on change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines));
    } catch {
      /* storage unavailable */
    }
  }, [state.lines]);

  const add = useCallback((product: Product, size: number) => {
    dispatch({ type: "add", product, size });
    setIsOpen(true);
  }, []);

  const remove = useCallback(
    (slug: string, size: number) => dispatch({ type: "remove", slug, size }),
    [],
  );

  const setQty = useCallback(
    (slug: string, size: number, qty: number) =>
      dispatch({ type: "qty", slug, size, qty }),
    [],
  );

  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const value = useMemo<CartContextValue>(() => {
    const count = state.lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = state.lines.reduce((n, l) => n + l.qty * l.price, 0);
    return {
      lines: state.lines,
      count,
      subtotal,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add,
      remove,
      setQty,
      clear,
    };
  }, [state.lines, isOpen, add, remove, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
