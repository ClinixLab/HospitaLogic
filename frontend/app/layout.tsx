import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Providers from "@/app/provider";

export const metadata: Metadata = {
  title: "HospitaLogic",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="bg-white text-slate-900">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
