import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { parseUuid } from "@/lib/uuid";

/* ======================================================
   GET /api/profile
   ใช้โหลดข้อมูล settings
====================================================== */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = parseUuid((session.user as any).id);
  const role = (session.user as any).role;

  if (!userId || !role) {
    return NextResponse.json({ message: "Invalid session" }, { status: 400 });
  }

  /* ---------- PATIENT ---------- */
  if (role === "PATIENT") {
    const patient = await prisma.patient.findUnique({
      where: { patient_id: userId },
      include: { pii: true },
    });

    if (!patient) {
      return NextResponse.json(
        { message: "Patient profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      role: "PATIENT",
      profile: {
        name: patient.name,
        gender: patient.gender,
        phone: patient.phone,
        pii: patient.pii
          ? {
              DOB: patient.pii.DOB,
              address: patient.pii.address,
            }
          : null,
      },
    });
  }

  /* ---------- DOCTOR ---------- */
  if (role === "DOCTOR") {
    const doctor = await prisma.doctor.findUnique({
      where: { doctor_id: userId },
      select: {
        name: true,
        phone: true,
        department_id: true,
        specialty_id: true,
      },
    });

    if (!doctor) {
      return NextResponse.json(
        { message: "Doctor profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      role: "DOCTOR",
      profile: doctor,
    });
  }

  return NextResponse.json({ message: "Invalid role" }, { status: 400 });
}

/* ======================================================
   PATCH /api/profile
   ใช้บันทึก settings
====================================================== */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = parseUuid((session.user as any).id);
  const role = (session.user as any).role;

  if (!userId || !role) {
    return NextResponse.json({ message: "Invalid session" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  /* ---------- PATIENT ---------- */
  if (role === "PATIENT") {
    const { name, gender, phone, pii_enabled, DOB, address } = body;

    if (!name || !gender || !phone) {
      return NextResponse.json(
        { message: "Missing required patient fields" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // update patient
      await tx.patient.update({
        where: { patient_id: userId },
        data: { name, gender, phone },
      });

      if (pii_enabled) {
        if (!DOB || !address) {
          throw new Error("Missing PII fields");
        }

        await tx.patientPII.upsert({
          where: { patient_id: userId },
          create: {
            patient_id: userId,
            DOB: new Date(DOB),
            address,
          },
          update: {
            DOB: new Date(DOB),
            address,
          },
        });
      } else {
        // ถ้าปิด PII → ลบออก
        await tx.patientPII.deleteMany({
          where: { patient_id: userId },
        });
      }
    });

    return NextResponse.json({ message: "Patient profile updated" });
  }

  /* ---------- DOCTOR ---------- */
  if (role === "DOCTOR") {
    const { name, phone, department_id, specialty_id } = body;

    if (!name || !phone || !department_id || !specialty_id) {
      return NextResponse.json(
        { message: "Missing required doctor fields" },
        { status: 400 }
      );
    }

    await prisma.doctor.update({
      where: { doctor_id: userId },
      data: {
        name,
        phone,
        department_id: Number(department_id),
        specialty_id: Number(specialty_id),
      },
    });

    return NextResponse.json({ message: "Doctor profile updated" });
  }

  return NextResponse.json({ message: "Invalid role" }, { status: 400 });
}
