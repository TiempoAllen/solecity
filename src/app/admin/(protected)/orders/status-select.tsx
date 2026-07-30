"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrderStatus } from "@/app/admin/actions";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";

export function StatusSelect({
  id,
  status,
}: {
  id: string;
  status: OrderStatus;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <select
      className="rounded-md border bg-background px-3 py-2 text-sm capitalize disabled:opacity-50"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as OrderStatus;
        start(async () => {
          const res = await updateOrderStatus(id, next);
          if (res.ok) {
            toast.success(`Status updated to ${next}`);
            router.refresh();
          } else {
            toast.error(res.error ?? "Update failed");
          }
        });
      }}
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}
