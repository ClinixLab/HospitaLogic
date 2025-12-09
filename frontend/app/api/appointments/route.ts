import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const appointments = await prisma.appointment.findMany({
    include: {
      patient: true,
      doctor: true,
    },
    orderBy: { appointment_id: "asc" },
  });
  return NextResponse.json(appointments);
}
