"use client";

import { useEffect, useState } from "react";

type Doctor = {
  doctor_id: string; 
  name: string;
  phone: string;
  department?: { department_id: number; name: string };
  specialty?: { specialty_id: number; name: string };
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await fetch("/api/doctors", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setErrorMsg(data?.message ?? `โหลดไม่สำเร็จ (${res.status})`);
          setDoctors([]);
          return;
        }

        setDoctors(Array.isArray(data?.doctors) ? data.doctors : []);
      } catch {
        setErrorMsg("โหลดรายชื่อแพทย์ไม่สำเร็จ");
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-bold mb-4">Doctors</h1>

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 border">ID</th>
              <th className="px-3 py-2 border">Name</th>
              <th className="px-3 py-2 border">Phone</th>
              <th className="px-3 py-2 border">Department</th>
              <th className="px-3 py-2 border">Specialty</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                  กำลังโหลด...
                </td>
              </tr>
            ) : doctors.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                  ไม่มีรายชื่อแพทย์
                </td>
              </tr>
            ) : (
              doctors.map((d) => (
                <tr key={d.doctor_id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 border font-mono text-xs">{d.doctor_id}</td>
                  <td className="px-3 py-2 border">{d.name}</td>
                  <td className="px-3 py-2 border">{d.phone}</td>
                  <td className="px-3 py-2 border">{d.department?.name ?? "-"}</td>
                  <td className="px-3 py-2 border">{d.specialty?.name ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
