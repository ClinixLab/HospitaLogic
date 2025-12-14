// app/api/bills/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLogin } from "@/app/api/_helpers/auth";

function requirePatient(auth: any) {
  const login = auth?.login;
  if (!login) return { ok: false as const, status: 401, message: "Unauthorized" };

  if (String(login.role || "").toUpperCase() !== "PATIENT") {
    return { ok: false as const, status: 403, message: "Patient only" };
  }

  if (!login.user_id) {
    return { ok: false as const, status: 403, message: "Missing user_id" };
  }

  // ในระบบใหม่ user_id == patient_id (UUID)
  return { ok: true as const, patient_id: String(login.user_id) };
}

export async function GET() {
  const auth = await requireLogin();
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const p = requirePatient(auth);
  if (!p.ok) return NextResponse.json({ ok: false, message: p.message }, { status: p.status });

  const bills = await prisma.bill.findMany({
    where: { patient_id: p.patient_id },
    orderBy: { bill_id: "desc" },
    select: {
      bill_id: true,
      bill_date: true,
      total_amount: true,
      payment_status: true,
      _count: { select: { treatments: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    bills: bills.map((b) => ({
      bill_id: b.bill_id,
      bill_date: b.bill_date instanceof Date ? b.bill_date.toISOString() : String(b.bill_date),
      total_amount: b.total_amount?.toString?.() ?? String(b.total_amount),
      payment_status: b.payment_status,
      treatment_count: b._count.treatments,
    })),
  });
}
