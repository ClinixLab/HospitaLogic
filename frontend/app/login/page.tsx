"use client";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      setMsg("Invalid username or password");
      return;
    }

    const data = await res.json();
    // demo: just store in localStorage
    localStorage.setItem("user", JSON.stringify(data));
    setMsg(`Logged in as ${data.username} (${data.role})`);
  }

  return (
    <div className="max-w-md mx-auto bg-white shadow rounded p-6">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Username</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        <button className="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700">
          Login
        </button>
      </form>
      {msg && <p className="mt-4 text-sm text-slate-700">{msg}</p>}
    </div>
  );
}
