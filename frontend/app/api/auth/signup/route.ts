// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { Role } from "@/app/generated/prisma/client";

const ALLOWED_ROLES = new Set<Role>([
  Role.PATIENT,
  Role.DOCTOR,
]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const role = body.role as Role;

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json({ error: "username ต้องยาว 3-30 ตัว" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "password ต้องยาวอย่างน้อย 8 ตัว" }, { status: 400 });
    }
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "role ไม่ถูกต้อง" }, { status: 400 });
    }

    const existed = await prisma.login.findUnique({ where: { username } });
    if (existed) {
      return NextResponse.json({ error: "username ถูกใช้แล้ว" }, { status: 409 });
    }

    const hashed = await hashPassword(password);

    const created = await prisma.login.create({
      data: {
        username,
        hashed_password: hashed,
        role,
        // patient_id/doctor_id ค่อยผูกทีหลังได้
      },
      select: { user_id: true, username: true, role: true },
    });

    return NextResponse.json({ ok: true, user: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
