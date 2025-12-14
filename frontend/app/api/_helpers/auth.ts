// app/api/_helpers/auth.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

type Role = "PATIENT" | "DOCTOR" | "PHARMACIST" | "FINANCE" | string;

export async function requireLogin() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { ok: false as const, status: 401 as const, message: "Unauthorized" };
  }

  const u = session.user as any;

  // ✅ auth ใหม่: UUID string (ห้าม Number())
  const user_id: string | null = u?.user_id ? String(u.user_id) : u?.id ? String(u.id) : null;
  const username: string | null = u?.username ? String(u.username) : null;

  if (!user_id && !username) {
    return { ok: false as const, status: 401 as const, message: "Unauthorized (missing user id)" };
  }

  const login = await prisma.login.findFirst({
    where: user_id ? { user_id } : { username: username! },
    // ✅ ห้าม select patient_id/doctor_id เพราะไม่มีใน schema แล้ว
    select: { user_id: true, username: true, role: true },
  });

  if (!login) {
    return { ok: false as const, status: 401 as const, message: "Unauthorized (login not found)" };
  }

  const role = String(login.role || "").toUpperCase() as Role;

  // ✅ “ทำให้เหมือนเดิม” สำหรับโค้ดเก่าที่ชอบเรียก auth.login.patient_id / doctor_id
  const enrichedLogin = {
    ...login,
    patient_id: role === "PATIENT" ? login.user_id : null,
    doctor_id: role === "DOCTOR" ? login.user_id : null,
  };

  return { ok: true as const, status: 200 as const, login: enrichedLogin, session };
}
