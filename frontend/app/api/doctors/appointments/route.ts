// app/api/doctors/appointments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLogin } from "@/app/api/_helpers/auth";

function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function startOfDay(ymd: string) {
  return new Date(`${ymd}T00:00:00`);
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export async function GET(req: NextRequest) {
  const auth = await requireLogin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const me = auth.login;
  if (String(me.role || "").toUpperCase() !== "DOCTOR") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = String(url.searchParams.get("status") || "").toUpperCase(); // PENDING / CONFIRMED / ...
  const date = String(url.searchParams.get("date") || ""); // YYYY-MM-DD
  const wantCount = url.searchParams.get("count") === "1";

  const where: any = { doctor_id: me.user_id };
  if (status) where.status = status;

  if (date) {
    if (!isYMD(date)) return NextResponse.json({ error: "INVALID_DATE" }, { status: 400 });
    const s = startOfDay(date);
    const e = addDays(s, 1);
    where.date = { gte: s, lt: e };
  }

  if (wantCount) {
    const count = await prisma.appointment.count({ where });
    return NextResponse.json({ count });
  }

  const items = await prisma.appointment.findMany({
    where,
    orderBy: [{ date: "asc" }, { time: "asc" }],
    select: {
      appointment_id: true,
      date: true,
      time: true,
      status: true,
      symptom: true, // ✅ สำคัญ
      patient: {
        select: { patient_id: true, name: true, phone: true, gender: true },
      },
    },
  });

  return NextResponse.json({
    items: items.map((a) => ({
      ...a,
      date: a.date.toISOString(),
    })),
  });
}
