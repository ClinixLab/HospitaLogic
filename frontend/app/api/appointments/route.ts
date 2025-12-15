import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import { parseUuid } from "@/lib/uuid";

/* ===================== Utils ===================== */

const CLINIC = {
  open: "09:00",
  close: "16:30",
  lunchStart: "12:00",
  lunchEnd: "13:00",
};

function normalizeDateOnly(dateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toMinutes(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

function isValidTimeHHmm_30min(t: string) {
  if (!/^\d{2}:\d{2}$/.test(t)) return false;
  const [, mm] = t.split(":").map(Number);
  return mm === 0 || mm === 30;
}

function isClinicSlot(t: string) {
  const m = toMinutes(t);
  const open = toMinutes(CLINIC.open);
  const close = toMinutes(CLINIC.close);
  const ls = toMinutes(CLINIC.lunchStart);
  const le = toMinutes(CLINIC.lunchEnd);

  if (m < open) return false;
  if (m + 30 > close) return false;
  if (m >= ls && m < le) return false;
  return true;
}

function sameLocalYMD(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isPastSlot(dateOnly: Date, timeHHmm: string) {
  const now = new Date();
  if (!sameLocalYMD(dateOnly, now)) return false;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextSlot = Math.ceil(nowMin / 30) * 30;
  return toMinutes(timeHHmm) < nextSlot;
}

async function getAuthed() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const u = session.user as any;
  const rawId = u?.user_id ?? u?.id;
  const uid = rawId ? parseUuid(String(rawId)) : null;
  const role = String(u?.role ?? "").toUpperCase();

  if (!uid || !role) return null;
  return { uid, role };
}

/* ===================== GET ===================== */

export async function GET() {
  const auth = await getAuthed();
  if (!auth)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { uid, role } = auth;

  /* ---------- PATIENT ---------- */
  if (role === "PATIENT") {
    const appointments = await prisma.appointment.findMany({
      where: { patient_id: uid },
      orderBy: [{ date: "desc" }, { time: "desc" }],
      select: {
        appointment_id: true,
        date: true,
        time: true,
        status: true,
        symptom: true,
        doctor: {
          select: {
            name: true,
            specialty: {
              select: { name: true },
            },
            department: {
              select: {
                name: true,
                location: true, // ✅ สำคัญ (ใช้ในหน้า appointment)
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ appointments });
  }

  /* ---------- DOCTOR ---------- */
  if (role === "DOCTOR") {
    const appointments = await prisma.appointment.findMany({
      where: { doctor_id: uid },
      orderBy: [{ date: "desc" }, { time: "desc" }],
      select: {
        appointment_id: true,
        date: true,
        time: true,
        status: true,
        symptom: true,
        patient: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({ appointments });
  }

  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

/* ===================== POST ===================== */

export async function POST(req: Request) {
  const auth = await getAuthed();
  if (!auth)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { uid: patient_id, role } = auth;
  if (role !== "PATIENT")
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  const doctor_id = parseUuid(body.doctor_id);
  const date = normalizeDateOnly(String(body.date ?? ""));
  const time = String(body.time ?? "");
  const symptom = String(body.symptom ?? body.symptoms ?? "").trim();

  if (!doctor_id || !date || !symptom) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  if (
    !isValidTimeHHmm_30min(time) ||
    !isClinicSlot(time) ||
    isPastSlot(date, time)
  ) {
    return NextResponse.json(
      { message: "Invalid time slot" },
      { status: 400 }
    );
  }

  if (symptom.length > 2000) {
    return NextResponse.json(
      { message: "symptom too long" },
      { status: 400 }
    );
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        patient_id,
        doctor_id,
        date,
        time,
        status: "PENDING",
        symptom,
      },
      select: {
        appointment_id: true,
        date: true,
        time: true,
        status: true,
        symptom: true,
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Timeslot already booked" },
        { status: 409 }
      );
    }

    console.error("POST /api/appointments error:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
