import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { parseUuid } from "@/lib/uuid";

/**
 * PUT /api/appointments/:id
 * body: { status: "CANCELLED" }
 */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  /* ---------- get id ---------- */
  const { id } = await ctx.params;
  const appointment_id = Number(id);

  if (Number.isNaN(appointment_id)) {
    return NextResponse.json(
      { message: "Invalid appointment id" },
      { status: 400 }
    );
  }

  /* ---------- auth ---------- */
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const patient_id = parseUuid((session.user as any).id);
  const role = (session.user as any).role;

  if (!patient_id || role !== "PATIENT") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  /* ---------- body ---------- */
  const body = await req.json().catch(() => null);
  const nextStatus = body?.status;

  if (nextStatus !== "CANCELLED") {
    return NextResponse.json(
      { message: "Invalid status update" },
      { status: 400 }
    );
  }

  /* ---------- find appointment ---------- */
  const appointment = await prisma.appointment.findUnique({
    where: { appointment_id },
    select: {
      patient_id: true,
      status: true,
    },
  });

  if (!appointment) {
    return NextResponse.json(
      { message: "Appointment not found" },
      { status: 404 }
    );
  }

  /* ---------- ownership ---------- */
  if (appointment.patient_id !== patient_id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  /* ---------- business rule ---------- */
  if (appointment.status !== "PENDING") {
    return NextResponse.json(
      { message: "Only PENDING appointment can be cancelled" },
      { status: 400 }
    );
  }

  /* ---------- update ---------- */
  const updated = await prisma.appointment.update({
    where: { appointment_id },
    data: { status: "CANCELLED" },
    select: {
      appointment_id: true,
      status: true,
    },
  });

  return NextResponse.json({
    message: "Appointment cancelled",
    appointment: updated,
  });
}
