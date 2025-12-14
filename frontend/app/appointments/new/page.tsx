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

// ✅ รองรับ 2 รูปแบบ: "YYYY-MM-DD" และ "dd/mm/yyyy"
function normalizeToYMD(v: string) {
  const s = String(v || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

// ✅ แสดงผล dd/mm/yyyy แบบชัวร์ (ไม่ขึ้นกับ device)
function formatDMYFromYMD(v: string) {
  const s = String(v || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

async function readJsonSafe(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export default function NewAppointmentPage() {
  const router = useRouter();

  const [symptoms, setSymptoms] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [doctorId, setDoctorId] = useState<string>("");

  // ⭐ จะพิมพ์เป็น dd/mm/yyyy หรือจะเป็น YYYY-MM-DD ก็ได้
  const [dateInput, setDateInput] = useState("");
  const [time, setTime] = useState("");

  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedDoctor = useMemo(
    () => (doctorId ? doctors.find((d) => d.doctor_id === doctorId) ?? null : null),
    [doctorId, doctors]
  );

  const dateYmd = useMemo(() => normalizeToYMD(dateInput), [dateInput]);

  const canSubmit = useMemo(() => {
    return (
      symptoms.trim().length > 0 &&
      departmentId !== "" &&
      doctorId !== "" &&
      dateYmd &&
      time &&
      !submitting
    );
  }, [symptoms, departmentId, doctorId, dateYmd, time, submitting]);

  // load departments
  useEffect(() => {
    (async () => {
      setLoadingDept(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/departments", { credentials: "include" });
        if (res.status === 401) return router.push("/login");

        const data = await readJsonSafe(res);
        if (!res.ok) {
          setErrorMsg(data?.message ?? "โหลดรายการ Department ไม่สำเร็จ");
          return;
        }
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
    setDateInput("");
    setTime("");
    setSlots([]);

    if (departmentId === "") return;

    (async () => {
      setLoadingDoc(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/doctors?department_id=${departmentId}`, { credentials: "include" });
        if (res.status === 401) return router.push("/login");

        const data = await readJsonSafe(res);
        if (!res.ok) {
          setErrorMsg(data?.message ?? "โหลดรายชื่อหมอไม่สำเร็จ");
          return;
        }

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

    if (doctorId === "" || !dateYmd) return;

    (async () => {
      setLoadingSlots(true);
      setErrorMsg(null);

      try {
        const res = await fetch(
          `/api/appointments/slots?doctor_id=${doctorId}&date=${dateYmd}`,
          { credentials: "include" }
        );

        if (res.status === 401) return router.push("/login");

        const data = await readJsonSafe(res);
        if (!res.ok) {
          // ✅ สำคัญมาก: ถ้า date format ผิด จะเห็นข้อความทันที
          setErrorMsg(data?.message ?? "โหลดเวลาว่างไม่สำเร็จ");
          setSlots([]);
          return;
        }

        const fetched: Slot[] = data.slots ?? [];

        // ปิดเวลาที่เลยแล้วตามเวลาเครื่องผู้ใช้ (เฉพาะวันนี้)
        const today = todayYMDLocal();
        const now = new Date();
        const minMinsToday = nextHalfHourMinutes(now);

        let filtered = fetched;
        if (dateYmd < today) filtered = [];
        if (dateYmd === today) filtered = fetched.filter((s) => toMinutes(s.time) >= minMinsToday);

        setSlots(filtered);
        setTime((prev) => (prev && filtered.some((s) => s.time === prev) ? prev : ""));
      } catch {
        setErrorMsg("โหลดเวลาว่างไม่สำเร็จ");
      } finally {
        setLoadingSlots(false);
      }
    })();
  }, [doctorId, dateYmd, router]);

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
          symptoms,
          doctor_id: doctorId,
          date: dateYmd, // ✅ ส่งแบบ YYYY-MM-DD แน่นอน
          time,
        }),
      });

      if (res.status === 401) return router.push("/login");

      const data = await readJsonSafe(res);
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
              <label className="text-sm font-semibold">3) เลือกวันที่ต้องการ (dd/mm/yyyy)</label>

              {/* ✅ จะพิมพ์ 20/12/2025 ก็ได้ หรือใช้ YYYY-MM-DD ก็ได้ */}
              <input
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                disabled={doctorId === ""}
                inputMode="numeric"
                placeholder="เช่น 20/12/2025"
                className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring disabled:bg-gray-50"
              />

              {!dateInput ? null : !dateYmd ? (
                <div className="mt-1 text-xs text-rose-600">
                  รูปแบบวันที่ไม่ถูกต้อง (ควรเป็น dd/mm/yyyy หรือ YYYY-MM-DD)
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-semibold">4) เลือกช่วงเวลา (ทุก 30 นาที)</label>

              {doctorId === "" || !dateYmd ? (
                <div className="mt-2 rounded-xl border bg-gray-50 px-3 py-3 text-sm text-gray-600">
                  กรุณาเลือก “หมอ” และ “วันที่” ให้ถูกต้องก่อน เพื่อดูเวลาว่าง
                </div>
              ) : loadingSlots ? (
                <div className="mt-2 rounded-xl border bg-gray-50 px-3 py-3 text-sm text-gray-600">
                  กำลังโหลดเวลาว่าง...
                </div>
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
                {dateYmd ? formatDMYFromYMD(dateYmd) : "—"} {time ? time : ""}
              </span>
            </div>

            {/* ช่วย debug เฉพาะตอน dev */}
            {/* <div className="text-xs text-gray-400">debug dateYmd: {dateYmd || "-"}</div> */}
          </div>
        </div>
      </form>
    </div>
  );
}
