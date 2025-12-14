"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Diagnosis = { diagnosis_id: number; code: string; description: string };
type Medicine = { medicine_id: number; name: string; quantity: number; price: string };
type MedPick = { medicine_id: number; quantity: number };

function toLocalDateTime(ymd: string, hm: string) {
  // local time
  return new Date(`${ymd}T${hm}:00`);
}
function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function isHM(s: string) {
  return /^\d{2}:\d{2}$/.test(s);
}

export default function TreatmentForm({
  appointment_id,
  returnUrl,
  symptom,
  patient,
  diagnoses,
  medicines,
}: {
  appointment_id: number;
  returnUrl: string;
  symptom: string;
  patient: { patient_id: string; name: string; phone: string; gender: string };
  diagnoses: Diagnosis[];
  medicines: Medicine[];
}) {
  const router = useRouter();

  const [diagnosisId, setDiagnosisId] = useState<number | "">("");
  const [rows, setRows] = useState<MedPick[]>([{ medicine_id: 0, quantity: 1 }]);

  const [followUp, setFollowUp] = useState(false);
  const [followDate, setFollowDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  });
  const [followTime, setFollowTime] = useState("09:00");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const medMap = useMemo(() => new Map(medicines.map((m) => [m.medicine_id, m])), [medicines]);

  const total = useMemo(() => {
    let sum = 0;
    for (const r of rows) {
      if (!r.medicine_id || r.quantity <= 0) continue;
      const m = medMap.get(r.medicine_id);
      if (!m) continue;
      const p = Number(m.price);
      if (Number.isFinite(p)) sum += p * r.quantity;
    }
    return sum;
  }, [rows, medMap]);

  function addRow() {
    setRows((r) => [...r, { medicine_id: 0, quantity: 1 }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  function updateRow(i: number, patch: Partial<MedPick>) {
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function validateFollowUp() {
    if (!followUp) return true;

    if (!isYMD(followDate) || !isHM(followTime)) {
      setErr("รูปแบบวัน/เวลา นัดต่อไม่ถูกต้อง");
      return false;
    }

    const dt = toLocalDateTime(followDate, followTime);
    if (!Number.isFinite(dt.getTime())) {
      setErr("วัน/เวลา นัดต่อไม่ถูกต้อง");
      return false;
    }

    if (dt.getTime() <= Date.now()) {
      setErr("ห้ามนัดต่อย้อนหลัง (ต้องเป็นเวลาในอนาคต)");
      return false;
    }

    return true;
  }

  async function submit() {
    setErr(null);
    setOk(null);

    if (diagnosisId === "") {
      setErr("กรุณาเลือก Diagnosis");
      return;
    }

    if (!validateFollowUp()) return;

    const meds = rows
      .map((r) => ({ medicine_id: Number(r.medicine_id), quantity: Number(r.quantity) }))
      .filter((r) => Number.isFinite(r.medicine_id) && r.medicine_id > 0 && Number.isFinite(r.quantity) && r.quantity > 0);

    setSaving(true);
    try {
      const res = await fetch("/api/doctors/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id,
          diagnosis_id: Number(diagnosisId),
          medicines: meds,
          follow_up: followUp ? { date: followDate, time: followTime } : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "Save failed");

      const fuMsg =
        data?.follow_up_error === "FOLLOWUP_IN_PAST"
          ? " (นัดต่อย้อนหลัง ระบบไม่สร้าง)"
          : data?.follow_up_error === "FOLLOWUP_SLOT_TAKEN"
          ? " (แต่นัดต่อชนเวลา เลยยังไม่ถูกสร้าง)"
          : data?.follow_up?.appointment_id
          ? ` (สร้างนัดต่อ #${data.follow_up.appointment_id} แล้ว)`
          : "";

      setOk(`บันทึกสำเร็จ ✅ treatment_id=${data.treatment_id}${data.bill_id ? `, bill_id=${data.bill_id}` : ""}${fuMsg}`);
      setTimeout(() => router.push(returnUrl), 600);
    } catch (e: any) {
      const msg = String(e?.message || "Save failed");
      if (msg.includes("FOLLOWUP_IN_PAST")) setErr("ห้ามนัดต่อย้อนหลัง");
      else if (msg.includes("MEDICINE_NOT_ENOUGH")) setErr("ยาไม่พอในสต็อก");
      else if (msg.includes("MEDICINE_NOT_FOUND")) setErr("ไม่พบยาบางรายการ");
      else if (msg.includes("DIAGNOSIS_NOT_FOUND")) setErr("ไม่พบ Diagnosis");
      else if (msg.includes("APPOINTMENT_NOT_CONFIRMED")) setErr("นัดนี้ยังไม่ CONFIRMED");
      else setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <div className="text-sm font-extrabold text-slate-900">ข้อมูลคนไข้</div>
        <div className="mt-1 text-sm text-slate-600">
          {patient.name} • {patient.phone} • {patient.gender}
        </div>

        {/* ✅ symptom โชว์ใต้ข้อมูลคนไข้ */}
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-extrabold text-slate-500">อาการ (Symptom)</div>
          <div className="mt-1 text-sm font-semibold text-slate-900 whitespace-pre-wrap">
            {symptom ? symptom : "-"}
          </div>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}
      {ok && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {ok}
        </div>
      )}

      {/* Diagnosis */}
      <div>
        <div className="text-sm font-extrabold text-slate-900">เลือก Diagnosis</div>
        <select
          value={diagnosisId}
          onChange={(e) => setDiagnosisId(e.target.value ? Number(e.target.value) : "")}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">-- เลือกโรค/การวินิจฉัย --</option>
          {diagnoses.map((d) => (
            <option key={d.diagnosis_id} value={d.diagnosis_id}>
              {d.code} — {d.description}
            </option>
          ))}
        </select>
      </div>

      {/* Medicines */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold text-slate-900">ต้องจ่ายยาอะไรบ้าง</div>
          <button
            type="button"
            onClick={addRow}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
          >
            + เพิ่มยา
          </button>
        </div>

        <div className="mt-3 grid gap-3">
          {rows.map((r, i) => {
            const m = medMap.get(r.medicine_id);
            return (
              <div key={i} className="rounded-2xl border border-slate-200 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-7">
                    <div className="text-xs font-bold text-slate-500">Medicine</div>
                    <select
                      value={r.medicine_id}
                      onChange={(e) => updateRow(i, { medicine_id: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value={0}>-- เลือกยา --</option>
                      {medicines.map((x) => (
                        <option key={x.medicine_id} value={x.medicine_id}>
                          {x.name} (คงเหลือ {x.quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <div className="text-xs font-bold text-slate-500">Quantity</div>
                    <input
                      type="number"
                      min={1}
                      value={r.quantity}
                      onChange={(e) => updateRow(i, { quantity: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2 flex md:justify-end">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="mt-5 md:mt-0 rounded-xl bg-rose-100 px-3 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-200"
                    >
                      ลบ
                    </button>
                  </div>
                </div>

                {m && (
                  <div className="mt-2 text-xs text-slate-500">
                    ราคา/หน่วย: <span className="font-semibold text-slate-800">{m.price}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-sm text-slate-600">
          รวมโดยประมาณ:{" "}
          <span className="font-extrabold text-slate-900">
            {new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(total)}
          </span>
        </div>
      </div>

      {/* Follow-up */}
      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <input
            type="checkbox"
            checked={followUp}
            onChange={(e) => {
              setErr(null);
              setFollowUp(e.target.checked);
            }}
            className="h-4 w-4"
          />
          นัดต่อไหม (ห้ามย้อนหลัง)
        </label>

        {followUp && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-bold text-slate-500">วันที่นัดต่อ</div>
              <input
                type="date"
                value={followDate}
                onChange={(e) => setFollowDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">เวลา</div>
              <input
                type="time"
                value={followTime}
                onChange={(e) => setFollowTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <button
        disabled={saving}
        onClick={submit}
        className={
          "mt-6 w-full rounded-2xl px-5 py-4 text-sm font-extrabold text-white " +
          (saving
            ? "bg-slate-400"
            : "bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 hover:brightness-[1.03] active:brightness-[0.98]")
        }
      >
        {saving ? "กำลังบันทึก..." : "บันทึก Treatment + สร้างบิล + ปิดนัด (และนัดต่อถ้าติ๊กไว้)"}
      </button>
    </div>
  );
}
