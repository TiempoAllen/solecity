"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveProduct, type ProductInput } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

type Props = { initial: (ProductInput & { id: string }) | null };

const EMPTY: ProductInput = {
  slug: "", name: "", brand: "", category: "ANTA", price: 0, original_price: null,
  availability: "On Hand", colorway: "", rating: 0, reviews: 0, authentic: true,
  tagline: "", description: "", sizes: [], gradient: { from: "#7c3aed", to: "#4f1d96", accent: "rgba(255,255,255,0.9)" },
  featured: false,
};

const CATEGORIES = ["ANTA", "Basketball", "Under Armour", "Clogs"];
const AVAILABILITY = ["On Hand", "Pre-Order"];

export function ProductForm({ initial }: Props) {
  const [form, setForm] = useState<ProductInput>(initial ?? EMPTY);
  const [sizesText, setSizesText] = useState((initial?.sizes ?? []).join(", "));
  const [pending, start] = useTransition();
  const router = useRouter();

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    const sizes = sizesText.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
    const payload: ProductInput = { ...form, sizes, id: initial?.id };
    start(async () => {
      const res = await saveProduct(payload);
      if (res.ok) {
        toast.success(initial ? "Product updated" : "Product created");
        router.push("/admin/products");
        router.refresh();
      } else {
        toast.error(res.error ?? "Save failed");
      }
    });
  }

  const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1"><span className="text-sm font-medium">Slug</span>
          <input className={input} value={form.slug} onChange={(e) => set("slug", e.target.value)} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Name</span>
          <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Brand</span>
          <input className={input} value={form.brand} onChange={(e) => set("brand", e.target.value)} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Category</span>
          <select className={input} value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
        <label className="space-y-1"><span className="text-sm font-medium">Price (₱)</span>
          <input type="number" className={input} value={form.price} onChange={(e) => set("price", Number(e.target.value))} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Original price (₱, blank = none)</span>
          <input type="number" className={input} value={form.original_price ?? ""} onChange={(e) => set("original_price", e.target.value === "" ? null : Number(e.target.value))} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Availability</span>
          <select className={input} value={form.availability} onChange={(e) => set("availability", e.target.value)}>
            {AVAILABILITY.map((a) => <option key={a} value={a}>{a}</option>)}
          </select></label>
        <label className="space-y-1"><span className="text-sm font-medium">Colorway</span>
          <input className={input} value={form.colorway} onChange={(e) => set("colorway", e.target.value)} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Rating (0–5)</span>
          <input type="number" step="0.1" className={input} value={form.rating} onChange={(e) => set("rating", Number(e.target.value))} /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Reviews</span>
          <input type="number" className={input} value={form.reviews} onChange={(e) => set("reviews", Number(e.target.value))} /></label>
      </div>

      <label className="space-y-1 block"><span className="text-sm font-medium">Sizes (comma-separated)</span>
        <input className={input} value={sizesText} onChange={(e) => setSizesText(e.target.value)} placeholder="7, 7.5, 8, 8.5" /></label>
      <label className="space-y-1 block"><span className="text-sm font-medium">Tagline</span>
        <input className={input} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} /></label>
      <label className="space-y-1 block"><span className="text-sm font-medium">Description</span>
        <textarea className={input} rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="text-sm font-medium">Gradient</legend>
        <label className="space-y-1"><span className="text-xs">From</span>
          <input type="color" className="h-9 w-full" value={form.gradient.from} onChange={(e) => set("gradient", { ...form.gradient, from: e.target.value })} /></label>
        <label className="space-y-1"><span className="text-xs">To</span>
          <input type="color" className="h-9 w-full" value={form.gradient.to} onChange={(e) => set("gradient", { ...form.gradient, to: e.target.value })} /></label>
        <label className="space-y-1"><span className="text-xs">Accent (rgba/hex)</span>
          <input className={input} value={form.gradient.accent} onChange={(e) => set("gradient", { ...form.gradient, accent: e.target.value })} /></label>
      </fieldset>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.authentic} onChange={(e) => set("authentic", e.target.checked)} /> Authentic</label>
      </div>

      <div className="flex gap-3">
        <Button disabled={pending} onClick={submit}>{pending ? "Saving…" : "Save"}</Button>
        <Button variant="outline" onClick={() => router.push("/admin/products")}>Cancel</Button>
      </div>
    </div>
  );
}
