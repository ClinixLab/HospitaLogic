import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// create appointment
export async function POST(request: Request) {
  const body = await request.json();
  const doctorId = parseInt(body.id);

  const appointments = await prisma.appointment.findMany({
    where: { doctor_id: doctorId },
    include: { doctor: { select: { name: true } } },
    orderBy: { appointment_id: "asc" },
  });

  return NextResponse.json(appointments);
}

// change appointment status

export async function PUT(request: Request) {
  const body = await request.json();
  const appointmentId = body.appointment_id;

  if (!appointmentId) {
    return NextResponse.json(
      { error: "appointment_id is required" },
      { status: 400 }
    );
  }

  try {
    const updatedAppointment = await prisma.appointment.update({
      where: { appointment_id: appointmentId },
      data: {
        // update fill
        status: "complete", 
      },
    });

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update appointment", details: error },
      { status: 500 }
    );
  }
}





