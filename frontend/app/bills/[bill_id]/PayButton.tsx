"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PayButton({ billId }: { billId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPay = async () => {
    if (loading) return;
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/bills/${billId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "PAID" }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || `Pay failed (${res.status})`);
      }

      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "ชำระเงินไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={onPay}
        disabled={loading}
        className={`w-full rounded-2xl px-4 py-3 text-sm font-extrabold text-white transition
          ${loading ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
      >
        {loading ? "กำลังชำระเงิน..." : "จ่ายเงิน"}
      </button>

      {err && <div className="mt-2 text-xs font-bold text-rose-600">{err}</div>}
    </div>
  );
}
