"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "signin" | "signup";

const ROLES = [
  { value: "PATIENT", label: "Patient" },
  { value: "DOCTOR", label: "Doctor" },
] as const;


export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode = (searchParams.get("mode") as Mode) || "signin";
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [mode, setMode] = useState<Mode>(initialMode);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // signup only
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("PATIENT");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // sync mode with url (optional nice-to-have)
    const m = (searchParams.get("mode") as Mode) || "signin";
    setMode(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const title = useMemo(() => (mode === "signin" ? "Sign in" : "Sign up"), [mode]);

  function switchMode(next: Mode) {
    setError(null);
    setMode(next);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("mode", next);
    router.replace(`/login?${params.toString()}`);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username: username.trim(),
        password,
        callbackUrl,
      });

      if (!res?.ok) {
        setError("Username หรือ Password ไม่ถูกต้อง");
        return;
      }

      router.push(res.url ?? callbackUrl);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const u = username.trim();

    if (u.length < 3 || u.length > 30) {
      setError("Username ต้องยาว 3–30 ตัวอักษร");
      return;
    }
    if (password.length < 8) {
      setError("Password ต้องยาวอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password กับ Confirm password ไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password, role }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data?.error || "Sign up ไม่สำเร็จ");
        return;
      }

      // auto sign-in after signup
      const res = await signIn("credentials", {
        redirect: false,
        username: u,
        password,
        callbackUrl,
      });

      if (!res?.ok) {
        // สมัครผ่าน แต่ล็อกอินออโต้ไม่ผ่าน ก็พาไปหน้า sign in
        switchMode("signin");
        setError(null);
        return;
      }

      router.push(res.url ?? callbackUrl);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-[420px] rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_40px_rgba(2,6,23,0.08)] p-6">
        <div className="text-center mb-5">
          <div className="text-xs text-slate-500">Welcome to</div>
          <div className="text-2xl font-extrabold tracking-tight text-emerald-600">
            HospitaLogic
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center justify-center">
          <div className="w-full rounded-full bg-slate-100 p-1 flex">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={[
                "flex-1 rounded-full py-2 text-sm font-semibold transition",
                mode === "signin"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={[
                "flex-1 rounded-full py-2 text-sm font-semibold transition",
                mode === "signup"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              Sign up
            </button>
          </div>
        </div>

        <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>

          {mode === "signup" && (
            <>
              <div>
                <label className="text-sm font-semibold text-slate-700">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={[
              "w-full rounded-xl py-3 text-sm font-semibold text-white transition",
              "bg-gradient-to-r from-blue-600 via-teal-500 to-green-500",
              "hover:brightness-[1.03] active:brightness-[0.98]",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {loading ? "Please wait..." : title}
          </button>

          {/* No Google auth section */}
          <div className="pt-2 text-center text-[11px] leading-relaxed text-slate-400">
            By continuing, you agree to our terms of service and privacy policy
          </div>
        </form>
      </div>
    </div>
  );
}
