import "./globals.css";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Navbar from "@/app/components/Navbar";
import Providers from "@/app/provider";

export const metadata: Metadata = {
  title: "HospitaLogic",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="th">
      <body className="bg-white text-slate-900">
        <Providers session={session}>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
