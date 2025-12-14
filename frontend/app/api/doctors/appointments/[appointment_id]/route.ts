// app/api/doctors/appointments/[appointment_id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLogin } from "@/app/api/_helpers/auth";

async function unwrapParams(p: any) {
  // Next 16: params อาจเป็น Promise
  if (p && typeof p.then === "function") return await p;
  return p;
}

async function getAppointmentId(req: NextRequest, ctx: any) {
  const p = await unwrapParams(ctx?.params);
  let raw: any = p?.appointment_id ?? p?.id;

  // fallback: /api/doctors/appointments/3
  if (!raw) {
    const pathname = new URL(req.url).pathname;
    raw = pathname.split("/").filter(Boolean).pop();
  }

  const appointment_id = Number(raw);
  return { raw, appointment_id };
}

export async function PATCH(req: NextRequest, ctx: any) {
  const auth = await requireLogin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const me = auth.login;
  if (String(me.role || "").toUpperCase() !== "DOCTOR") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { appointment_id } = await getAppointmentId(req, ctx);
  if (!Number.isFinite(appointment_id)) {
    return NextResponse.json({ error: "INVALID_APPOINTMENT_ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const decision = String(body?.decision || "").toUpperCase(); // "CONFIRM" | "DECLINE"
  if (decision !== "CONFIRM" && decision !== "DECLINE") {
    return NextResponse.json({ error: "INVALID_DECISION" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findUnique({
        where: { appointment_id },
        select: {
          appointment_id: true,
          doctor_id: true,
          patient_id: true,
          date: true,
          time: true,
          status: true,
        },
      });

      if (!appt) return { ok: false as const, code: "NOT_FOUND" as const };

      if (appt.doctor_id !== me.user_id) {
        return { ok: false as const, code: "FORBIDDEN" as const };
      }

      if (String(appt.status).toUpperCase() !== "PENDING") {
        return { ok: false as const, code: "NOT_PENDING" as const, status: appt.status };
      }

      if (decision === "CONFIRM") {
        const updated = await tx.appointment.update({
          where: { appointment_id },
          data: { status: "CONFIRMED" as any },
          select: { appointment_id: true, status: true },
        });

        await tx.accessLog.create({
          data: {
            user_id: me.user_id,
            entity_type: "Appointment",
            entity_id: String(appointment_id),
            action: "APPOINTMENT_CONFIRM",
          },
        });

        return { ok: true as const, status: updated.status };
      } else {
        // DECLINE => ลบเพื่อคืนสล็อต (uniq_doctor_slot)
        await tx.appointment.delete({ where: { appointment_id } });

        await tx.accessLog.create({
          data: {
            user_id: me.user_id,
            entity_type: "Appointment",
            entity_id: String(appointment_id),
            action: "APPOINTMENT_DECLINE",
          },
        });

        return { ok: true as const, status: "DELETED" };
      }
    });

    if (!result.ok) {
      if (result.code === "NOT_FOUND") return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      if (result.code === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      if (result.code === "NOT_PENDING")
        return NextResponse.json({ error: "APPOINTMENT_NOT_PENDING", status: result.status }, { status: 409 });
    }

    return NextResponse.json({ ok: true, appointment_id, status: result.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "SERVER_ERROR" }, { status: 500 });
  }
}
