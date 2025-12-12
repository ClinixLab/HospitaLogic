import "./globals.css";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Navbar from "../app/components/Navbar";

export const metadata: Metadata = {
  title: "HospitaLogic",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  return (
    <html lang="th">
      <body className="bg-white text-slate-900">
        <Navbar user={user ? { username: user.username, role: user.role } : null} />
        {children}
      </body>
    </html>
  );
}
