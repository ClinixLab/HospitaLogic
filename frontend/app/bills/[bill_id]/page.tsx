import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function BillRedirectPage({ params }: { params: { bill_id: string } }) {
  const id = params?.bill_id ?? "";
  if (!id) redirect("/bills");
  redirect(`/bills?open=${encodeURIComponent(id)}`);
}