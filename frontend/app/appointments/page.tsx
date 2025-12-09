"use client";

import { useEffect, useState } from "react";

export default function AppointmentsPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/appointments")
      .then(r => r.json())
      .then(setRows);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Appointments</h1>
      <table className="w-full bg-white shadow text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 border">ID</th>
            <th className="px-3 py-2 border">Patient</th>
            <th className="px-3 py-2 border">Doctor</th>
            <th className="px-3 py-2 border">Date</th>
            <th className="px-3 py-2 border">Time</th>
            <th className="px-3 py-2 border">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(a => (
            <tr key={a.appointment_id} className="hover:bg-slate-50">
              <td className="px-3 py-2 border">{a.appointment_id}</td>
              <td className="px-3 py-2 border">{a.patient?.name}</td>
              <td className="px-3 py-2 border">{a.doctor?.name}</td>
              <td className="px-3 py-2 border">{new Date(a.date).toLocaleDateString()}</td>
              <td className="px-3 py-2 border">{a.time}</td>
              <td className="px-3 py-2 border">{a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
