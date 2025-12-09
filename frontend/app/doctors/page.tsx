"use client";

import { useEffect, useState } from "react";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/doctors")
      .then(r => r.json())
      .then(setDoctors);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Doctors</h1>
      <table className="w-full bg-white shadow text-sm">
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
          {doctors.map(d => (
            <tr key={d.doctor_id} className="hover:bg-slate-50">
              <td className="px-3 py-2 border">{d.doctor_id}</td>
              <td className="px-3 py-2 border">{d.name}</td>
              <td className="px-3 py-2 border">{d.phone}</td>
              <td className="px-3 py-2 border">{d.department?.name}</td>
              <td className="px-3 py-2 border">{d.specialty?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
