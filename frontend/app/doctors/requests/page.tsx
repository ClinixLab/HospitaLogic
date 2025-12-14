"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type View = "pending" | "today" | "all";
type Me = { username?: string; role?: string };

type AppointmentItem = {
  appointment_id: number;
  date: string;
  time: string;
  status: string;
  symptom: string;
  patient: {
    patient_id: string;
    name: string;
    phone: string;
    gender: string;
  };
};

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function TabCard({
  href,
  title,
  desc,
  icon,
  badge,
  active,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  badge?: number;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "group rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition " +
        (active ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200")
      }
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          {icon}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition">
              {title}
            </div>

            {typeof badge === "number" && (
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">
                {badge}
              </div>
            )}
          </div>

          <div className="text-sm text-slate-500 mt-1">{desc}</div>
        </div>
      </div>
    </Link>
  );
}

export default function DoctorRequestsUnifiedPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const view = (sp.get("view") || "pending").toLowerCase();
  const activeView: View =
    view === "today" || view === "all" || view === "pending" ? (view as View) : "pending";

  const today = useMemo(() => todayStr(), []);

  const [me, setMe] = useState<Me | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [counts, setCounts] = useState({ pending: 0, today: 0, all: 0 });
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // กัน useEffect รันซ้ำใน dev จนทำให้ redirect แปลก ๆ
  const didInit = useRef(false);

  function callbackHere() {
    if (typeof window === "undefined") return "/doctors/requests?view=pending";
    return window.location.pathname + window.location.search;
  }

  async function loadMe() {
    setForbidden(false);

    const res = await fetch("/api/me", { cache: "no-store" });

    if (res.status === 401) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackHere())}`);
      return null;
    }

    const data = await res.json().catch(() => ({}));

    // รองรับหลายรูปแบบ response
    const u =
      data?.login ??
      data?.me ??
      data?.user ??
      data?.session?.user ??
      data ??
      {};

    const role = String(u?.role || "").toUpperCase();
    const username = u?.username ? String(u.username) : undefined;

    setMe({ username, role });

    // ✅ ไม่ redirect กลับหน้าหลักแล้ว (กัน loop)
    // แค่โชว์ forbidden แทน
    if (role && role !== "DOCTOR") {
      setForbidden(true);
      return null;
    }

    // ถ้า role หาย ก็อย่าพึ่งเด้งไหน ให้แสดง error เฉย ๆ
    if (!role) {
      setError("ROLE_MISSING (ตรวจ /api/me ว่าคืน role มาหรือไม่)");
    }

    return { username, role };
  }

  async function loadCounts() {
    const [p, t, a] = await Promise.all([
      fetch("/api/doctors/appointments?status=PENDING&count=1", { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/doctors/appointments?status=CONFIRMED&date=${today}&count=1`, { cache: "no-store" }).then((r) =>
        r.json()
      ),
      fetch("/api/doctors/appointments?status=CONFIRMED&count=1", { cache: "no-store" }).then((r) => r.json()),
    ]);

    setCounts({
      pending: Number(p?.count || 0),
      today: Number(t?.count || 0),
      all: Number(a?.count || 0),
    });
  }

  async function loadList(v: View) {
    setLoading(true);
    setError(null);

    try {
      let url = "";
      if (v === "pending") url = "/api/doctors/appointments?status=PENDING";
      if (v === "today") url = `/api/doctors/appointments?status=CONFIRMED&date=${today}`;
      if (v === "all") url = "/api/doctors/appointments?status=CONFIRMED";

      const res = await fetch(url, { cache: "no-store" });

      if (res.status === 401) {
        router.replace(`/login?callbackUrl=${encodeURIComponent(callbackHere())}`);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "Load failed");

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    await loadCounts();
    await loadList(activeView);
  }

  useEffect(() => {
    // init ครั้งแรก
    if (!didInit.current) {
      didInit.current = true;
      loadMe().then((u) => {
        if (!u || u.role !== "DOCTOR") return;
        refreshAll().catch(() => {});
      });
      return;
    }

    // เปลี่ยน tab แล้วค่อยโหลด list ใหม่ (ถ้าเป็นหมอ)
    if (forbidden) return;
    if (String(me?.role || "").toUpperCase() !== "DOCTOR") return;

    loadCounts().catch(() => {});
    loadList(activeView).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  async function decide(appointment_id: number, decision: "CONFIRM" | "DECLINE") {
    if (activeView !== "pending") return;

    if (!confirm(decision === "CONFIRM" ? "รับนัดหมายนี้?" : "ไม่รับนัดหมายนี้?")) return;

    setBusyId(appointment_id);
    setError(null);

    try {
      const res = await fetch(`/api/doctors/appointments/${appointment_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      if (res.status === 401) {
        router.replace(`/login?callbackUrl=${encodeURIComponent(callbackHere())}`);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "Action failed");

      setItems((prev) => prev.filter((x) => x.appointment_id !== appointment_id));
      await loadCounts();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  const pageTitle =
    activeView === "pending"
      ? "คำขอนัดหมาย (PENDING)"
      : activeView === "today"
      ? "นัดวันนี้ (CONFIRMED)"
      : "นัดที่ยืนยันแล้ว (ทั้งหมด)";

  const pageDesc =
    activeView === "pending"
      ? "รายการที่รอหมอรับ/ไม่รับ"
      : activeView === "today"
      ? "รายการ CONFIRMED เฉพาะวันนี้ (กดเข้าไปใส่ Treatment ได้)"
      : "รายการ CONFIRMED ทั้งหมดของคุณ";

  // ✅ ถ้าไม่ใช่หมอ ให้โชว์หน้าบอกสิทธิ์ (ไม่ redirect กลับหน้าหลัก)
  if (forbidden) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-extrabold text-slate-900">ไม่มีสิทธิ์เข้าหน้านี้</div>
          <div className="mt-2 text-sm text-slate-600">หน้านี้สำหรับ DOCTOR เท่านั้น</div>
          <div className="mt-5 flex gap-2">
            <Link
              href="/"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white"
            >
              กลับหน้าหลัก
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700"
            >
              ไปหน้า Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      {/* Hero */}
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-emerald-50 via-white to-white p-8 shadow-sm">
        <div className="text-center">
          <div className="text-sm text-slate-500">{me?.username ? `สวัสดี ${me.username}` : "สวัสดี"}</div>

          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            จัดการคิวนัดหมายและการรักษา
          </h1>

          <p className="mt-3 text-slate-600">ตรวจคำขอนัด • นัดวันนี้ • นัดที่ยืนยันแล้วทั้งหมด</p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => refreshAll().catch(() => {})}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            >
              รีเฟรช
            </button>

            <Link
              href="/"
              className="rounded-2xl bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 px-5 py-3 text-sm font-extrabold text-white
                         shadow-[0_12px_30px_rgba(16,185,129,0.25)] hover:brightness-[1.03] active:brightness-[0.98] transition"
            >
              กลับหน้าหลัก
            </Link>
          </div>

          <div className="mt-4 text-xs text-slate-400">สถานะ: Login แล้ว ✅</div>
        </div>
      </section>

      {/* Tabs */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-extrabold text-slate-900">เลือกมุมมอง</h2>
          <div className="text-sm text-slate-400">{pageTitle}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TabCard
            href="/doctors/requests?view=pending"
            title="Pending"
            desc="คำขอนัดที่รอหมอรับ/ไม่รับ"
            icon={<span className="text-xl">📥</span>}
            badge={counts.pending}
            active={activeView === "pending"}
          />
          <TabCard
            href="/doctors/requests?view=today"
            title="Today"
            desc="นัดที่ยืนยันแล้ว เฉพาะวันนี้"
            icon={<span className="text-xl">📅</span>}
            badge={counts.today}
            active={activeView === "today"}
          />
          <TabCard
            href="/doctors/requests?view=all"
            title="All"
            desc="นัดที่ยืนยันแล้วทั้งหมด"
            icon={<span className="text-xl">✅</span>}
            badge={counts.all}
            active={activeView === "all"}
          />
        </div>
      </section>

      {/* List */}
      <section className="mt-8">
        <div className="mb-3">
          <div className="text-lg font-extrabold text-slate-900">{pageTitle}</div>
          <div className="text-sm text-slate-500">{pageDesc}</div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">ไม่มีรายการ</div>
        ) : (
          <div className="grid gap-3">
            {items.map((a) => {
              const d = new Date(a.date);
              const dateStr = Number.isFinite(d.getTime())
                ? d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })
                : a.date;

              const busy = busyId === a.appointment_id;

              return (
                <div key={a.appointment_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-extrabold text-slate-900">{a.patient?.name || "ไม่ทราบชื่อ"}</div>
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">
                          #{a.appointment_id}
                        </div>
                        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                          {String(a.status).toUpperCase()}
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-slate-600">
                        วันที่: <span className="font-semibold text-slate-900">{dateStr}</span>
                        {" · "}
                        เวลา: <span className="font-semibold text-slate-900">{a.time}</span>
                        <div className="mt-1">
                          เบอร์: <span className="font-semibold text-slate-900">{a.patient?.phone || "-"}</span>
                          {" · "}
                          เพศ: <span className="font-semibold text-slate-900">{a.patient?.gender || "-"}</span>
                          {a.symptom ? (
  <div className="mt-2 text-sm text-slate-700">
    <span className="font-extrabold">อาการ:</span> {a.symptom}
  </div>
) : null}
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    {activeView === "pending" && (
                      <div className="flex gap-2">
                        <button
                          disabled={busy}
                          onClick={() => decide(a.appointment_id, "CONFIRM")}
                          className={
                            "rounded-xl px-4 py-2 text-sm font-extrabold " +
                            (busy
                              ? "bg-emerald-100 text-emerald-700 opacity-60"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")
                          }
                        >
                          {busy ? "กำลังทำ..." : "รับ"}
                        </button>

                        <button
                          disabled={busy}
                          onClick={() => decide(a.appointment_id, "DECLINE")}
                          className={
                            "rounded-xl px-4 py-2 text-sm font-extrabold " +
                            (busy
                              ? "bg-rose-100 text-rose-700 opacity-60"
                              : "bg-rose-100 text-rose-700 hover:bg-rose-200")
                          }
                        >
                          {busy ? "กำลังทำ..." : "ไม่รับ"}
                        </button>
                      </div>
                    )}

                    {activeView === "today" && (
                      <div className="flex gap-2">
                        <Link
                          href={`/doctors/appointments/${a.appointment_id}?return=${encodeURIComponent(
                            "/doctors/requests?view=today"
                          )}`}
                          className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-extrabold text-emerald-800 hover:bg-emerald-200"
                        >
                          บันทึก Treatment
                        </Link>
                      </div>
                    )}

                    {activeView === "all" && (
                      <div className="flex gap-2">
                        <Link
                          href={`/doctors/appointments/${a.appointment_id}?return=${encodeURIComponent(
                            "/doctors/requests?view=all"
                          )}`}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
                        >
                          เปิดรายละเอียด
                        </Link>
                      </div>
                    )}
                  </div>

                  {activeView === "pending" && (
                    <div className="mt-3 text-xs text-slate-400">
                      * กด “ไม่รับ” ระบบจะลบ appointment เพื่อคืนสล็อต (เพราะมี uniq_doctor_slot)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
