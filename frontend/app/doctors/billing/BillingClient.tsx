// app/doctor/billing/BillingClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Row = {
  treatment_id: number;
  patient_id: number;
  patient_name: string;
  diagnosis: string;
  treatment_date: string; // ISO
  total: number;
  total_fmt: string;
};

export default function BillingClient({ rows }: { rows: Row[] }) {
  const grouped = useMemo(() => {
    const map = new Map<number, { patient_id: number; patient_name: string; items: Row[] }>();
    for (const r of rows) {
      const g = map.get(r.patient_id);
      if (!g) map.set(r.patient_id, { patient_id: r.patient_id, patient_name: r.patient_name, items: [r] });
      else g.items.push(r);
    }
    return Array.from(map.values());
  }, [rows]);

  const [selected, setSelected] = useState<Record<number, Record<number, boolean>>>({});
  const [creatingForPatient, setCreatingForPatient] = useState<number | null>(null);
  const [msg, setMsg] = useState<string>("");

  const toggle = (patientId: number, treatmentId: number) => {
    setSelected((prev) => {
      const p = { ...(prev[patientId] ?? {}) };
      p[treatmentId] = !p[treatmentId];
      return { ...prev, [patientId]: p };
    });
  };

  const createBill = async (patientId: number) => {
    setMsg("");
    const picked = Object.entries(selected[patientId] ?? {})
      .filter(([, v]) => v)
      .map(([k]) => Number(k))
      .filter(Number.isFinite);

    if (picked.length === 0) {
      setMsg("กรุณาเลือกอย่างน้อย 1 treatment");
      return;
    }

    setCreatingForPatient(patientId);
    try {
      const res = await fetch("/api/doctor/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treatment_ids: picked }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j?.message ?? j?.error ?? "ออกบิลไม่สำเร็จ");
        return;
      }

      setMsg(`ออกบิลสำเร็จ ✅ bill_id = ${j.bill_id} (ยอดรวม ${j.total})`);
      // รีเฟรชหน้าให้รายการที่ถูกออกบิลหายไป (ง่ายสุด)
      window.location.reload();
    } finally {
      setCreatingForPatient(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        ไม่มี treatment ที่รอออกบิล 🎉
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {msg && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {msg}
        </div>
      )}

      {grouped.map((g) => {
        const pickedIds = Object.entries(selected[g.patient_id] ?? {}).filter(([, v]) => v).map(([k]) => Number(k));
        const pickedTotal = g.items
          .filter((it) => pickedIds.includes(it.treatment_id))
          .reduce((s, it) => s + it.total, 0);

        return (
          <div key={g.patient_id} className="rounded-[24px] border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-extrabold text-slate-900">
                  Patient: {g.patient_name} (ID: {g.patient_id})
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  เลือก treatments ด้านล่างเพื่อออกบิล (ต้องเป็น patient เดียวกันอยู่แล้ว)
                </div>
              </div>

              <button
                onClick={() => createBill(g.patient_id)}
                disabled={creatingForPatient === g.patient_id}
                className="rounded-2xl px-5 py-3 text-sm font-extrabold text-white
                           bg-gradient-to-r from-blue-600 via-teal-500 to-green-500
                           disabled:opacity-60 transition"
              >
                {creatingForPatient === g.patient_id
                  ? "กำลังออกบิล..."
                  : `ออกบิล (${pickedIds.length} รายการ)`}
              </button>
            </div>

            <div className="px-5 py-3 bg-slate-50 text-sm text-slate-600 flex items-center justify-between">
              <div>เลือกแล้ว: <span className="font-extrabold">{pickedIds.length}</span></div>
              <div>ยอดประมาณรวม: <span className="font-extrabold">{pickedTotal.toFixed(2)}</span></div>
            </div>

            <div className="divide-y divide-slate-200 bg-white">
              {g.items.map((r) => (
                <label key={r.treatment_id} className="px-5 py-4 flex items-start justify-between gap-4 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={!!selected[g.patient_id]?.[r.treatment_id]}
                      onChange={() => toggle(g.patient_id, r.treatment_id)}
                    />
                    <div>
                      <div className="font-extrabold text-slate-900">Treatment #{r.treatment_id}</div>
                      <div className="text-sm text-slate-500 mt-1">
                        {new Date(r.treatment_date).toLocaleString("th-TH")} • {r.diagnosis}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">รวมค่ายา</div>
                    <div className="font-extrabold text-slate-900">{r.total_fmt}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <div className="text-sm text-slate-500">
        คนไข้จะไปดู/จ่ายได้ที่{" "}
        <Link className="font-bold text-emerald-700 hover:text-emerald-800" href="/bills">
          /bills
        </Link>
      </div>
    </div>
  );
}
