"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Me = { username: string; patient_id: number };

type BillListItem = {
  bill_id: number;
  bill_date: string;
  total_amount: any;
  payment_status: string;
  treatment_count?: number;
};

type BillFilter = "UNPAID" | "ALL";

function money(v: any) {
  const n = Number(String(v));
  return Number.isFinite(n)
    ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n)
    : String(v);
}

function StatusBadge({ status }: { status: any }) {
  const s = String(status || "").toUpperCase();
  const isPaid = s === "PAID";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold border " +
        (isPaid
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-800 border-amber-200")
      }
    >
      {isPaid ? "ชำระแล้ว (PAID)" : "ยังไม่ชำระ"}
    </span>
  );
}

export default function BillsClient({ me }: { me: Me }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [bills, setBills] = useState<BillListItem[]>([]);

  // ✅ filter (default unpaid)
  const [filter, setFilter] = useState<BillFilter>("UNPAID");

  // cache detail
  const [detailById, setDetailById] = useState<Record<number, any>>({});
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  // confirm pay
  const [confirmPay, setConfirmPay] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);

  const billMap = useMemo(() => new Map(bills.map((b) => [b.bill_id, b])), [bills]);

  function setFilterAndUrl(next: BillFilter) {
    setFilter(next);

    const params = new URLSearchParams(sp.toString());
    if (next === "ALL") params.set("filter", "all");
    else params.delete("filter");

    const qs = params.toString();
    router.replace(qs ? `/bills?${qs}` : "/bills");
  }

  async function fetchBills() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/bills", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=/bills";
          return;
        }
        throw new Error(data?.message || `Load bills failed (${res.status})`);
      }

  
      const list = data?.bills ?? data?.data ?? [];
      const normalized: BillListItem[] = list.map((b: any) => ({
        bill_id: b.bill_id,
        bill_date: b.bill_date,
        total_amount: b.total_amount,
        payment_status: b.payment_status,
        treatment_count: b.treatment_count ?? b?.treatments?.length,
      }));

      setBills(normalized);
    } catch (e: any) {
      setErr(e?.message || "โหลดรายการบิลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDetail(billId: number) {
    setDetailErr(null);

    if (detailById[billId]?.ok) return;

    setDetailLoading(true);
    try {
      const res = await fetch(`/api/bills/${encodeURIComponent(String(billId))}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || `Load detail failed (${res.status})`);
      }

      setDetailById((prev) => ({ ...prev, [billId]: data }));
    } catch (e: any) {
      setDetailErr(e?.message || "โหลดรายละเอียดไม่สำเร็จ");
    } finally {
      setDetailLoading(false);
    }
  }

  function openBill(billId: number, syncUrl = true) {
    console.log("[Bills] open bill_id =", billId);
    setSelectedId(billId);
    setOpen(true);
    setConfirmPay(false);
    setPayErr(null);

    if (syncUrl) {
      const params = new URLSearchParams(sp.toString());
      params.set("open", String(billId));
      const qs = params.toString();
      router.replace(`/bills?${qs}`);
    }

    fetchDetail(billId);
  }

  function closeBill() {
    setOpen(false);
    setSelectedId(null);
    setConfirmPay(false);
    setPayErr(null);

    const params = new URLSearchParams(sp.toString());
    params.delete("open");
    const qs = params.toString();
    router.replace(qs ? `/bills?${qs}` : "/bills");
  }

  async function payBill(billId: number) {
    if (payLoading) return;
    setPayErr(null);
    setPayLoading(true);

    try {
      const res = await fetch(`/api/bills/${encodeURIComponent(String(billId))}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "PAID" }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.message || `Pay failed (${res.status})`);


      setBills((prev) => prev.map((b) => (b.bill_id === billId ? { ...b, payment_status: "PAID" } : b)));


      setDetailById((prev) => {
        const old = prev[billId];
        if (!old?.ok) return prev;
        return {
          ...prev,
          [billId]: { ...old, bill: { ...old.bill, payment_status: "PAID" } },
        };
      });

      setConfirmPay(false);
    } catch (e: any) {
      setPayErr(e?.message || "ชำระเงินไม่สำเร็จ");
    } finally {
      setPayLoading(false);
    }
  }


  useEffect(() => {
    fetchBills();

  }, []);


  useEffect(() => {
    const f = sp.get("filter");
    setFilter(f === "all" ? "ALL" : "UNPAID");

  }, [sp]);

  useEffect(() => {
    const q = sp.get("open");
    if (!q) return;
    const id = Number(q);
    if (!Number.isFinite(id)) return;
    if (open && selectedId === id) return;
    openBill(id, false);

  }, [sp]);

  const selectedListItem = selectedId ? billMap.get(selectedId) : undefined;
  const detail = selectedId ? detailById[selectedId] : null;
  const bill = detail?.bill;

  const meds = useMemo(() => {
    if (!detail?.ok) return [];
    if (Array.isArray(detail.medicine_summary)) return detail.medicine_summary;

    if (!bill) return [];
    const agg = new Map<number, { medicine_id: number; name: string; price: number; qty: number; subtotal: number }>();

    for (const bt of bill.treatments || []) {
      for (const tm of bt.treatment?.medicines || []) {
        const id = tm.medicine_id;
        const name = tm.medicine?.name ?? "-";
        const price = Number(String(tm.medicine?.price));
        const qty = tm.quantity;
        const sub = price * qty;

        const prev = agg.get(id);
        if (!prev) agg.set(id, { medicine_id: id, name, price, qty, subtotal: sub });
        else agg.set(id, { ...prev, qty: prev.qty + qty, subtotal: prev.subtotal + sub });
      }
    }
    return Array.from(agg.values());
  }, [detail, bill]);

  const isPaid = String((bill?.payment_status ?? selectedListItem?.payment_status) || "").toUpperCase() === "PAID";


  const visibleBills = useMemo(() => {
    if (filter === "ALL") return bills;
    return bills.filter((b) => String(b.payment_status).toUpperCase() !== "PAID");
  }, [bills, filter]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">บิลของฉัน</h1>
          <div className="text-sm text-slate-500 mt-1">
            ผู้ใช้: <span className="font-bold">{me.username}</span> • patient_id:{" "}
            <span className="font-bold">{me.patient_id}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* ✅ Filter toggle */}
          <div className="rounded-2xl border border-slate-200 bg-white p-1 flex">
            <button
              onClick={() => setFilterAndUrl("UNPAID")}
              className={
                "rounded-2xl px-4 py-2 text-sm font-extrabold transition " +
                (filter === "UNPAID"
                  ? "bg-emerald-600 text-white"
                  : "bg-transparent text-slate-700 hover:bg-slate-50")
              }
            >
              ค้างชำระเท่านั้น
            </button>

            <button
              onClick={() => setFilterAndUrl("ALL")}
              className={
                "rounded-2xl px-4 py-2 text-sm font-extrabold transition " +
                (filter === "ALL"
                  ? "bg-emerald-600 text-white"
                  : "bg-transparent text-slate-700 hover:bg-slate-50")
              }
            >
              ทุกบิล
            </button>
          </div>

          <button
            onClick={fetchBills}
            className="rounded-2xl px-4 py-2 text-sm font-extrabold border border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
          >
            รีเฟรช
          </button>

          <Link href="/" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
            ← กลับหน้าแรก
          </Link>
        </div>
      </div>

      <section className="mt-6 rounded-[24px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 font-extrabold text-slate-900">รายการบิล</div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">กำลังโหลด...</div>
        ) : err ? (
          <div className="p-10 text-center">
            <div className="text-rose-600 font-extrabold">โหลดไม่สำเร็จ</div>
            <div className="mt-1 text-sm text-slate-500">{err}</div>
          </div>
        ) : visibleBills.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            {filter === "UNPAID" ? "ไม่มีบิลค้างชำระ" : "ยังไม่มีบิล"}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {visibleBills.map((b) => (
              <div key={b.bill_id} className="px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="font-extrabold text-slate-900">Bill #{b.bill_id}</div>
                    <StatusBadge status={b.payment_status} />
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    วันที่:{" "}
                    <span className="font-bold text-slate-700">
                      {new Date(b.bill_date).toLocaleString("th-TH")}
                    </span>
                    {" • "}
                    Treatments: <span className="font-bold text-slate-700">{b.treatment_count ?? 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">ยอดรวม</div>
                    <div className="text-xl font-extrabold text-slate-900">{money(b.total_amount)}</div>
                  </div>

                  <button
                    onClick={() => openBill(b.bill_id, true)}
                    className="rounded-2xl px-4 py-2 text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition"
                  >
                    ดูรายละเอียด
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL */}
      {open && selectedId != null && (
        <div className="fixed inset-0 z-50">
          <button aria-label="close" onClick={closeBill} className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl rounded-[24px] border border-slate-200 bg-white shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-extrabold text-slate-900">รายละเอียด Bill #{selectedId}</div>
                    <StatusBadge status={bill?.payment_status ?? selectedListItem?.payment_status} />
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    วันที่:{" "}
                    <span className="font-bold text-slate-700">
                      {selectedListItem?.bill_date ? new Date(selectedListItem.bill_date).toLocaleString("th-TH") : "-"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeBill}
                  className="rounded-2xl px-4 py-2 text-sm font-extrabold border border-slate-200 bg-white hover:bg-slate-50"
                >
                  ปิด
                </button>
              </div>

              <div className="p-6">
                {detailLoading ? (
                  <div className="p-8 text-center text-slate-500">กำลังโหลดรายละเอียด...</div>
                ) : detailErr ? (
                  <div className="p-8 text-center text-rose-600 font-extrabold">{detailErr}</div>
                ) : !bill ? (
                  <div className="p-8 text-center text-slate-500">ไม่พบข้อมูล</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* LEFT: meds */}
                    <div className="lg:col-span-2 rounded-[20px] border border-slate-200 overflow-hidden">
                      <div className="px-5 py-3 border-b border-slate-200 font-extrabold text-slate-900">รายการยา</div>
                      <div className="p-5 space-y-3">
                        {meds.length === 0 ? (
                          <div className="text-sm text-slate-500">ไม่มีรายการยา</div>
                        ) : (
                          meds.map((m: any) => (
                            <div key={m.medicine_id} className="rounded-2xl border border-slate-200 p-4">
                              <div className="font-extrabold text-slate-900">{m.name}</div>
                              <div className="mt-1 text-sm text-slate-600">
                                Qty: <span className="font-bold">{m.qty}</span> • Price:{" "}
                                <span className="font-bold">{money(m.price)}</span>
                              </div>
                              <div className="mt-2 text-right font-extrabold text-slate-900">{money(m.subtotal)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* RIGHT: payment */}
                    <div className="rounded-[20px] border border-slate-200 overflow-hidden h-fit">
                      <div className="px-5 py-3 border-b border-slate-200 font-extrabold text-slate-900">การชำระเงิน</div>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-slate-500">สถานะ</div>
                            <div className="mt-1">
                              <StatusBadge status={bill.payment_status} />
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500">ยอดที่ต้องชำระ</div>
                            <div className="text-2xl font-extrabold text-slate-900">{money(bill.total_amount)}</div>
                          </div>
                        </div>

                        {isPaid ? (
                          <button
                            disabled
                            className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-extrabold text-white bg-emerald-600/60 cursor-not-allowed"
                          >
                            จ่ายแล้ว
                          </button>
                        ) : (
                          <div className="mt-5">
                            {!confirmPay ? (
                              <button
                                onClick={() => setConfirmPay(true)}
                                className="w-full rounded-2xl px-4 py-3 text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700"
                              >
                                จ่ายเงิน
                              </button>
                            ) : (
                              <div className="rounded-2xl border border-slate-200 p-4">
                                <div className="text-sm font-extrabold text-slate-900">ยืนยันการชำระเงิน?</div>
                                <div className="mt-1 text-xs text-slate-500">(demo) เปลี่ยนสถานะเป็น PAID</div>

                                <div className="mt-3 flex gap-2">
                                  <button
                                    disabled={payLoading}
                                    onClick={() => payBill(selectedId)}
                                    className={`flex-1 rounded-2xl px-4 py-2 text-sm font-extrabold text-white ${
                                      payLoading ? "bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700"
                                    }`}
                                  >
                                    {payLoading ? "กำลังทำรายการ..." : "ยืนยัน"}
                                  </button>
                                  <button
                                    disabled={payLoading}
                                    onClick={() => {
                                      setConfirmPay(false);
                                      setPayErr(null);
                                    }}
                                    className="flex-1 rounded-2xl px-4 py-2 text-sm font-extrabold border border-slate-200 bg-white hover:bg-slate-50"
                                  >
                                    ยกเลิก
                                  </button>
                                </div>

                                {payErr && <div className="mt-2 text-xs font-bold text-rose-600">{payErr}</div>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </main>
  );
}
