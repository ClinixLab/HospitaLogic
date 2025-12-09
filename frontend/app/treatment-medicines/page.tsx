"use client";

import { useEffect, useState } from "react";

export default function TreatmentMedicinesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [treatmentId, setTreatmentId] = useState("");

  async function load() {
    const url = treatmentId
      ? `/api/treatment-medicines?treatment_id=${treatmentId}`
      : "/api/treatment-medicines";
    const r = await fetch(url);
    setRows(await r.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Treatment Medicines</h1>

      <div className="mb-4 flex items-center gap-2">
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Filter by treatment id"
          value={treatmentId}
          onChange={e => setTreatmentId(e.target.value)}
        />
        <button
          onClick={load}
          className="bg-emerald-600 text-white text-sm px-3 py-1 rounded"
        >
          Search
        </button>
      </div>

      <table className="w-full bg-white shadow text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 border">TM ID</th>
            <th className="px-3 py-2 border">Treatment</th>
            <th className="px-3 py-2 border">Patient</th>
            <th className="px-3 py-2 border">Doctor</th>
            <th className="px-3 py-2 border">Medicine</th>
            <th className="px-3 py-2 border">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any) => (
            <tr key={row.treatment_medicine_id} className="hover:bg-slate-50">
              <td className="px-3 py-2 border">{row.treatment_medicine_id}</td>
              <td className="px-3 py-2 border">{row.treatment_id}</td>
              <td className="px-3 py-2 border">{row.treatment?.patient?.name}</td>
              <td className="px-3 py-2 border">{row.treatment?.doctor?.name}</td>
              <td className="px-3 py-2 border">{row.medicine?.name}</td>
              <td className="px-3 py-2 border">{row.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
