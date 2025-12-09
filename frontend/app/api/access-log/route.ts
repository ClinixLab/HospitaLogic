import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const logs = await prisma.accessLog.findMany({
    include: { user: true },
    orderBy: { access_time: "desc" },
    take: 100,
  });
  return NextResponse.json(logs);
}
