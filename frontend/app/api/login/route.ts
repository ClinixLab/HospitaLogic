import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  const user = await prisma.login.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.hashed_password);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // In real app, set secure cookie / JWT. Here we just return basic info.
  await prisma.accessLog.create({
    data: {
      user_id: user.user_id,
      entity_type: "AUTH",
      entity_id: user.user_id,
      action: "LOGIN",
    },
  });

  return NextResponse.json({
    user_id: user.user_id,
    role: user.role,
    username: user.username,
  });
}
