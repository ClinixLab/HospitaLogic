import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const specialties = await prisma.specialty.findMany({
    orderBy: { name: "asc" },
    select: { specialty_id: true, name: true, description: true },
  });

  return NextResponse.json({ specialties });
}
