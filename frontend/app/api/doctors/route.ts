import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const specialty_id = searchParams.get("specialty_id")
    ? Number(searchParams.get("specialty_id"))
    : null;

  const doctor_id = searchParams.get("doctor_id")
    ? Number(searchParams.get("doctor_id"))
    : null;

  if (doctor_id && Number.isNaN(doctor_id)) {
    return NextResponse.json({ message: "doctor_id invalid" }, { status: 400 });
  }
  if (specialty_id && Number.isNaN(specialty_id)) {
    return NextResponse.json({ message: "specialty_id invalid" }, { status: 400 });
  }

  // หมอคนเดียว
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
    return NextResponse.json({ doctor });
  }

  // list
  const doctors = await prisma.doctor.findMany({
    where: specialty_id ? { specialty_id } : {},
    orderBy: { name: "asc" },
    select: {
      doctor_id: true,
      name: true,
      phone: true,
      department: { select: { department_id: true, name: true } },
      specialty: { select: { specialty_id: true, name: true } },
    },
  });

  return NextResponse.json({ doctors });
}
