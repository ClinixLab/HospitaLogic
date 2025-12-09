import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const bills = await prisma.bill.findMany({
    include: {
      patient: true,
      treatments: {
        include: {
          treatment: {
            include: {
              patient: true,
              doctor: true,
            },
          },
        },
      },
    },
    orderBy: { bill_id: "asc" },
  });
  return NextResponse.json(bills);
}
