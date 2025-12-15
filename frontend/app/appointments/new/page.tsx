"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Department = { department_id: number; name: string; location: string };

type Doctor = {
  doctor_id: string; // UUID
  name: string;
  phone: string;
  department?: { department_id: number; name: string };
  specialty?: { specialty_id: number; name: string };
};

type Slot = { time: string };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function todayYMDLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function toMinutes(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}
function nextHalfHourMinutes(now: Date) {
  const m = now.getHours() * 60 + now.getMinutes();
  return Math.ceil(m / 30) * 30;
}

export default function NewAppointmentPage() {
  const router = useRouter();

  const [symptoms, setSymptoms] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [doctorId, setDoctorId] = useState<string>("");

  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [time, setTime] = useState(""); // HH:mm

  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedDoctor = useMemo(
    () => (doctorId ? doctors.find((d) => d.doctor_id === doctorId) ?? null : null),
    [doctorId, doctors]
  );

  const canSubmit = useMemo(() => {
    return symptoms.trim().length > 0 && departmentId !== "" && doctorId !== "" && date && time && !submitting;
  }, [symptoms, departmentId, doctorId, date, time, submitting]);

  // load departments
  useEffect(() => {
    (async () => {
      setLoadingDept(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/departments", { credentials: "include" });
        if (res.status === 401) return router.push("/login");
        const data = await res.json();
        setDepartments(data.departments ?? []);
      } catch {
        setErrorMsg("โหลดรายการ Department ไม่สำเร็จ");
      } finally {
        setLoadingDept(false);
      }
    })();
  }, [router]);

  // load doctors by department
  useEffect(() => {
    setDoctors([]);
    setDoctorId("");
    setDate("");
    setTime("");
    setSlots([]);

    if (departmentId === "") return;

    (async () => {
      setLoadingDoc(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/doctors?department_id=${departmentId}`, { credentials: "include" });
        if (res.status === 401) return router.push("/login");
        const data = await res.json();
        setDoctors(data.doctors ?? []);
      } catch {
        setErrorMsg("โหลดรายชื่อหมอไม่สำเร็จ");
      } finally {
        setLoadingDoc(false);
      }
    })();
  }, [departmentId, router]);

  // load slots when doctor + date ready
  useEffect(() => {
    setTime("");
    setSlots([]);

    if (doctorId === "" || !date) return;

    (async () => {
      setLoadingSlots(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/appointments/slots?doctor_id=${doctorId}&date=${date}`, {
          credentials: "include",
        });
        if (res.status === 401) return router.push("/login");

        const data = await res.json().catch(() => ({}));
        const fetched: Slot[] = data.slots ?? [];

        const today = todayYMDLocal();
        const now = new Date();
        const minMinsToday = nextHalfHourMinutes(now);

        let filtered = fetched;
        if (date < today) filtered = [];
        if (date === today) filtered = fetched.filter((s) => toMinutes(s.time) >= minMinsToday);

        setSlots(filtered);
        setTime((prev) => (prev && filtered.some((s) => s.time === prev) ? prev : ""));
      } catch {
        setErrorMsg("โหลดเวลาว่างไม่สำเร็จ");
      } finally {
        setLoadingSlots(false);
      }
    })();
  }, [doctorId, date, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // ✅ เชื่อมกับ schema: Appointment.symptom
          symptom: symptoms,

          // (optional) เผื่อ API เก่าที่รับ symptoms
          // symptoms,

          doctor_id: doctorId,
          date,
          time,
        }),
      });

      if (res.status === 401) return router.push("/login");

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.message ?? "ส่งคำขอไม่สำเร็จ");
        return;
      }

      router.push("/appointments");
    } catch {
      setErrorMsg("ส่งคำขอไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedDepartmentName =
    departmentId === "" ? "—" : departments.find((d) => d.department_id === departmentId)?.name ?? "—";

  const selectedDoctorName = selectedDoctor?.name ?? "—";
  const selectedDoctorSpec = selectedDoctor?.specialty?.name ?? "—";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">จองนัดพบแพทย์</h1>
        <p className="mt-1 text-sm text-gray-500">เลือก Department → เลือกหมอ (ชื่อ+Specialty) → เลือกวัน → เลือกเวลา</p>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold">อาการ / โรคที่สงสัย</label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={5}
                placeholder="เช่น ปวดท้องด้านขวา คลื่นไส้ มีไข้..."
                className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">1) เลือก Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : "")}
                disabled={loadingDept}
                className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring disabled:bg-gray-50"
              >
                <option value="">{loadingDept ? "กำลังโหลด..." : "— เลือก —"}</option>
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">2) เลือกหมอ (ชื่อ + Specialty)</label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                disabled={departmentId === "" || loadingDoc}
                className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring disabled:bg-gray-50"
              >
                <option value="">
                  {departmentId === ""
                    ? "เลือก Department ก่อน"
                    : loadingDoc
                    ? "กำลังโหลดรายชื่อหมอ..."
                    : doctors.length === 0
                    ? "ไม่มีหมอในแผนกนี้"
                    : "— เลือก —"}
                </option>

                {doctors.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    {d.name} {d.specialty?.name ? `• ${d.specialty.name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">3) เลือกวันที่ต้องการ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={doctorId === ""}
                className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">4) เลือกช่วงเวลา (ทุก 30 นาที)</label>

              {doctorId === "" || !date ? (
                <div className="mt-2 rounded-xl border bg-gray-50 px-3 py-3 text-sm text-gray-600">
                  กรุณาเลือก “หมอ” และ “วันที่” ก่อน เพื่อดูเวลาว่าง
                </div>
              ) : loadingSlots ? (
                <div className="mt-2 rounded-xl border bg-gray-50 px-3 py-3 text-sm text-gray-600">กำลังโหลดเวลาว่าง...</div>
              ) : slots.length === 0 ? (
                <div className="mt-2 rounded-xl border bg-gray-50 px-3 py-3 text-sm text-gray-600">
                  ไม่มีเวลาว่างในวันนี้ (หรือเวลาที่เหลือเลยเวลาปัจจุบันแล้ว)
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => {
                    const active = time === s.time;
                    return (
                      <button
                        key={s.time}
                        type="button"
                        onClick={() => setTime(s.time)}
                        className={[
                          "rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50",
                          active ? "bg-black text-white border-black" : "bg-white",
                        ].join(" ")}
                      >
                        {s.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "กำลังส่งคำขอ..." : "Submit ส่งไปหาแพทย์"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">สรุปการจอง</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-500">Department</span>
              <span className="font-semibold">{selectedDepartmentName}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-500">แพทย์</span>
              <span className="font-semibold">{selectedDoctorName}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-500">Specialty</span>
              <span className="font-semibold">{selectedDoctorSpec}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-500">วันที่/เวลา</span>
              <span className="font-semibold">
                {date ? date : "—"} {time ? time : ""}
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
