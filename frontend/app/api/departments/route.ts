import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { department_id: true, name: true, location: true },
  });
  return NextResponse.json({ departments });
}
