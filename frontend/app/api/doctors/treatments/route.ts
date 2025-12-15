// app/api/doctors/treatments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLogin } from "@/app/api/_helpers/auth";
import { Prisma } from "@/app/generated/prisma/client";

type SelectedMedicine = { medicine_id: number; quantity: number };
type FollowUp = { date: string; time: string } | null;

function mergeSameMedicine(items: SelectedMedicine[]) {
  const m = new Map<number, number>();
  for (const it of items) {
    m.set(it.medicine_id, (m.get(it.medicine_id) || 0) + it.quantity);
  }
  return Array.from(m.entries()).map(([medicine_id, quantity]) => ({ medicine_id, quantity }));
}
function toLocalDateTime(ymd: string, hm: string) {
  return new Date(`${ymd}T${hm}:00`);
}

function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function isHM(s: string) {
  return /^\d{2}:\d{2}$/.test(s);
}
function toDateStartLocal(ymd: string) {
  return new Date(`${ymd}T00:00:00`);
}

export async function POST(req: NextRequest) {
  const auth = await requireLogin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const me = auth.login;
  if (String(me.role || "").toUpperCase() !== "DOCTOR") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  const appointment_id = Number(body?.appointment_id);
  const diagnosis_id = Number(body?.diagnosis_id);
  const follow_up: FollowUp = body?.follow_up ?? null;

  if (!Number.isFinite(appointment_id) || !Number.isFinite(diagnosis_id)) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const medicinesRaw = Array.isArray(body?.medicines) ? body.medicines : [];
  const medicines: SelectedMedicine[] = mergeSameMedicine(
    medicinesRaw
      .map((m: any) => ({
        medicine_id: Number(m?.medicine_id),
        quantity: Number(m?.quantity),
      }))
      .filter(
        (m: SelectedMedicine) =>
          Number.isFinite(m.medicine_id) &&
          m.medicine_id > 0 &&
          Number.isFinite(m.quantity) &&
          m.quantity > 0
      )
  );

  let followUpValid: { date: string; time: string } | null = null;
  if (follow_up) {
    const d = String((follow_up as any).date || "");
    const t = String((follow_up as any).time || "");
    if (!isYMD(d) || !isHM(t)) {
      return NextResponse.json({ error: "INVALID_FOLLOWUP_FORMAT" }, { status: 400 });
    }
    followUpValid = { date: d, time: t };
  }

  try {
    if (followUpValid) {
      const dt = toLocalDateTime(followUpValid.date, followUpValid.time);
      if (!Number.isFinite(dt.getTime()) || dt.getTime() <= Date.now()) {
        return NextResponse.json({ error: "FOLLOWUP_IN_PAST" }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findUnique({
        where: { appointment_id },
        select: { appointment_id: true, patient_id: true, doctor_id: true, status: true },
      });

      if (!appt) throw new Error("NOT_FOUND");
      if (appt.doctor_id !== me.user_id) throw new Error("FORBIDDEN");
      if (String(appt.status).toUpperCase() !== "CONFIRMED") throw new Error("APPOINTMENT_NOT_CONFIRMED");

      const diag = await tx.diagnosis.findUnique({ where: { diagnosis_id } });
      if (!diag) throw new Error("DIAGNOSIS_NOT_FOUND");

      // check stock + existence
      if (medicines.length > 0) {
        const ids = medicines.map((m) => m.medicine_id);

        const medsInDb = await tx.medicine.findMany({
          where: { medicine_id: { in: ids } },
          select: { medicine_id: true, quantity: true, price: true },
        });

        const map = new Map(medsInDb.map((x) => [x.medicine_id, x] as const));

        for (const m of medicines) {
          const row = map.get(m.medicine_id);
          if (!row) throw new Error("MEDICINE_NOT_FOUND");
          if (row.quantity < m.quantity) throw new Error("MEDICINE_NOT_ENOUGH");
        }
      }

      // create treatment
      const treatment = await tx.treatment.create({
        data: {
          patient_id: appt.patient_id,
          doctor_id: appt.doctor_id,
          diagnosis_id,
          treatment_date: new Date(),
        },
        select: { treatment_id: true },
      });

      if (medicines.length > 0) {
        await tx.treatmentMedicine.createMany({
          data: medicines.map((m) => ({
            treatment_id: treatment.treatment_id,
            medicine_id: m.medicine_id,
            quantity: m.quantity,
          })),
        });
      }

      // create bill only if has medicines
      let bill_id: number | null = null;

      if (medicines.length > 0) {
        const ids = medicines.map((m) => m.medicine_id);
        const medsPrice = await tx.medicine.findMany({
          where: { medicine_id: { in: ids } },
          select: { medicine_id: true, price: true },
        });

        const priceMap = new Map(medsPrice.map((x) => [x.medicine_id, x.price] as const));

        let total = new Prisma.Decimal(0);
        for (const m of medicines) {
          const price = priceMap.get(m.medicine_id) ?? new Prisma.Decimal(0);
          total = total.plus(price.mul(new Prisma.Decimal(m.quantity)));
        }

        const bill = await tx.bill.create({
          data: {
            patient_id: appt.patient_id,
            total_amount: total,
            payment_status: "UNPAID",
            bill_date: new Date(),
          },
          select: { bill_id: true },
        });

        await tx.billTreatment.create({
          data: { bill_id: bill.bill_id, treatment_id: treatment.treatment_id },
        });

        bill_id = bill.bill_id;
      }

      // complete appointment
      await tx.appointment.update({
        where: { appointment_id },
        data: { status: "COMPLETED" as any },
      });

      // ✅ logs (ใส่ treatment_id + diagnosis_id ตาม schema ใหม่)
      const actorUserIds = [me.user_id, appt.patient_id]; // หมอ + คนไข้ (uuid)

const baseLogs = [
  {
    entity_type: "Treatment",
    entity_id: String(treatment.treatment_id),
    action: "TREATMENT_CREATE",
  },
  {
    entity_type: "Appointment",
    entity_id: String(appointment_id),
    action: "APPOINTMENT_COMPLETE",
  },
  ...(bill_id
    ? [
        {
          entity_type: "Bill",
          entity_id: String(bill_id),
          action: "BILL_CREATE",
        },
      ]
    : []),
];

// ถ้ากลัว FK พังเพราะ user_id ไม่มีใน Login ให้เช็คก่อน (optional แต่แนะนำ)
const existing = await tx.login.findMany({
  where: { user_id: { in: actorUserIds } },
  select: { user_id: true },
});
const existingSet = new Set(existing.map((x) => x.user_id));
const safeUserIds = actorUserIds.filter((id) => existingSet.has(id));

await tx.accessLog.createMany({
  data: safeUserIds.flatMap((uid) =>
    baseLogs.map((l) => ({
      user_id: uid, // ✅ ตรงนี้แหละที่ต่างกัน
      entity_type: l.entity_type,
      entity_id: l.entity_id,
      action: l.action,
    }))
  ),
});

      // follow-up appointment (ไม่ให้พังทั้ง transaction ถ้าชนเวลา)
      let follow_up_created: any = null;
      let follow_up_error: string | null = null;

      if (followUpValid) {
        try {
          const created = await tx.appointment.create({
            data: {
              patient_id: appt.patient_id,
              doctor_id: appt.doctor_id,
              date: toDateStartLocal(followUpValid.date),
              time: followUpValid.time,
              status: "CONFIRMED" as any,
            },
            select: { appointment_id: true, date: true, time: true, status: true },
          });

          follow_up_created = created;

          // ✅ log follow-up พร้อม treatment/diagnosis
          await tx.accessLog.create({
            data: {
              user_id: me.user_id,
              entity_type: "Appointment",
              entity_id: String(created.appointment_id),
              action: "FOLLOWUP_CREATE",
              treatment_id: treatment.treatment_id,
              diagnosis_id,
            },
          });
        } catch (e: any) {
          if (e?.code === "P2002") follow_up_error = "FOLLOWUP_SLOT_TAKEN";
          else throw e;
        }
      }

      return {
        treatment_id: treatment.treatment_id,
        bill_id,
        follow_up: follow_up_created,
        follow_up_error,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    const msg = String(e?.message || "UNKNOWN_ERROR");

    if (msg === "FORBIDDEN") return NextResponse.json({ error: msg }, { status: 403 });
    if (msg === "NOT_FOUND") return NextResponse.json({ error: msg }, { status: 404 });

    if (msg === "APPOINTMENT_NOT_CONFIRMED") return NextResponse.json({ error: msg }, { status: 409 });
    if (msg === "DIAGNOSIS_NOT_FOUND") return NextResponse.json({ error: msg }, { status: 400 });

    if (msg === "MEDICINE_NOT_FOUND" || msg === "MEDICINE_NOT_ENOUGH")
      return NextResponse.json({ error: msg }, { status: 400 });

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
