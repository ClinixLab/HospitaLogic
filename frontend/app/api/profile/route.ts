import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asUuid(v: unknown) {
  const s = typeof v === "string" ? v.trim() : "";
  return UUID_RE.test(s) ? s : null;
}

function isValidDate(d: Date) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

async function getAuthed() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false as const, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };

  const uid = asUuid((session.user as any).id);
  if (!uid) return { ok: false as const, res: NextResponse.json({ message: "Unauthorized (invalid uid)" }, { status: 401 }) };

  const login = await prisma.login.findUnique({
    where: { user_id: uid },
    select: { user_id: true, role: true, username: true },
  });

  if (!login) return { ok: false as const, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };

  return { ok: true as const, uid, role: login.role as "PATIENT" | "DOCTOR", username: login.username };
}

export async function GET() {
  const auth = await getAuthed();
  if (!auth.ok) return auth.res;

  const { uid, role } = auth;

  if (role === "PATIENT") {
    const patient = await prisma.patient.findUnique({
      where: { patient_id: uid },
      select: {
        patient_id: true,
        name: true,
        gender: true,
        phone: true,
        pii: { select: { DOB: true, address: true } },
      },
    });

    if (!patient) return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    return NextResponse.json({ role, profile: patient });
  }

  if (role === "DOCTOR") {
    const doctor = await prisma.doctor.findUnique({
      where: { doctor_id: uid },
      select: {
        doctor_id: true,
        name: true,
        phone: true,
        department_id: true,
        specialty_id: true,
        department: { select: { department_id: true, name: true } },
        specialty: { select: { specialty_id: true, name: true } },
      },
    });

    if (!doctor) return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    return NextResponse.json({ role, profile: doctor });
  }

  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

export async function PATCH(req: Request) {
  const auth = await getAuthed();
  if (!auth.ok) return auth.res;

  const { uid, role } = auth;
  const body = await req.json().catch(() => null);

  // ---------------- PATIENT ----------------
  if (role === "PATIENT") {
    const name = String(body?.name ?? "").trim();
    const gender = String(body?.gender ?? "").trim();
    const phone = String(body?.phone ?? "").trim();

    if (!name || !gender || !phone) {
      return NextResponse.json({ message: "name, gender, phone are required" }, { status: 400 });
    }

    const wantsPII = !!body?.pii_enabled;
    const dobRaw = body?.DOB ? new Date(body.DOB) : null;
    const address = typeof body?.address === "string" ? body.address.trim() : "";

    if (wantsPII) {
      if (!dobRaw || !isValidDate(dobRaw) || !address) {
        return NextResponse.json(
          { message: "DOB and address are required when PII is enabled" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.update({
        where: { patient_id: uid },
        data: { name, gender, phone },
        select: { patient_id: true, name: true, gender: true, phone: true },
      });

      let pii: null | { DOB: Date; address: string } = null;

      if (wantsPII) {
        pii = await tx.patientPII.upsert({
          where: { patient_id: uid },
          update: { DOB: dobRaw!, address },
          create: { patient_id: uid, DOB: dobRaw!, address },
          select: { DOB: true, address: true },
        });
      }

      return { patient, pii };
    });

    return NextResponse.json({ message: "updated", role, ...updated });
  }

  // ---------------- DOCTOR ----------------
  if (role === "DOCTOR") {
    const name = String(body?.name ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const department_id = Number(body?.department_id);
    const specialty_id = Number(body?.specialty_id);

    if (!name || !phone) {
      return NextResponse.json({ message: "name and phone are required" }, { status: 400 });
    }
    if (!department_id || Number.isNaN(department_id)) {
      return NextResponse.json({ message: "department_id is required" }, { status: 400 });
    }
    if (!specialty_id || Number.isNaN(specialty_id)) {
      return NextResponse.json({ message: "specialty_id is required" }, { status: 400 });
    }

    const [dep, spec] = await Promise.all([
      prisma.department.findUnique({ where: { department_id }, select: { department_id: true } }),
      prisma.specialty.findUnique({ where: { specialty_id }, select: { specialty_id: true } }),
    ]);

    if (!dep) return NextResponse.json({ message: "department_id not found" }, { status: 400 });
    if (!spec) return NextResponse.json({ message: "specialty_id not found" }, { status: 400 });

    const doctor = await prisma.doctor.update({
      where: { doctor_id: uid },
      data: { name, phone, department_id, specialty_id },
      select: {
        doctor_id: true,
        name: true,
        phone: true,
        department_id: true,
        specialty_id: true,
        department: { select: { department_id: true, name: true } },
        specialty: { select: { specialty_id: true, name: true } },
      },
    });

    return NextResponse.json({ message: "updated", role, doctor });
  }

  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}
