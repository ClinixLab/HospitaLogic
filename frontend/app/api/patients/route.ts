import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const patients = await prisma.patient.findMany({
    orderBy: { patient_id: "asc" },
  });
  return NextResponse.json(patients);
}

export async function POST(req: Request) {
  const data = await req.json(); // { name, gender, phone }
  const patient = await prisma.patient.create({ data });
  return NextResponse.json(patient);
}
