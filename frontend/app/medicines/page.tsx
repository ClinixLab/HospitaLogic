"use client";

import { useEffect, useState } from "react";

export default function MedicinesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/medicines");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed: ${res.status}`);
        }
        const data = await res.json();
        setRows(data);
      } catch (e: any) {
        console.error("MedicinesPage error:", e);
        setError(e.message ?? "Failed to load medicines");
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Medicines</h1>

      {error && (
        <p className="mb-4 text-sm text-red-600">
          Error: {error}
        </p>
      )}

      <table className="w-full bg-white shadow text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 border">ID</th>
            <th className="px-3 py-2 border">Name</th>
            <th className="px-3 py-2 border">Stock</th>
            <th className="px-3 py-2 border">Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.medicine_id} className="hover:bg-slate-50">
              <td className="px-3 py-2 border">{m.medicine_id}</td>
              <td className="px-3 py-2 border">{m.name}</td>
              <td className="px-3 py-2 border">{m.quantity}</td>
              <td className="px-3 py-2 border">{m.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
