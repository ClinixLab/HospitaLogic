// app/access-log/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type PatientOpt = { patient_id: string; name: string };

type AccessLogItem = {
  access_id: number;
  user_id: string;
  username?: string | null;

  action?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;

  // enrich from API
  treatment_id?: number | null;
  diagnosis_id?: number | null;
  diagnosis_code?: string | null;
  diagnosis_description?: string | null;

  access_time: string; // ISO
};

async function readJsonSafe(res: Response) {
  const t = await res.text().catch(() => "");
  if (!t) return {};
  try {
    return JSON.parse(t);
  } catch {
    return { message: t };
  }
}

function fmtTH(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AccessLogPage() {
  const router = useRouter();
  const { status } = useSession();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [role, setRole] = useState<string>("");
  const [patients, setPatients] = useState<PatientOpt[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>(""); // doctor only

  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function load(patientId?: string) {
    setLoading(true);
    setErrorMsg(null);

    try {
      const qs = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
      const res = await fetch(`/api/access-log${qs}`, { credentials: "include", cache: "no-store" });

      if (res.status === 401) return router.push("/login");
      const data = await readJsonSafe(res);

      if (!res.ok) {
        setErrorMsg(data?.message ?? `โหลดไม่สำเร็จ (${res.status})`);
        setRole("");
        setPatients([]);
        setLogs([]);
        return;
      }

      setRole(String(data.role ?? ""));
      setPatients(Array.isArray(data.patients) ? data.patients : []);
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch {
      setErrorMsg("โหลดไม่สำเร็จ (network/error)");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!role) return;
    if (role !== "DOCTOR") return;
    load(selectedPatient || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient, role]);

  const patientNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of patients) m.set(p.patient_id, p.name);
    return m;
  }, [patients]);

  function whoLabel(l: AccessLogItem) {
    const name = patientNameMap.get(l.user_id);
    if (l.username && name) return `${l.username} • ${name}`;
    if (l.username) return l.username;
    if (name) return name;
    return l.user_id;
  }

  function diagnosisLabel(l: AccessLogItem) {
    if (!l.diagnosis_id) return "—";
    const code = l.diagnosis_code ? `${l.diagnosis_code}` : "";
    const desc = l.diagnosis_description ? `${l.diagnosis_description}` : "";
    return [String(l.diagnosis_id), code, desc].filter(Boolean).join(" • ");
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return logs;

    return logs.filter((l) => {
      const who = whoLabel(l).toLowerCase();
      const action = String(l.action ?? "").toLowerCase();
      const entity = `${String(l.entity_type ?? "")}#${String(l.entity_id ?? "")}`.toLowerCase();
      const diag = diagnosisLabel(l).toLowerCase();
      const time = String(l.access_time ?? "").toLowerCase();
      const id = String(l.access_id ?? "").toLowerCase();

      return who.includes(query) || action.includes(query) || entity.includes(query) || diag.includes(query) || time.includes(query) || id.includes(query);
    });
  }, [logs, q, patients]); // patients affects whoLabel

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Access Log</h1>
          <p className="mt-1 text-sm text-gray-500">คนไข้เห็นของตัวเอง • หมอสามารถดูของคนไข้ที่เคยนัดกับตนได้</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => load(selectedPatient || undefined)}
            disabled={loading}
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            รีเฟรช
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหา: username/ชื่อคนไข้/action/entity/diagnosis/id..."
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
            />
          </div>

          {role === "DOCTOR" ? (
            <div>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
              >
                <option value="">— คนไข้ทั้งหมด —</option>
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-sm text-gray-600 flex items-center justify-end">
              Role: <span className="ml-2 font-bold">{role || "—"}</span>
            </div>
          )}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="rounded-xl border bg-gray-50 px-4 py-4 text-sm text-gray-600">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border bg-gray-50 px-4 py-6 text-sm text-gray-600">ไม่พบรายการ</div>
          ) : (
            <div className="overflow-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 border text-left">เวลา</th>
                    <th className="px-3 py-2 border text-left">ผู้ใช้ (Username)</th>
                    <th className="px-3 py-2 border text-left">Action</th>
                    <th className="px-3 py-2 border text-left">Entity</th>
                    <th className="px-3 py-2 border text-left">Diagnosis</th>
                    <th className="px-3 py-2 border text-left">Log ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={String(l.access_id)} className="hover:bg-slate-50">
                      <td className="px-3 py-2 border whitespace-nowrap">{fmtTH(l.access_time)}</td>
                      <td className="px-3 py-2 border">{whoLabel(l)}</td>
                      <td className="px-3 py-2 border">{l.action ?? "—"}</td>
                      <td className="px-3 py-2 border">
                        {l.entity_type ? `${l.entity_type}#${l.entity_id ?? ""}` : "—"}
                        {l.treatment_id ? (
                          <div className="text-xs text-gray-500">treatment_id: {l.treatment_id}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 border">{diagnosisLabel(l)}</td>
                      <td className="px-3 py-2 border">{String(l.access_id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-500">แสดงล่าสุดไม่เกิน 300 รายการ</div>
      </div>
    </div>
  );
}
