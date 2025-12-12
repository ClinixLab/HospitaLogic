import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

function isValidDate(d: Date) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as "PATIENT" | "DOCTOR";
  const patient_id = (session.user as any).patient_id as number | null;
  const doctor_id = (session.user as any).doctor_id as number | null;

  if (role === "PATIENT") {
    if (!patient_id) return NextResponse.json({ message: "Forbidden (missing patient_id)" }, { status: 403 });

    const patient = await prisma.patient.findUnique({
      where: { patient_id: Number(patient_id) },
      select: {
        patient_id: true,
        name: true,
        gender: true,
        phone: true,
        pii: { select: { DOB: true, address: true } },
      },
    });

    return NextResponse.json({ role, profile: patient });
  }

  if (role === "DOCTOR") {
    if (!doctor_id) return NextResponse.json({ message: "Forbidden (missing doctor_id)" }, { status: 403 });

    const doctor = await prisma.doctor.findUnique({
      where: { doctor_id: Number(doctor_id) },
      select: {
        doctor_id: true,
        name: true,
        phone: true,
        department_id: true,
        specialty_id: true,
        department: { select: { department_id: true, name: true } },
        specialty: { select: { specialty_id: true, name: true } },
      },
    });

    return NextResponse.json({ role, profile: doctor });
  }

  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as "PATIENT" | "DOCTOR";
  const patient_id = (session.user as any).patient_id as number | null;
  const doctor_id = (session.user as any).doctor_id as number | null;

  const body = await req.json().catch(() => null);

  // ---------------- PATIENT ----------------
  if (role === "PATIENT") {
    if (!patient_id) return NextResponse.json({ message: "Forbidden (missing patient_id)" }, { status: 403 });

    // schema Patient ต้องมี name, gender, phone
    const name = String(body?.name ?? "").trim();
    const gender = String(body?.gender ?? "").trim();
    const phone = String(body?.phone ?? "").trim();

    if (!name || !gender || !phone) {
      return NextResponse.json({ message: "name, gender, phone are required" }, { status: 400 });
    }

    // PII เป็น optional record แต่ถ้าจะสร้าง/แก้ ต้องมี DOB+address ครบ
    const dobRaw = body?.DOB ? new Date(body.DOB) : null; // รับ ISO string
    const address = typeof body?.address === "string" ? body.address.trim() : "";

    const wantsPII = !!body?.pii_enabled; // ให้หน้า settings ส่ง boolean มาด้วย
    if (wantsPII) {
      if (!dobRaw || !isValidDate(dobRaw) || !address) {
        return NextResponse.json({ message: "DOB and address are required when PII is enabled" }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.update({
        where: { patient_id: Number(patient_id) },
        data: { name, gender, phone },
        select: { patient_id: true, name: true, gender: true, phone: true },
      });

      let pii = null as null | { DOB: Date; address: string };

      if (wantsPII) {
        pii = await tx.patientPII.upsert({
          where: { patient_id: Number(patient_id) },
          update: { DOB: dobRaw!, address },
          create: { patient_id: Number(patient_id), DOB: dobRaw!, address },
          select: { DOB: true, address: true },
        });
      }

      return { patient, pii };
    });

    return NextResponse.json({ message: "updated", role, ...updated });
  }

  // ---------------- DOCTOR ----------------
  if (role === "DOCTOR") {
    if (!doctor_id) return NextResponse.json({ message: "Forbidden (missing doctor_id)" }, { status: 403 });

    // schema Doctor ต้องมี name, phone, department_id, specialty_id
    const name = String(body?.name ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const department_id = Number(body?.department_id);
    const specialty_id = Number(body?.specialty_id);

    if (!name || !phone) {
      return NextResponse.json({ message: "name and phone are required" }, { status: 400 });
    }
    if (!department_id || Number.isNaN(department_id)) {
      return NextResponse.json({ message: "department_id is required" }, { status: 400 });
    }
    if (!specialty_id || Number.isNaN(specialty_id)) {
      return NextResponse.json({ message: "specialty_id is required" }, { status: 400 });
    }

    // validate FK exist
    const [dep, spec] = await Promise.all([
      prisma.department.findUnique({ where: { department_id }, select: { department_id: true } }),
      prisma.specialty.findUnique({ where: { specialty_id }, select: { specialty_id: true } }),
    ]);

    if (!dep) return NextResponse.json({ message: "department_id not found" }, { status: 400 });
    if (!spec) return NextResponse.json({ message: "specialty_id not found" }, { status: 400 });

    const doctor = await prisma.doctor.update({
      where: { doctor_id: Number(doctor_id) },
      data: { name, phone, department_id, specialty_id },
      select: {
        doctor_id: true,
        name: true,
        phone: true,
        department_id: true,
        specialty_id: true,
        department: { select: { department_id: true, name: true } },
        specialty: { select: { specialty_id: true, name: true } },
      },
    });

    return NextResponse.json({ message: "updated", role, doctor });
  }

  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}
