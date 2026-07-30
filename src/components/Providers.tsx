"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/context/CartContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { AmbientBackground } from "@/components/AmbientBackground";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <AmbientBackground />
      <Navbar />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer />
      <CartDrawer />
    </CartProvider>
  );
}
