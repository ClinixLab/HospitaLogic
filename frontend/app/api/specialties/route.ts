import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dep = searchParams.get("department_id");

  let department_id: number | null = null;
  if (dep) {
    department_id = Number(dep);
    if (!department_id || Number.isNaN(department_id)) {
      return NextResponse.json({ message: "department_id invalid" }, { status: 400 });
    }
  }

  const specialties = await prisma.specialty.findMany({
    where: department_id
      ? { doctors: { some: { department_id } } } // ✅ กรองตามแผนกผ่านหมอ
      : undefined,
    orderBy: { name: "asc" },
    select: { specialty_id: true, name: true, description: true },
  });

  return NextResponse.json({ specialties });
}
