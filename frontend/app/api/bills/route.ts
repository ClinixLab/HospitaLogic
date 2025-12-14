// app/api/bills/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLogin } from "@/app/api/_helpers/auth";

export async function GET() {
  const auth = await requireLogin();
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  if (!auth.login.patient_id) {
    return NextResponse.json({ ok: false, message: "Patient only" }, { status: 403 });
  }

  const bills = await prisma.bill.findMany({
    where: { patient_id: auth.login.patient_id },
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
      bill_date: b.bill_date.toISOString(),
      total_amount: b.total_amount.toString(),
      payment_status: b.payment_status,
      treatment_count: b._count.treatments,
    })),
  });
}
