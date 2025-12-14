import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLogin } from "@/app/api/_helpers/auth";

export async function GET(req: NextRequest) {
  const auth = await requireLogin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  // หมอเท่านั้น
  const me = auth.login;
  if (String(me.role || "").toUpperCase() !== "DOCTOR") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get("q") || "").trim();

  const items = await prisma.diagnosis.findMany({
    where: q
      ? {
          OR: [
            { code: { contains: q } },
            { description: { contains: q } },
          ],
        }
      : undefined,
    orderBy: [{ code: "asc" }],
  });

  return NextResponse.json({ items });
}
