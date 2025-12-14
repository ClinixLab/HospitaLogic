// app/doctor/billing/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import BillingClient from "./BillingClient";

function money(v: any) {
  const n = Number(String(v));
  return Number.isFinite(n)
    ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n)
    : String(v);
}

export default async function DoctorBillingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/doctor/billing");

  const user = session.user as any;
  const userId = Number(user?.user_id);
  const username = user?.username;

  const login = await prisma.login.findFirst({
    where: Number.isFinite(userId) ? { user_id: userId } : { username },
    select: { doctor_id: true, username: true },
  });

  if (!login?.doctor_id) redirect("/");

  const treatments = await prisma.treatment.findMany({
    where: {
      doctor_id: login.doctor_id,
      billTreatments: { none: {} }, // ✅ ยังไม่ถูกออกบิล
    },
    orderBy: { treatment_id: "desc" },
    include: {
      patient: { select: { patient_id: true, name: true } },
      diagnosis: { select: { code: true, description: true } },
      medicines: { include: { medicine: true } },
    },
  });

  const rows = treatments.map((t) => {
    const total = t.medicines.reduce((sum, tm) => {
      const price = Number(String(tm.medicine.price));
      return sum + price * tm.quantity;
    }, 0);

    return {
      treatment_id: t.treatment_id,
      patient_id: t.patient.patient_id,
      patient_name: t.patient.name,
      diagnosis: `${t.diagnosis.code} — ${t.diagnosis.description}`,
      treatment_date: new Date(t.treatment_date as any).toISOString(),
      total: total,
      total_fmt: money(total),
    };
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">ออกบิล (Doctor)</h1>
          <div className="text-sm text-slate-500 mt-1">
            เลือก Treatment ที่ “ยังไม่ถูกออกบิล” แล้วสร้าง Bill ส่งให้คนไข้
          </div>
        </div>

        <Link href="/" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
          ← กลับหน้าแรก
        </Link>
      </div>

      <section className="mt-6 rounded-[24px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="font-extrabold text-slate-900">Treatments ที่รอออกบิล</div>
          <div className="text-sm text-slate-500">ทั้งหมด: <span className="font-extrabold">{rows.length}</span></div>
        </div>

        <BillingClient rows={rows} />
      </section>
    </main>
  );
}
