// app/bills/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import BillsClient from "./BillsClient";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/bills");

  const user = session.user as any;
  const userId = Number(user?.user_id);
  const username = user?.username;

  const login = await prisma.login.findFirst({
    where: Number.isFinite(userId) ? { user_id: userId } : { username },
    select: { patient_id: true, username: true },
  });

  if (!login?.patient_id) redirect("/");

  return <BillsClient me={{ username: login.username, patient_id: login.patient_id }} />;
}
