import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import { parseUuid } from "@/lib/uuid"; 

const CLINIC = {
  open: "09:00",
  close: "16:30",
  lunchStart: "12:00",
  lunchEnd: "13:00",
};

function normalizeDateOnly(dateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toMinutes(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

function isValidTimeHHmm_30min(t: string) {
  if (!/^\d{2}:\d{2}$/.test(t)) return false;
  const [hh, mm] = t.split(":").map(Number);
  if (hh < 0 || hh > 23) return false;
  if (mm !== 0 && mm !== 30) return false;
  return true;
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

// กันจองเวลาย้อนหลัง: ถ้าวันนี้ ต้อง >= “รอบถัดไป” (ปัดขึ้นครึ่งชั่วโมง)
function isPastSlot(dateOnly: Date, timeHHmm: string) {
  const now = new Date();
  if (!sameLocalYMD(dateOnly, now)) return dateOnly.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextSlot = nowMin % 30 === 0 ? nowMin : nowMin + (30 - (nowMin % 30));
  return toMinutes(timeHHmm) < nextSlot;
}

async function getAuthed() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const uid = parseUuid((session.user as any).id ?? null); // UUID string
  if (!uid) return null;

  const role = (session.user as any).role as "PATIENT" | "DOCTOR" | undefined;
  if (!role) return null;

  return { uid, role };
}

export async function GET() {
  const auth = await getAuthed();
  if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { uid, role } = auth;

  // patient -> ดูของตัวเอง
  if (role === "PATIENT") {
    const appointments = await prisma.appointment.findMany({
      where: { patient_id: uid }, // ✅ string uuid
      orderBy: [{ date: "desc" }, { time: "desc" }],
      select: {
        appointment_id: true,
        date: true,
        time: true,
        status: true,
        doctor: {
          select: {
            doctor_id: true,
            name: true,
            specialty: { select: { name: true } },
          },
        },
      },
    });
    return NextResponse.json({ appointments });
  }

  // doctor -> ดูของตัวเอง
  if (role === "DOCTOR") {
    const appointments = await prisma.appointment.findMany({
      where: { doctor_id: uid }, // ✅ string uuid
      orderBy: [{ date: "desc" }, { time: "desc" }],
      select: {
        appointment_id: true,
        date: true,
        time: true,
        status: true,
        patient: { select: { patient_id: true, name: true, phone: true } },
      },
    });
    return NextResponse.json({ appointments });
  }

  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  const auth = await getAuthed(); // ของคุณต้องมีอยู่แล้วจากไฟล์ล่าสุด
  if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { uid: patient_id, role } = auth;
  if (role !== "PATIENT") {
    return NextResponse.json({ message: "Forbidden (role must be PATIENT)" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const doctor_id = parseUuid(body?.doctor_id ?? null); // ✅ UUID
  const dateStr = String(body?.date ?? "");
  const timeStr = String(body?.time ?? "");
  const symptoms = typeof body?.symptoms === "string" ? body.symptoms.trim() : "";

  // optional (ถ้าหน้ายังส่งมาก็รับไว้)
  const specialty_id = body?.specialty_id ? Number(body.specialty_id) : null;

  if (!doctor_id) return NextResponse.json({ message: "doctor_id is required (uuid)" }, { status: 400 });
  if (!symptoms) return NextResponse.json({ message: "symptoms is required" }, { status: 400 });

  const date = normalizeDateOnly(dateStr);
  if (!date) return NextResponse.json({ message: "date must be YYYY-MM-DD" }, { status: 400 });

  if (!isValidTimeHHmm_30min(timeStr) || !isClinicSlot(timeStr)) {
    return NextResponse.json({ message: "time invalid (must be clinic 30-min slot)" }, { status: 400 });
  }

  if (isPastSlot(date, timeStr)) {
    return NextResponse.json({ message: "time is in the past" }, { status: 400 });
  }

  // ✅ validate ว่าหมอมีจริง + (ถ้ามี specialty_id ส่งมา) ต้องตรงกัน
  const doctor = await prisma.doctor.findUnique({
    where: { doctor_id },
    select: { doctor_id: true, specialty_id: true },
  });
  if (!doctor) {
    return NextResponse.json({ message: "Doctor not found" }, { status: 400 });
  }
  if (specialty_id && doctor.specialty_id !== specialty_id) {
    return NextResponse.json({ message: "Doctor not in selected specialty" }, { status: 400 });
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        patient_id, // ✅ string uuid
        doctor_id,  // ✅ string uuid
        date,
        time: timeStr,
        status: "PENDING",
      },
      select: { appointment_id: true, status: true, doctor_id: true, date: true, time: true },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ message: "Timeslot already booked" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
