import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseUuid } from "@/lib/uuid";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const doctorRaw = searchParams.get("doctor_id");
  const doctor_id = doctorRaw ? parseUuid(doctorRaw) : null;

  const specialtyRaw = searchParams.get("specialty_id");
  const specialty_id = specialtyRaw ? Number(specialtyRaw) : null;

  const deptRaw = searchParams.get("department_id");
  const department_id = deptRaw ? Number(deptRaw) : null;

  if (doctorRaw && !doctor_id) {
    return NextResponse.json({ message: "doctor_id invalid (uuid)" }, { status: 400 });
  }
  if (specialtyRaw && (!specialty_id || Number.isNaN(specialty_id))) {
    return NextResponse.json({ message: "specialty_id invalid" }, { status: 400 });
  }
  if (deptRaw && (!department_id || Number.isNaN(department_id))) {
    return NextResponse.json({ message: "department_id invalid" }, { status: 400 });
  }

  // single
  if (doctor_id) {
    const doctor = await prisma.doctor.findUnique({
      where: { doctor_id },
      select: {
        doctor_id: true,
        name: true,
        phone: true,
        department: { select: { department_id: true, name: true, location: true } },
        specialty: { select: { specialty_id: true, name: true, description: true } },
      },
    });
    if (!doctor) return NextResponse.json({ message: "doctor not found" }, { status: 404 });
    return NextResponse.json({ doctor });
  }

  // list (filter by dept / specialty)
  const where: any = {};
  if (department_id) where.department_id = department_id;
  if (specialty_id) where.specialty_id = specialty_id;

  const doctors = await prisma.doctor.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      doctor_id: true,
      name: true,
      phone: true,
      department: { select: { department_id: true, name: true } },
      specialty: { select: { specialty_id: true, name: true } }, // ✅ ส่งกลับ specialty ชื่อด้วย
    },
  });

  return NextResponse.json({ doctors });
}
