"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Department = { department_id: number; name: string; location: string };
type Specialty = { specialty_id: number; name: string; description: string };

export default function SettingsPage() {
  const router = useRouter();
  const { status } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [role, setRole] = useState<"PATIENT" | "DOCTOR" | null>(null);

  // patient fields
  const [pName, setPName] = useState("");
  const [pGender, setPGender] = useState("");
  const [pPhone, setPPhone] = useState("");

  const [piiEnabled, setPiiEnabled] = useState(false);
  const [piiDOB, setPiiDOB] = useState("");     // YYYY-MM-DD
  const [piiAddress, setPiiAddress] = useState("");

  // doctor fields
  const [dName, setDName] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [specialtyId, setSpecialtyId] = useState<number | "">("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);
      setOkMsg(null);

      try {
        const res = await fetch("/api/profile", { credentials: "include" });
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data?.message ?? "โหลดข้อมูลไม่สำเร็จ");
          return;
        }

        const r = data.role as "PATIENT" | "DOCTOR";
        setRole(r);

        if (r === "PATIENT") {
          const profile = data.profile;
          setPName(profile?.name ?? "");
          setPGender(profile?.gender ?? "");
          setPPhone(profile?.phone ?? "");

          const pii = profile?.pii ?? null;
          setPiiEnabled(!!pii);
          setPiiDOB(pii?.DOB ? String(pii.DOB).slice(0, 10) : "");
          setPiiAddress(pii?.address ?? "");
        } else {
          const profile = data.profile;
          setDName(profile?.name ?? "");
          setDPhone(profile?.phone ?? "");
          setDepartmentId(profile?.department_id ?? "");
          setSpecialtyId(profile?.specialty_id ?? "");

          // โหลด dropdown doctor
          const [dRes, sRes] = await Promise.all([
            fetch("/api/departments", { credentials: "include" }),
            fetch("/api/specialties", { credentials: "include" }),
          ]);
          const dJson = await dRes.json();
          const sJson = await sRes.json();
          setDepartments(dJson.departments ?? []);
          setSpecialties(sJson.specialties ?? []);
        }
      } catch {
        setErrorMsg("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  const canSave = useMemo(() => {
    if (!role) return false;

    if (role === "PATIENT") {
      if (!pName.trim() || !pGender.trim() || !pPhone.trim()) return false;
      if (piiEnabled) {
        if (!piiDOB || !piiAddress.trim()) return false;
      }
      return true;
    }

    if (role === "DOCTOR") {
      if (!dName.trim() || !dPhone.trim()) return false;
      if (departmentId === "" || specialtyId === "") return false;
      return true;
    }

    return false;
  }, [role, pName, pGender, pPhone, piiEnabled, piiDOB, piiAddress, dName, dPhone, departmentId, specialtyId]);

  async function onSave() {
    if (!canSave || saving) return;

    setSaving(true);
    setErrorMsg(null);
    setOkMsg(null);

    try {
      let payload: any = {};

      if (role === "PATIENT") {
        payload = {
          name: pName.trim(),
          gender: pGender.trim(),
          phone: pPhone.trim(),
          pii_enabled: piiEnabled,
        };
        if (piiEnabled) {
          payload.DOB = `${piiDOB}T00:00:00`;
          payload.address = piiAddress.trim();
        }
      } else if (role === "DOCTOR") {
        payload = {
          name: dName.trim(),
          phone: dPhone.trim(),
          department_id: Number(departmentId),
          specialty_id: Number(specialtyId),
        };
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.message ?? "บันทึกไม่สำเร็จ");
        return;
      }

      setOkMsg("บันทึกสำเร็จ");
    } catch {
      setErrorMsg("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (status !== "authenticated") return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">ตั้งค่าบัญชีผู้ใช้</h1>
      <p className="mt-1 text-sm text-gray-500">
        แก้ไขข้อมูลให้ครบตาม role ของคุณ เพื่อใช้งานระบบได้สมบูรณ์
      </p>

      {loading ? (
        <div className="mt-6 rounded-2xl border bg-white p-6">กำลังโหลด...</div>
      ) : (
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          {okMsg && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {okMsg}
            </div>
          )}

          {role === "PATIENT" && (
            <div className="space-y-5">
              <div className="text-lg font-bold">ข้อมูลผู้ป่วย</div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">ชื่อ</label>
                  <input
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                    placeholder="ชื่อ-นามสกุล"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">เพศ</label>
                  <input
                    value={pGender}
                    onChange={(e) => setPGender(e.target.value)}
                    className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                    placeholder="Male/Female/..."
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold">เบอร์โทร</label>
                <input
                  value={pPhone}
                  onChange={(e) => setPPhone(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                  placeholder="08x-xxx-xxxx"
                />
              </div>

              <div className="rounded-2xl border bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">ข้อมูลส่วนตัว (PII)</div>
                    <div className="text-xs text-gray-600">DOB และที่อยู่ (ถ้าเปิด ต้องกรอกครบ)</div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={piiEnabled}
                      onChange={(e) => setPiiEnabled(e.target.checked)}
                      className="h-4 w-4"
                    />
                    เปิดใช้งาน
                  </label>
                </div>

                {piiEnabled && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold">วันเกิด (DOB)</label>
                      <input
                        type="date"
                        value={piiDOB}
                        onChange={(e) => setPiiDOB(e.target.value)}
                        className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold">ที่อยู่</label>
                      <input
                        value={piiAddress}
                        onChange={(e) => setPiiAddress(e.target.value)}
                        className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                        placeholder="บ้านเลขที่/ถนน/จังหวัด..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {role === "DOCTOR" && (
            <div className="space-y-5">
              <div className="text-lg font-bold">ข้อมูลแพทย์</div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">ชื่อ</label>
                  <input
                    value={dName}
                    onChange={(e) => setDName(e.target.value)}
                    className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                    placeholder="Dr. ..."
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">เบอร์โทร</label>
                  <input
                    value={dPhone}
                    onChange={(e) => setDPhone(e.target.value)}
                    className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : "")}
                    className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                  >
                    <option value="">— เลือก —</option>
                    {departments.map((d) => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">Specialty</label>
                  <select
                    value={specialtyId}
                    onChange={(e) => setSpecialtyId(e.target.value ? Number(e.target.value) : "")}
                    className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                  >
                    <option value="">— เลือก —</option>
                    {specialties.map((s) => (
                      <option key={s.specialty_id} value={s.specialty_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                หมายเหตุ: ระบบจะ validate ว่า department/specialty มีอยู่จริงก่อนบันทึก
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onSave}
              disabled={!canSave || saving}
              className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
