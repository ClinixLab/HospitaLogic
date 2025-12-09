"use client";

import { useEffect, useState } from "react";

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/patients")
      .then(r => r.json())
      .then(setPatients);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Patients</h1>
      <table className="w-full bg-white shadow rounded overflow-hidden text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 border">ID</th>
            <th className="px-3 py-2 border">Name</th>
            <th className="px-3 py-2 border">Gender</th>
            <th className="px-3 py-2 border">Phone</th>
          </tr>
        </thead>
        <tbody>
          {patients.map(p => (
            <tr key={p.patient_id} className="hover:bg-slate-50">
              <td className="px-3 py-2 border">{p.patient_id}</td>
              <td className="px-3 py-2 border">{p.name}</td>
              <td className="px-3 py-2 border">{p.gender}</td>
              <td className="px-3 py-2 border">{p.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
