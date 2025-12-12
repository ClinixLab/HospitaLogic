import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "getAppointments") {
    // query appoint upto doctor_id
    const doctorId = parseInt(body.id);
    const appointments = await prisma.appointment.findMany({
      where: { doctor_id: doctorId },
      include: { doctor: { select: { name: true } } },
      orderBy: { appointment_id: "asc" },
    });
    return NextResponse.json(appointments);
  } else if (body.action === "createAppointment") {
    //create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patient_id: body.patient_id,
        doctor_id: body.doctor_id,
        date: new Date(body.date),
        time: body.time,
        status: body.status,
      },
    });
    return NextResponse.json(appointment);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}








