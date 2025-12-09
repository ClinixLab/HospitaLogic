import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const treatmentId = searchParams.get("treatment_id");

  const where = treatmentId ? { treatment_id: Number(treatmentId) } : {};

  const rows = await prisma.treatmentMedicine.findMany({
    where,
    include: {
      treatment: {
        include: { patient: true, doctor: true },
      },
      medicine: true,
    },
    orderBy: { treatment_medicine_id: "asc" },
  });

  return NextResponse.json(rows);
}
