import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/appointment/doctor/:id
export async function GET(request, { params }) {
  const doctorId = parseInt(params.id);

  const appointments = await prisma.appointment.findMany({
    where: {
      doctor_id: doctorId,
    },
    include: {
      doctor: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { appointment_id: "asc" },
  });

  return NextResponse.json(appointments);
}

