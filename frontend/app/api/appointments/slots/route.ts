import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseUuid } from "@/lib/uuid";

const SLOT_MINUTES = 30;

const CLINIC = {
  open: "09:00",
  close: "16:30",
  lunchStart: "12:00",
  lunchEnd: "13:00",
};

function toMinutes(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}
function toTimeStr(mins: number) {
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function startOfDayLocal(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`);
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function sameLocalYMD(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function next30MinFromNowMinutes(now: Date) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin % 30 === 0 ? nowMin : nowMin + (30 - (nowMin % 30));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const doctorRaw = searchParams.get("doctor_id");
  const doctor_id = parseUuid(doctorRaw); 

  const date = searchParams.get("date"); 

  if (!doctor_id || !date) {
    return NextResponse.json({ message: "doctor_id (uuid) and date are required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ message: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const dayStart = startOfDayLocal(date);
  const dayEnd = addDays(dayStart, 1);

  const booked = await prisma.appointment.findMany({
    where: {
      doctor_id, 
      date: { gte: dayStart, lt: dayEnd },
      status: { notIn: ["CANCELLED"] },
    },
    select: { time: true },
  });

  const bookedSet = new Set(booked.map((b) => b.time));

  const openMin = toMinutes(CLINIC.open);
  const closeMin = toMinutes(CLINIC.close);
  const lunchStartMin = toMinutes(CLINIC.lunchStart);
  const lunchEndMin = toMinutes(CLINIC.lunchEnd);

  const now = new Date();
  const minAllowed =
    sameLocalYMD(dayStart, now) ? Math.max(openMin, next30MinFromNowMinutes(now)) : openMin;

  const slots: { time: string }[] = [];
  for (let m = minAllowed; m + SLOT_MINUTES <= closeMin; m += SLOT_MINUTES) {
    if (m >= lunchStartMin && m < lunchEndMin) continue;

    const t = toTimeStr(m);
    if (!bookedSet.has(t)) slots.push({ time: t });
  }

  return NextResponse.json({ doctor_id, date, slots });
}