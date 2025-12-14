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

  // ✅ auth ใหม่: user_id / id เป็น UUID string
  const user_id = (user?.user_id ?? user?.id ?? null) as string | null;
  const username = (user?.username ?? null) as string | null;

  if (!user_id && !username) redirect("/login?callbackUrl=/bills");

  const login = await prisma.login.findFirst({
    where: user_id ? { user_id: String(user_id) } : { username: String(username) },
    select: { user_id: true, username: true, role: true },
  });

  // ✅ bills เป็นของคนไข้เท่านั้น
  if (!login || String(login.role).toUpperCase() !== "PATIENT") redirect("/");

  // ✅ ในระบบใหม่: patient_id == login.user_id (uuid)
  return (
    <BillsClient
      me={{
        username: login.username,
        patient_id: login.user_id as any, // ถ้า BillsClient ยัง type เป็น number ให้แก้ type เป็น string ได้เลย
      }}
    />
  );
}
