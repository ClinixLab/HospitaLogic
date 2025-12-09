"use client";

import { useEffect, useState } from "react";

export default function AccessLogPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/access-log")
      .then(r => r.json())
      .then(setRows);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Access Log</h1>
      <table className="w-full bg-white shadow text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 border">Time</th>
            <th className="px-3 py-2 border">User</th>
            <th className="px-3 py-2 border">Role</th>
            <th className="px-3 py-2 border">Entity</th>
            <th className="px-3 py-2 border">Entity ID</th>
            <th className="px-3 py-2 border">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(log => (
            <tr key={log.access_id} className="hover:bg-slate-50">
              <td className="px-3 py-2 border">
                {new Date(log.access_time).toLocaleString()}
              </td>
              <td className="px-3 py-2 border">{log.user?.username}</td>
              <td className="px-3 py-2 border">{log.user?.role}</td>
              <td className="px-3 py-2 border">{log.entity_type}</td>
              <td className="px-3 py-2 border">{log.entity_id}</td>
              <td className="px-3 py-2 border">{log.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
