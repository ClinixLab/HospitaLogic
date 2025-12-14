"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AppointmentItem = {
  appointment_id: number;
  date: string;
  time: string;
  status: string;
  patient: { name: string; phone: string; gender: string; patient_id: string };
};

export default function DoctorConfirmedAppointmentsPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/doctors/appointments?status=CONFIRMED`, { cache: "no-store" });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "Load failed");

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">นัดที่ยืนยันแล้วทั้งหมด</h1>
            <p className="mt-1 text-sm text-white/70">รายการ CONFIRMED ของหมอคนนี้</p>
          </div>
          <button
            onClick={load}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
          >
            รีเฟรช
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
              กำลังโหลด...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
              ยังไม่มีนัดที่ยืนยันแล้ว
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((a) => {
                const d = new Date(a.date);
                const dateStr = Number.isFinite(d.getTime())
                  ? d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })
                  : a.date;

                return (
                  <div key={a.appointment_id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold">{a.patient?.name || "ไม่ทราบชื่อ"}</div>
                      <div className="text-sm font-bold text-white/80">{a.time}</div>
                    </div>
                    <div className="mt-2 text-sm text-white/70">
                      วันที่: <span className="font-semibold text-white">{dateStr}</span>
                      {" · "}
                      เบอร์: <span className="font-semibold text-white">{a.patient?.phone || "-"}</span>
                      {" · "}
                      #{a.appointment_id}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => router.push("/doctors")}
          className="mt-8 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
        >
          กลับหน้าแพทย์
        </button>
      </div>
    </div>
  );
}
