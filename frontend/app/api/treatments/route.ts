// app/api/treatments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLogin } from "@/app/api/_helpers/auth";

type CreateTreatmentBody = {
  patient_id: number;
  diagnosis_id: number;
  treatment_date?: string;
  medicines: Array<{ medicine_id: number; quantity: number }>;
};

export async function POST(req: NextRequest) {
  const auth = await requireLogin();
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  // middleware กรอง role แล้ว แต่เช็คกันพลาดไว้หน่อย
  if (!auth.login.doctor_id) {
    return NextResponse.json({ ok: false, message: "Doctor only" }, { status: 403 });
  }
  const doctor_id = auth.login.doctor_id;

  let body: CreateTreatmentBody;
  try {
    body = (await req.json()) as CreateTreatmentBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const { patient_id, diagnosis_id } = body ?? ({} as any);
  const medicinesRaw = body?.medicines ?? [];

  if (!patient_id || !diagnosis_id) {
    return NextResponse.json({ ok: false, message: "patient_id, diagnosis_id are required" }, { status: 400 });
  }
  if (!Array.isArray(medicinesRaw) || medicinesRaw.length === 0) {
    return NextResponse.json({ ok: false, message: "medicines must be a non-empty array" }, { status: 400 });
  }

  // รวม medicine ซ้ำ
  const medMap = new Map<number, number>();
  for (const m of medicinesRaw) {
    if (!m?.medicine_id || !m?.quantity || m.quantity <= 0) {
      return NextResponse.json({ ok: false, message: "Each medicine needs medicine_id and quantity > 0" }, { status: 400 });
    }
    medMap.set(m.medicine_id, (medMap.get(m.medicine_id) ?? 0) + m.quantity);
  }
  const medicines = Array.from(medMap.entries()).map(([medicine_id, quantity]) => ({ medicine_id, quantity }));

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [patient, diagnosis] = await Promise.all([
        tx.patient.findUnique({ where: { patient_id } }),
        tx.diagnosis.findUnique({ where: { diagnosis_id } }),
      ]);
      if (!patient) return { error: "PATIENT_NOT_FOUND" };
      if (!diagnosis) return { error: "DIAGNOSIS_NOT_FOUND" };

      // stock check
      const ids = medicines.map((m) => m.medicine_id);
      const dbMeds = await tx.medicine.findMany({
        where: { medicine_id: { in: ids } },
        select: { medicine_id: true, quantity: true, name: true, price: true },
      });
      if (dbMeds.length !== ids.length) {
        const found = new Set(dbMeds.map((m) => m.medicine_id));
        return { error: "MEDICINE_NOT_FOUND", missing: ids.filter((id) => !found.has(id)) };
      }

      const dbMap = new Map(dbMeds.map((m) => [m.medicine_id, m]));
      for (const m of medicines) {
        const med = dbMap.get(m.medicine_id)!;
        if (med.quantity < m.quantity) {
          return { error: "INSUFFICIENT_STOCK", medicine_id: m.medicine_id, available: med.quantity, requested: m.quantity };
        }
      }

      const treatment = await tx.treatment.create({
        data: {
          patient_id,
          doctor_id, // ✅ มาจาก user_id
          diagnosis_id,
          treatment_date: body.treatment_date ? new Date(body.treatment_date) : new Date(),
        },
      });

      await tx.treatmentMedicine.createMany({
        data: medicines.map((m) => ({
          treatment_id: treatment.treatment_id,
          medicine_id: m.medicine_id,
          quantity: m.quantity,
        })),
      });

      for (const m of medicines) {
        await tx.medicine.update({
          where: { medicine_id: m.medicine_id },
          data: { quantity: { decrement: m.quantity } },
        });
      }

      const full = await tx.treatment.findUnique({
        where: { treatment_id: treatment.treatment_id },
        include: {
          diagnosis: true,
          doctor: true,
          patient: true,
          medicines: { include: { medicine: true } },
        },
      });

      return { ok: true, treatment: full };
    });

    if ((result as any).error) return NextResponse.json({ ok: false, ...result }, { status: 409 });
    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: "Internal error", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
