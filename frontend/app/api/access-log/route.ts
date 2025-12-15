// app/api/access-log/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLogin } from "@/app/api/_helpers/auth";

function iso(d: Date) {
  try {
    return d.toISOString();
  } catch {
    return String(d);
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireLogin();
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const me = auth.login; // Login row
  const role = String(me.role || "").toUpperCase();

  const { searchParams } = new URL(req.url);
  const patient_id = searchParams.get("patient_id") || ""; // for doctor filter

  // --- determine which user_ids are allowed to view ---
  let targetUserIds: string[] = [];
  let patients: Array<{ patient_id: string; name: string }> = [];

  if (role === "PATIENT") {
    // patient -> only their own logs (Login.user_id == Patient.patient_id)
    targetUserIds = [me.user_id];
  } else if (role === "DOCTOR") {
    // doctor -> can view logs of patients who ever had appointments with this doctor
    const rows = await prisma.appointment.findMany({
      where: { doctor_id: me.user_id },
      select: { patient_id: true },
      distinct: ["patient_id"],
    });

    const patientIds = rows.map((r) => r.patient_id).filter(Boolean);

    // list patients for dropdown
    if (patientIds.length > 0) {
      const ps = await prisma.patient.findMany({
        where: { patient_id: { in: patientIds } },
        select: { patient_id: true, name: true },
        orderBy: { name: "asc" },
      });
      patients = ps;
    }

    if (patient_id) {
      // validate patient_id is in list
      if (!patientIds.includes(patient_id)) {
        return NextResponse.json({ ok: false, message: "Forbidden (patient not in your care list)" }, { status: 403 });
      }
      targetUserIds = [patient_id];
    } else {
      // show all patients + doctor himself
      targetUserIds = [me.user_id, ...patientIds];
    }
  } else {
    // future roles -> only self
    targetUserIds = [me.user_id];
  }

  // --- load logs ---
  const logsRaw = await prisma.accessLog.findMany({
    where: { user_id: { in: targetUserIds } },
    orderBy: { access_time: "desc" },
    take: 300,
    select: {
      access_id: true,
      user_id: true,
      entity_type: true,
      entity_id: true,
      action: true,
      access_time: true,
      user: { select: { username: true } }, // ✅ username
    },
  });

  // --- enrich diagnosis for Treatment logs (entity_type === "Treatment" + entity_id is treatment_id int) ---
  const treatmentIds = Array.from(
    new Set(
      logsRaw
        .filter((l) => String(l.entity_type || "").toUpperCase() === "TREATMENT")
        .map((l) => Number(l.entity_id))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  );

  const treatmentMap = new Map<
    number,
    { treatment_id: number; diagnosis_id: number; code: string; description: string }
  >();

  if (treatmentIds.length > 0) {
    const trs = await prisma.treatment.findMany({
      where: { treatment_id: { in: treatmentIds } },
      select: {
        treatment_id: true,
        diagnosis_id: true,
        diagnosis: { select: { code: true, description: true } },
      },
    });

    for (const t of trs) {
      treatmentMap.set(t.treatment_id, {
        treatment_id: t.treatment_id,
        diagnosis_id: t.diagnosis_id,
        code: t.diagnosis?.code ?? "",
        description: t.diagnosis?.description ?? "",
      });
    }
  }

  const logs = logsRaw.map((l) => {
    const entityType = String(l.entity_type || "");
    const entityId = String(l.entity_id || "");
    const maybeTid = entityType.toUpperCase() === "TREATMENT" ? Number(entityId) : NaN;
    const tinfo = Number.isFinite(maybeTid) ? treatmentMap.get(maybeTid) ?? null : null;

    return {
      access_id: l.access_id,
      user_id: l.user_id,
      username: l.user?.username ?? null, // ✅
      action: l.action ?? null,
      entity_type: entityType,
      entity_id: entityId,
      access_time: iso(l.access_time),

      // ✅ diagnosis (ถ้าเป็น Treatment)
      treatment_id: tinfo?.treatment_id ?? null,
      diagnosis_id: tinfo?.diagnosis_id ?? null,
      diagnosis_code: tinfo?.code ?? null,
      diagnosis_description: tinfo?.description ?? null,
    };
  });

  return NextResponse.json({
    ok: true,
    role,
    patients,
    logs,
  });
}
