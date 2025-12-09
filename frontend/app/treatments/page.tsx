"use client";

import { useEffect, useState } from "react";

export default function TreatmentsPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/treatments")
      .then(r => r.json())
      .then(setRows);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Treatments</h1>
      <table className="w-full bg-white shadow text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 border">ID</th>
            <th className="px-3 py-2 border">Patient</th>
            <th className="px-3 py-2 border">Doctor</th>
            <th className="px-3 py-2 border">Diagnosis</th>
            <th className="px-3 py-2 border">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(t => (
            <tr key={t.treatment_id} className="hover:bg-slate-50">
              <td className="px-3 py-2 border">{t.treatment_id}</td>
              <td className="px-3 py-2 border">{t.patient?.name}</td>
              <td className="px-3 py-2 border">{t.doctor?.name}</td>
              <td className="px-3 py-2 border">{t.diagnosis?.description}</td>
              <td className="px-3 py-2 border">
                {new Date(t.treatment_date).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
