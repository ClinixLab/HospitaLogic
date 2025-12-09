import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const treatments = await prisma.treatment.findMany({
    include: {
      patient: true,
      doctor: true,
      diagnosis: true,
    },
    orderBy: { treatment_id: "asc" },
  });
  return NextResponse.json(treatments);
}
