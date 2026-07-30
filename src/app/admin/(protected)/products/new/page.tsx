import { ProductForm } from "../product-form";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">New product</h1>
      <div className="mt-6"><ProductForm initial={null} /></div>
    </div>
  );
}
