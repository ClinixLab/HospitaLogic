"use client";

import { useEffect, useState } from "react";

export default function BillsPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/bills")
      .then(r => r.json())
      .then(setRows);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Bills</h1>
      <table className="w-full bg-white shadow text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 border">Bill ID</th>
            <th className="px-3 py-2 border">Patient</th>
            <th className="px-3 py-2 border">Total</th>
            <th className="px-3 py-2 border">Status</th>
            <th className="px-3 py-2 border">Date</th>
            <th className="px-3 py-2 border">Treatments</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(b => (
            <tr key={b.bill_id} className="hover:bg-slate-50">
              <td className="px-3 py-2 border">{b.bill_id}</td>
              <td className="px-3 py-2 border">{b.patient?.name}</td>
              <td className="px-3 py-2 border">{b.total_amount}</td>
              <td className="px-3 py-2 border">{b.payment_status}</td>
              <td className="px-3 py-2 border">
                {new Date(b.bill_date).toLocaleDateString()}
              </td>
              <td className="px-3 py-2 border">
                {b.treatments
                  .map((bt: any) => bt.treatment?.treatment_id)
                  .join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
