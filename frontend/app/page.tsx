import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

function Card({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition">
            {title}
          </div>
          <div className="text-sm text-slate-500 mt-1">{desc}</div>
        </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  const isLoggedIn = !!session;
  const role: "PATIENT" | "DOCTOR" = (user?.role as any) || "PATIENT";

  const bookHref = isLoggedIn
    ? "/appointments/new"
    : "/login?callbackUrl=/appointments/new";

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      {/* Hero */}
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-emerald-50 via-white to-white p-8 shadow-sm">
        <div className="text-center">
          <div className="text-sm text-slate-500">
            {isLoggedIn ? `สวัสดี ${user?.username ?? ""}` : "ยินดีต้อนรับ"}
          </div>

          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            {role === "DOCTOR"
              ? "จัดการคิวนัดหมายและการรักษา"
              : "จองนัดหมายพบแพทย์ได้ในไม่กี่ขั้นตอน"}
          </h1>

          <p className="mt-3 text-slate-600">
            {role === "DOCTOR"
              ? "ตรวจคำขอนัด • แก้เวลาชนกัน • ยืนยันนัด • บันทึก Treatment • ออกบิล"
              : "เลือกอาการ/โรค • เลือก Specialty • เลือกแพทย์ • ส่งคำขอนัดหมาย"}
          </p>

          <div className="mt-6 flex justify-center">
            <Link
              href={
                role === "DOCTOR"
                  ? "/doctor/requests"
                  : bookHref
              }
              className="inline-flex items-center justify-center rounded-2xl px-6 py-4 text-base font-extrabold text-white
                         bg-gradient-to-r from-blue-600 via-teal-500 to-green-500
                         shadow-[0_12px_30px_rgba(16,185,129,0.25)]
                         hover:brightness-[1.03] active:brightness-[0.98] transition"
            >
              {role === "DOCTOR"
                ? "ไปที่คำขอนัดหมาย (Doctor)"
                : "กดเพื่อจองนัดหมาย (Appointment)"}
            </Link>
          </div>

          <div className="mt-4 text-xs text-slate-400">
            {isLoggedIn ? "สถานะ: Login แล้ว ✅" : "สถานะ: ยังไม่ Login (กดจองนัดจะพาไป Login)"}
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-extrabold text-slate-900">เมนูใช้งานด่วน</h2>
          <div className="text-sm text-slate-400">
            {!isLoggedIn ? "โหมดผู้เยี่ยมชม" : role === "DOCTOR" ? "โหมดแพทย์" : "โหมดคนไข้"}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* ไม่ล็อกอิน: เหลือแค่ 2 อย่าง */}
          {!isLoggedIn && (
            <>
              <Card
                href="/appointments/new"
                title="จองนัดหมาย"
                desc="เริ่มจองนัดได้ทันที (ตอนส่งจริงจะพาไป Login)"
                icon={<span className="text-xl">📌</span>}
              />
              <Card
                href="/doctors"
                title="รายชื่อแพทย์"
                desc="ดูรายชื่อแพทย์ตาม Department/Specialty"
                icon={<span className="text-xl">👨‍⚕️</span>}
              />
            </>
          )}

          {/* PATIENT: ตัด medicines ออก */}
          {isLoggedIn && role === "PATIENT" && (
            <>
              <Card
                href="/appointments/new"
                title="จองนัดหมาย"
                desc="เลือกอาการ/โรค + Specialty + แพทย์"
                icon={<span className="text-xl">📌</span>}
              />
              <Card
                href="/appointments"
                title="นัดของฉัน"
                desc="ดูนัดที่จองไว้/สถานะการตอบรับ"
                icon={<span className="text-xl">🗂️</span>}
              />
              <Card
                href="/bills"
                title="บิลของฉัน"
                desc="ดูสถานะชำระเงินและรายละเอียดบิล"
                icon={<span className="text-xl">💳</span>}
              />
              <Card
                href="/doctors"
                title="ค้นหาแพทย์"
                desc="ดูรายชื่อแพทย์ตาม Department/Specialty"
                icon={<span className="text-xl">🔎</span>}
              />
              <Card
                href="/access-log"
                title="ประวัติการใช้งาน"
                desc="ดู log การเข้าถึงและการล็อกอิน"
                icon={<span className="text-xl">🧩</span>}
              />
            </>
          )}

          {/* DOCTOR: สองสายหลัก */}
          {isLoggedIn && role === "DOCTOR" && (
            <>
              <Card
                href="/doctor/requests"
                title="คำขอนัดหมายเข้ามา"
                desc="มีใครจองเข้ามาหาคุณบ้าง • กดเข้าไปจัดการได้"
                icon={<span className="text-xl">📥</span>}
              />
              <Card
                href="/doctor/confirmed"
                title="นัดที่ยืนยันแล้ว"
                desc="นัดที่ confirm แล้วและกำลังจะถึงวันนัด"
                icon={<span className="text-xl">✅</span>}
              />
              <Card
                href="/doctor/treatments"
                title="ใส่ Treatment + ออกบิล"
                desc="เลือก Diagnosis • ใส่ยา • สร้าง Bill ส่งกลับคนไข้"
                icon={<span className="text-xl">🩺</span>}
              />
              <Card
                href="/medicines"
                title="รายการยา"
                desc="ดูข้อมูลยาและราคา"
                icon={<span className="text-xl">💊</span>}
              />
              <Card
                href="/access-log"
                title="ประวัติการใช้งาน"
                desc="ดู log การเข้าถึงและการล็อกอิน"
                icon={<span className="text-xl">🧩</span>}
              />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
