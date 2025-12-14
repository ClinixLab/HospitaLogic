// app/doctors/appointments/[appointment_id]/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireLogin } from "@/app/api/_helpers/auth";
import TreatmentForm from "./treatment-form";

export default async function Page(props: {
  params: Promise<{ appointment_id: string }>;
  searchParams?: Promise<{ return?: string }>;
}) {
  const { appointment_id: rawId } = await props.params;
  const sp = props.searchParams ? await props.searchParams : {};
  const returnUrl = sp?.return || "/doctors/requests?view=today";

  const auth = await requireLogin();
  if (!auth.ok) redirect(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`);

  const me = auth.login;
  if (String(me.role || "").toUpperCase() !== "DOCTOR") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-extrabold text-slate-900">ไม่มีสิทธิ์</div>
          <div className="mt-2 text-sm text-slate-600">หน้านี้สำหรับ DOCTOR เท่านั้น</div>
        </div>
      </main>
    );
  }

  const appointment_id = Number(rawId);
  if (!Number.isFinite(appointment_id)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          appointment_id ไม่ถูกต้อง (ได้รับ: {String(rawId)})
        </div>
      </main>
    );
  }

  const appt = await prisma.appointment.findUnique({
    where: { appointment_id },
    include: {
      patient: { select: { patient_id: true, name: true, phone: true, gender: true } },
      doctor: { select: { doctor_id: true, name: true } },
    },
  });

  if (!appt) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          ไม่พบ appointment #{appointment_id}
        </div>
      </main>
    );
  }

  if (appt.doctor_id !== me.user_id) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          ไม่สามารถเปิดนัดของหมอคนอื่นได้
        </div>
      </main>
    );
  }

  const diagnoses = await prisma.diagnosis.findMany({ orderBy: [{ code: "asc" }] });
  const medicines = await prisma.medicine.findMany({
    orderBy: [{ name: "asc" }],
    select: { medicine_id: true, name: true, quantity: true, price: true },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-emerald-50 via-white to-white p-8 shadow-sm">
        <div className="text-center">
          <div className="text-sm text-slate-500">บันทึกการรักษา (Treatment)</div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {appt.patient.name} • {new Date(appt.date).toLocaleDateString("th-TH")} • {appt.time}
          </h1>

          <div className="mt-5 flex justify-center">
            <a
              href={returnUrl}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            >
              กลับ
            </a>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <TreatmentForm
          appointment_id={appt.appointment_id}
          returnUrl={returnUrl}
          symptom={appt.symptom || ""} // ✅ NEW
          patient={{
            patient_id: appt.patient.patient_id,
            name: appt.patient.name,
            phone: appt.patient.phone,
            gender: String(appt.patient.gender),
          }}
          diagnoses={diagnoses}
          medicines={medicines.map((m) => ({ ...m, price: String(m.price) }))}
        />
      </section>
    </main>
  );
}
