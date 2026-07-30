import { Confirmation } from "./confirmation";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Confirmation orderNumber={orderNumber} />
    </div>
  );
}
