"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import LogoutButton from "../components/LogoutButton";

type NavUser = {
  username?: string;
  role?: "PATIENT" | "DOCTOR";
};

function roleLabel(role?: string) {
  return role === "DOCTOR" ? "Doctor" : "Patient";
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const user = (session?.user ?? null) as any as NavUser | null;

  const isLoggedIn = status === "authenticated" && !!user?.username;
  const role: "PATIENT" | "DOCTOR" = (user?.role ?? "PATIENT") as any;

  const items = !isLoggedIn
    ? [
        { href: "/", label: "หน้าแรก" },
        { href: "/appointments/new", label: "จองนัด" },
        { href: "/doctors", label: "รายชื่อแพทย์" },
      ]
    : role === "DOCTOR"
    ? [
        { href: "/", label: "หน้าแรก" },
        { href: "/doctors", label: "รายชื่อแพทย์" },
        { href: "/medicines", label: "รายการยา" },
        { href: "/settings", label: "ตั้งค่า" }, 
      ]
    : [
        { href: "/", label: "หน้าแรก" },
        { href: "/appointments/new", label: "จองนัด" },
        { href: "/doctors", label: "รายชื่อแพทย์" },
        { href: "/bills", label: "บิล/การชำระเงิน" },
         { href: "/settings", label: "ตั้งค่า" }, 
      ];

  return (
    <header className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          {/* brand */}
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-700 text-white flex items-center justify-center font-extrabold">
              H
            </div>
            <div className="leading-tight">
              <div className="text-xl font-extrabold text-slate-900">
                HospitaLogic
              </div>
              <div className="text-sm text-slate-500">
                ระบบจัดการโรงพยาบาล • จองนัด • การรักษา • ใบแจ้งหนี้
              </div>

              {status === "loading" ? (
                <div className="mt-1 text-xs text-slate-400">กำลังตรวจสอบสถานะ...</div>
              ) : isLoggedIn ? (
                <div className="mt-1 text-xs text-emerald-700 font-semibold">
                  Logged in: {user?.username} ({roleLabel(role)})
                </div>
              ) : (
                <div className="mt-1 text-xs text-slate-400">ยังไม่ได้เข้าสู่ระบบ</div>
              )}
            </div>
          </div>

          {/* pill nav */}
          <div className="flex items-center gap-3">
            <nav className="hidden lg:flex items-center gap-1 rounded-full bg-slate-900 px-2 py-2 shadow-lg">
              {items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className="px-4 py-2 rounded-full text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 transition"
                >
                  {it.label}
                </Link>
              ))}
            </nav>

            {isLoggedIn ? (
              <LogoutButton />
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition shadow-lg"
              >
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-slate-200" />
    </header>
  );
}
