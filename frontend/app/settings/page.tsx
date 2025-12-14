"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

/* ---------- types ---------- */
type Role = "PATIENT" | "DOCTOR";
type Gender = "MALE" | "FEMALE" | "OTHER";

type Department = { department_id: number; name: string };
type Specialty = { specialty_id: number; name: string };

export default function SettingsPage() {
  const router = useRouter();
  const { status } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [role, setRole] = useState<Role | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  /* ---------- PATIENT ---------- */
  const [pName, setPName] = useState("");
  const [pGender, setPGender] = useState<Gender | "">("");
  const [pPhone, setPPhone] = useState("");

  const [piiEnabled, setPiiEnabled] = useState(false);
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");

  /* ---------- DOCTOR ---------- */
  const [dName, setDName] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [specialtyId, setSpecialtyId] = useState<number | "">("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  /* ---------- auth ---------- */
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  /* ---------- load profile ---------- */
  useEffect(() => {
    if (status !== "authenticated") return;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.message);
          return;
        }

        setRole(data.role);

        if (data.role === "PATIENT") {
          setPName(data.profile.name ?? "");
          setPGender(data.profile.gender ?? "");
          setPPhone(data.profile.phone ?? "");

          if (data.profile.pii) {
            setPiiEnabled(true);
            setDob(String(data.profile.pii.DOB).slice(0, 10));
            setAddress(data.profile.pii.address ?? "");
          }
        }

        if (data.role === "DOCTOR") {
          setDName(data.profile.name ?? "");
          setDPhone(data.profile.phone ?? "");
          setDepartmentId(data.profile.department_id ?? "");
          setSpecialtyId(data.profile.specialty_id ?? "");

          const d = await fetch("/api/departments").then(r => r.json());
          setDepartments(d.departments ?? []);
        }
      } catch {
        setErrorMsg("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  /* ---------- load specialties ---------- */
  useEffect(() => {
    if (role !== "DOCTOR" || !departmentId) {
      setSpecialties([]);
      setSpecialtyId("");
      return;
    }

    (async () => {
      const res = await fetch(`/api/specialties?department_id=${departmentId}`);
      const data = await res.json();
      setSpecialties(data.specialties ?? []);
    })();
  }, [role, departmentId]);

  /* ---------- validation ---------- */
  const canSave = useMemo(() => {
    if (!role) return false;

    if (role === "PATIENT") {
      if (!pName || !pGender) return false;
      if (!/^\d{10}$/.test(pPhone)) return false;
      if (piiEnabled && (!dob || !address)) return false;
    }

    if (role === "DOCTOR") {
      if (!dName || !/^\d{10}$/.test(dPhone)) return false;
      if (!departmentId || !specialtyId) return false;
    }

    return true;
  }, [
    role,
    pName,
    pGender,
    pPhone,
    piiEnabled,
    dob,
    address,
    dName,
    dPhone,
    departmentId,
    specialtyId,
  ]);

  /* ---------- save ---------- */
  async function onSave() {
    if (!canSave) return;
    setSaving(true);
    setErrorMsg(null);
    setOkMsg(null);

    const payload =
      role === "PATIENT"
        ? {
            name: pName,
            gender: pGender,
            phone: pPhone,
            pii_enabled: piiEnabled,
            DOB: piiEnabled ? `${dob}T00:00:00` : undefined,
            address: piiEnabled ? address : undefined,
          }
        : {
            name: dName,
            phone: dPhone,
            department_id: departmentId,
            specialty_id: specialtyId,
          };

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) setErrorMsg(data.message);
    else setOkMsg("บันทึกข้อมูลเรียบร้อยแล้ว");

    setSaving(false);
  }

  if (loading) return <div className="p-10">กำลังโหลด...</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500">จัดการข้อมูลบัญชีของคุณ</p>
      </header>

      {errorMsg && <Alert color="red">{errorMsg}</Alert>}
      {okMsg && <Alert color="green">{okMsg}</Alert>}

      {/* ================= PATIENT ================= */}
      {role === "PATIENT" && (
        <>
          <Card title="Profile">
            <EditableField label="ชื่อ-นามสกุล" value={pName} onChange={setPName} />

            <EditableField
              label="เบอร์โทร"
              value={pPhone}
              onChange={(v: string) => {
                if (!/^\d*$/.test(v)) return;
                if (v.length > 10) return;
                setPPhone(v);
              }}
              hint="ตัวเลข 10 หลัก"
            />

            <Field label="เพศ">
              <select
                value={pGender}
                onChange={e => setPGender(e.target.value as Gender)}
              >
                <option value="">— เลือกเพศ —</option>
                <option value="MALE">ชาย</option>
                <option value="FEMALE">หญิง</option>
                <option value="OTHER">อื่น ๆ</option>
              </select>
            </Field>
          </Card>

          <Card title="ข้อมูลส่วนตัว (Privacy)" subtle>
            <label className="flex justify-between items-center">
              <div>
                <p className="font-medium">DOB & Address</p>
                <p className="text-xs text-gray-500">ข้อมูลเพื่อการรักษา</p>
              </div>
              <input
                type="checkbox"
                checked={piiEnabled}
                onChange={e => setPiiEnabled(e.target.checked)}
              />
            </label>

            {piiEnabled && (
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <Field label="วันเกิด">
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)} />
                </Field>
                <Field label="ที่อยู่">
                  <input
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="บ้านเลขที่ / ถนน / เขต / จังหวัด / รหัสไปรษณีย์"
                  />
                </Field>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ================= DOCTOR ================= */}
      {role === "DOCTOR" && (
        <Card title="Doctor Profile">
          <EditableField label="ชื่อแพทย์" value={dName} onChange={setDName} />

          <EditableField
            label="เบอร์โทร"
            value={dPhone}
            onChange={(v: string) => {
              if (!/^\d*$/.test(v)) return;
              if (v.length > 10) return;
              setDPhone(v);
            }}
            hint="ตัวเลข 10 หลัก"
          />

          <Field label="Department">
            <select
              value={departmentId}
              onChange={e => setDepartmentId(Number(e.target.value))}
            >
              <option value="">— เลือก —</option>
              {departments.map(d => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Specialty">
            <select
              value={specialtyId}
              onChange={e => setSpecialtyId(Number(e.target.value))}
              disabled={!departmentId}
            >
              <option value="">— เลือก —</option>
              {specialties.map(s => (
                <option key={s.specialty_id} value={s.specialty_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </Card>
      )}

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={!canSave || saving}
          className="rounded-xl bg-black px-6 py-3 text-white font-semibold disabled:opacity-40"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </button>
      </div>
    </div>
  );
}

/* ---------- UI ---------- */

function Card({
  title,
  children,
  subtle,
}: {
  title: string;
  children: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-6 space-y-4 ${subtle ? "bg-gray-50" : "bg-white"}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

type EditableFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
};

function EditableField({ label, value, onChange, hint }: EditableFieldProps) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          className="w-full rounded-xl border px-4 py-3 pr-10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">✎</span>
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </Field>
  );
}

function Alert({
  color,
  children,
}: {
  color: "red" | "green";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        color === "red"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {children}
    </div>
  );
}
