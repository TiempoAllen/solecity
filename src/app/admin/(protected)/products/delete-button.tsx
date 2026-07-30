"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteProduct } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        start(async () => {
          const res = await deleteProduct(id);
          if (res.ok) {
            toast.success("Product deleted");
            router.refresh();
          } else {
            toast.error(res.error ?? "Delete failed");
          }
        });
      }}
    >
      Delete
    </Button>
  );
}
