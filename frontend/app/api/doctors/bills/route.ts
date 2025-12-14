// app/api/doctor/bills/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLogin } from "@/app/api/_helpers/auth";
import { Prisma } from "@/app/generated/prisma/client";

type Body = { treatment_ids: number[]; payment_status?: string; bill_date?: string };

function computeTotal(treatments: Array<{ medicines: Array<{ quantity: number; medicine: { price: Prisma.Decimal } }> }>) {
  let total = new Prisma.Decimal(0);
  for (const t of treatments) for (const tm of t.medicines) total = total.add(new Prisma.Decimal(tm.quantity).mul(tm.medicine.price));
  return total;
}

export async function POST(req: NextRequest) {
  const auth = await requireLogin();
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  if (!auth.login.doctor_id) return NextResponse.json({ ok: false, message: "Doctor only" }, { status: 403 });
  const doctor_id = auth.login.doctor_id;

  const body = (await req.json().catch(() => null)) as Body | null;
  const ids = Array.from(new Set((body?.treatment_ids ?? []).map(Number))).filter(Number.isFinite);
  if (ids.length === 0) return NextResponse.json({ ok: false, message: "treatment_ids[] is required" }, { status: 400 });

  const payment_status = body?.payment_status ?? "UNPAID";

  const result = await prisma.$transaction(async (tx) => {
    const treatments = await tx.treatment.findMany({
      where: { treatment_id: { in: ids } },
      include: { medicines: { include: { medicine: true } } },
    });

    if (treatments.length !== ids.length) {
      const found = new Set(treatments.map((t) => t.treatment_id));
      return { error: "TREATMENT_NOT_FOUND", missing: ids.filter((id) => !found.has(id)) };
    }

    const notMine = treatments.filter((t) => t.doctor_id !== doctor_id).map((t) => t.treatment_id);
    if (notMine.length) return { error: "TREATMENT_NOT_OWNED_BY_DOCTOR", notMine };

    const patientSet = new Set(treatments.map((t) => t.patient_id));
    if (patientSet.size !== 1) return { error: "MIXED_PATIENTS_IN_ONE_BILL", patients: Array.from(patientSet) };
    const patient_id = treatments[0].patient_id;

    const alreadyBilled = await tx.billTreatment.findMany({
      where: { treatment_id: { in: ids } },
      select: { treatment_id: true, bill_id: true },
    });
    if (alreadyBilled.length) return { error: "TREATMENT_ALREADY_BILLED", alreadyBilled };

    const total = computeTotal(treatments);

    const bill = await tx.bill.create({
      data: {
        patient_id,
        total_amount: total,
        payment_status,
        bill_date: body?.bill_date ? new Date(body.bill_date) : new Date(),
      },
    });

    await tx.billTreatment.createMany({
      data: ids.map((treatment_id) => ({ bill_id: bill.bill_id, treatment_id })),
    });

    return { ok: true, bill_id: bill.bill_id, patient_id, total: total.toString() };
  });

  if ((result as any).error) return NextResponse.json({ ok: false, ...result }, { status: 409 });
  return NextResponse.json(result, { status: 201 });
}
