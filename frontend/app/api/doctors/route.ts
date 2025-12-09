import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const doctors = await prisma.doctor.findMany({
    include: {
      department: true,
      specialty: true,
    },
    orderBy: { doctor_id: "asc" },
  });
  return NextResponse.json(doctors);
}
