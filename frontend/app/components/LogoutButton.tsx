"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 active:bg-slate-700 transition"
      title="ออกจากระบบ"
    >
      <span className="hidden sm:inline">ออกจากระบบ</span>
      <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-95">
        <path
          fill="currentColor"
          d="M10 17v-2h4v-6h-4V7l-5 5zM20 3h-8a2 2 0 0 0-2 2v2h2V5h8v14h-8v-2h-2v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"
        />
      </svg>
    </button>
  );
}
