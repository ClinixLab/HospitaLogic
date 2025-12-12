import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  const role = String(body?.role ?? "PATIENT").toUpperCase(); // PATIENT | DOCTOR

  if (!username || !password) {
    return NextResponse.json({ message: "username and password are required" }, { status: 400 });
  }
  if (role !== "PATIENT" && role !== "DOCTOR") {
    return NextResponse.json({ message: "role must be PATIENT or DOCTOR" }, { status: 400 });
  }

  const exists = await prisma.login.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json({ message: "username already exists" }, { status: 409 });
  }

  const hashed_password = await hash(password, 10);

  try {
    const login = await prisma.$transaction(async (tx) => {
      // 1) create Login -> ได้ UUID
      const createdLogin = await tx.login.create({
        data: { username, hashed_password, role: role as any },
        select: { user_id: true, username: true, role: true },
      });

      // 2) create Patient/Doctor โดยใช้ id เดียวกัน
      if (role === "PATIENT") {
        await tx.patient.create({
          data: {
            patient_id: createdLogin.user_id, // ✅ เท่ากัน
            name: username,                   // placeholder ไว้ก่อน
            gender: "UNKNOWN",
            phone: "N/A",
          },
          select: { patient_id: true },
        });
      } else {
        // Doctor ต้องมี department/specialty -> ถ้า DB ยังว่างให้สร้าง default
        let dep = await tx.department.findFirst({
          orderBy: { department_id: "asc" },
          select: { department_id: true },
        });
        if (!dep) {
          dep = await tx.department.create({
            data: { name: "General", location: "Main" },
            select: { department_id: true },
          });
        }

        let spec = await tx.specialty.findFirst({
          orderBy: { specialty_id: "asc" },
          select: { specialty_id: true },
        });
        if (!spec) {
          spec = await tx.specialty.create({
            data: { name: "General Practitioner", description: "General medicine" },
            select: { specialty_id: true },
          });
        }

        await tx.doctor.create({
          data: {
            doctor_id: createdLogin.user_id, // ✅ เท่ากัน
            name: `Dr. ${username}`,         // placeholder
            phone: "N/A",
            department_id: dep.department_id,
            specialty_id: spec.specialty_id,
          },
          select: { doctor_id: true },
        });
      }

      return createdLogin;
    });

    return NextResponse.json({ message: "signup success", login }, { status: 201 });
  } catch (err) {
    console.error("SIGNUP_ERROR:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
