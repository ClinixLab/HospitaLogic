// app/api/bills/[bill_id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLogin } from "@/app/api/_helpers/auth";
import { Prisma } from "@/app/generated/prisma/client";

function getBillId(req: NextRequest, ctx: any) {
  const p = ctx?.params ?? {};
  let raw: any = p.bill_id ?? p.id;

  if (!raw) {
    const pathname = new URL(req.url).pathname;
    raw = pathname.split("/").filter(Boolean).pop();
  }

  const bill_id = Number(raw);
  return { raw, bill_id, params: p, url: req.url };
}

function computeTotal(bill: any) {
  let total = new Prisma.Decimal(0);
  for (const bt of bill.treatments) {
    for (const tm of bt.treatment.medicines) {
      total = total.add(new Prisma.Decimal(tm.quantity).mul(tm.medicine.price));
    }
  }
  return total;
}

// รวมยอดใช้ยาในบิลนี้เป็นราย medicine_id (กันตัดซ้ำหลายบรรทัด)
function aggregateMedicineUsage(bill: any) {
  const map = new Map<number, number>();

  for (const bt of bill.treatments ?? []) {
    for (const tm of bt.treatment?.medicines ?? []) {
      const mid = Number(tm.medicine_id ?? tm.medicine?.medicine_id);
      const qty = Number(tm.quantity ?? 0);
      if (!Number.isFinite(mid) || !Number.isFinite(qty) || qty <= 0) continue;
      map.set(mid, (map.get(mid) ?? 0) + qty);
    }
  }

  return Array.from(map.entries()).map(([medicine_id, quantity]) => ({
    medicine_id,
    quantity,
  }));
}

export async function GET(req: NextRequest, ctx: any) {
  const auth = await requireLogin();
  if (!auth.ok)
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  if (!auth.login.patient_id)
    return NextResponse.json({ ok: false, message: "Patient only" }, { status: 403 });

  const { raw, bill_id, params, url } = getBillId(req, ctx);
  if (!raw || !Number.isFinite(bill_id)) {
    return NextResponse.json(
      { ok: false, message: "Invalid bill_id", debug: { raw, params, url } },
      { status: 400 }
    );
  }

  const bill = await prisma.bill.findUnique({
    where: { bill_id },
    include: {
      patient: true,
      treatments: {
        include: {
          treatment: {
            include: {
              diagnosis: true,
              doctor: true,
              medicines: { include: { medicine: true } },
            },
          },
        },
      },
    },
  });

  if (!bill) return NextResponse.json({ ok: false, message: "Bill not found" }, { status: 404 });
  if (bill.patient_id !== auth.login.patient_id)
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const computed = computeTotal(bill);

  return NextResponse.json({
    ok: true,
    bill,
    computed_total: computed.toString(),
    stored_total: bill.total_amount.toString(),
  });
}

export async function PATCH(req: NextRequest, ctx: any) {
  const auth = await requireLogin();
  if (!auth.ok)
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  if (!auth.login.patient_id)
    return NextResponse.json({ ok: false, message: "Patient only" }, { status: 403 });

  const { raw, bill_id, params, url } = getBillId(req, ctx);
  if (!raw || !Number.isFinite(bill_id)) {
    return NextResponse.json(
      { ok: false, message: "Invalid bill_id", debug: { raw, params, url } },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const payment_status = String(body?.payment_status ?? "PAID").toUpperCase();

  const allowed = new Set(["PAID", "UNPAID"]);
  if (!allowed.has(payment_status)) {
    return NextResponse.json(
      { ok: false, message: "Invalid payment_status (use PAID/UNPAID)" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {

      const bill = await tx.bill.findUnique({
        where: { bill_id },
        include: {
          treatments: {
            include: {
              treatment: {
                include: {
                  medicines: {

                    include: { medicine: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!bill) {
        return { status: 404 as const, body: { ok: false, message: "Bill not found" } };
      }
      if (bill.patient_id !== auth.login.patient_id) {
        return { status: 403 as const, body: { ok: false, message: "Forbidden" } };
      }

      const current = String(bill.payment_status || "").toUpperCase();


      if (payment_status === "UNPAID") {
        if (current === "PAID") {
          return {
            status: 409 as const,
            body: {
              ok: false,
              message: "Cannot change PAID -> UNPAID because medicine stock was already deducted.",
            },
          };
        }

        const updated = await tx.bill.update({
          where: { bill_id },
          data: { payment_status: "UNPAID" },
        });

        return { status: 200 as const, body: { ok: true, bill: updated } };
      }


      if (current === "PAID") {
        const fresh = await tx.bill.findUnique({ where: { bill_id } });
        return {
          status: 200 as const,
          body: { ok: true, bill: fresh, message: "Already PAID (no stock deduction performed)." },
        };
      }


      const mark = await tx.bill.updateMany({
        where: { bill_id, payment_status: { not: "PAID" } },
        data: { payment_status: "PAID" },
      });

      if (mark.count === 0) {
        const fresh = await tx.bill.findUnique({ where: { bill_id } });
        return {
          status: 200 as const,
          body: { ok: true, bill: fresh, message: "Already PAID (no stock deduction performed)." },
        };
      }

      const usage = aggregateMedicineUsage(bill);
      if (usage.length === 0) {
        const updated = await tx.bill.findUnique({ where: { bill_id } });
        return {
          status: 200 as const,
          body: { ok: true, bill: updated, deducted: [], message: "PAID (no medicines to deduct)." },
        };
      }

      const deducted: Array<{ medicine_id: number; quantity: number }> = [];

      for (const item of usage) {
        const res = await tx.medicine.updateMany({
          where: {
            medicine_id: item.medicine_id,
            quantity: { gte: item.quantity }, 
          },
          data: {
            quantity: { decrement: item.quantity }, 
          },
        });

        if (res.count !== 1) {
 
          throw new Error(`INSUFFICIENT_STOCK:${item.medicine_id}:${item.quantity}`);
        }

        deducted.push(item);
      }

      const updated = await tx.bill.findUnique({ where: { bill_id } });

      return {
        status: 200 as const,
        body: { ok: true, bill: updated, deducted, message: "PAID and stock deducted." },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: any) {
    const msg = String(e?.message || "");


    if (msg.startsWith("INSUFFICIENT_STOCK:")) {
      const [, medicine_id, need] = msg.split(":");
      return NextResponse.json(
        {
          ok: false,
          message: "Insufficient medicine stock",
          medicine_id: Number(medicine_id),
          required_quantity: Number(need),
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, message: "Failed to update bill", error: msg },
      { status: 500 }
    );
  }
}
