import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const medicines = await prisma.medicine.findMany({
      orderBy: { medicine_id: "asc" },
    });

    return NextResponse.json(medicines);
  } catch (err) {
    console.error("GET /api/medicines error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
