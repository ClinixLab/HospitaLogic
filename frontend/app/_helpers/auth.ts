import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function requireLogin() {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false as const, status: 401, message: "Unauthorized" };

  const user = session.user as any;
  const user_id = Number(user?.user_id);
  const username = user?.username;

  const login = await prisma.login.findFirst({
    where: user_id
      ? { user_id }
      : username
      ? { username }
      : { user_id: -999999 },
    select: { user_id: true, role: true, patient_id: true, doctor_id: true, username: true },
  });

  if (!login) return { ok: false as const, status: 401, message: "Login not found for session" };
  return { ok: true as const, session, login };
}