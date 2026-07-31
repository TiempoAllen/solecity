"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ModeToggle } from "@/components/ModeToggle";

const categories = [
  { href: "/products?category=ANTA", label: "ANTA" },
  { href: "/products?category=Basketball", label: "Basketball" },
  { href: "/products?category=Clogs", label: "Clogs" },
];

// Flat link list for the mobile menu (Shop + each category).
const mobileLinks = [{ href: "/products", label: "Shop" }, ...categories];

export function Navbar() {
  const { count, open } = useCart();
  const userEmail = useSupabaseUser();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              S
            </span>
            <span className="text-lg font-bold tracking-tight">SOLECITY</span>
          </Link>

          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink
                  render={<Link href="/products" />}
                  className={navigationMenuTriggerStyle}
                >
                  Shop
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>Categories</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[420px] grid-cols-2 gap-1">
                    {categories.map((category) => (
                      <li key={category.href}>
                        <NavigationMenuLink render={<Link href={category.href} />}>
                          <span className="font-medium text-foreground">
                            {category.label}
                          </span>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Explore the {category.label} category
                          </p>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-1">
          <ModeToggle />

          <Button
            variant="ghost"
            size="icon"
            aria-label="Open cart"
            onClick={open}
            className="relative"
          >
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-5 justify-center rounded-full px-1 tabular-nums">
                {count}
              </Badge>
            )}
          </Button>

          {userEmail ? (
            <Link
              href="/account/orders"
              aria-label="My account"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            >
              <User className="size-5" />
            </Link>
          ) : (
            <Link
              href="/account/login"
              className={cn(buttonVariants({ size: "sm" }), "hidden md:inline-flex")}
            >
              Sign in
            </Link>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open menu"
                  className="md:hidden"
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <ul className="flex flex-col px-2">
                {mobileLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {userEmail ? (
                  <li>
                    <Link
                      href="/account/orders"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      My account
                    </Link>
                  </li>
                ) : (
                  <li>
                    <Link
                      href="/account/login"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Sign in
                    </Link>
                  </li>
                )}
              </ul>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
