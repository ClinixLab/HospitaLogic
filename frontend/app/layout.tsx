import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "HospitaLogic",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <div className="flex min-h-screen">
          <aside className="w-64 bg-slate-900 text-slate-100 p-4 space-y-4">
            <h1 className="text-2xl font-bold mb-4">HospitaLogic</h1>
            <nav className="space-y-2 text-sm">
              <Link href="/login" className="block hover:text-emerald-300">Login</Link>
              <Link href="/patients" className="block hover:text-emerald-300">Patients</Link>
              <Link href="/doctors" className="block hover:text-emerald-300">Doctors</Link>
              <Link href="/appointments" className="block hover:text-emerald-300">Appointments</Link>
              <Link href="/treatments" className="block hover:text-emerald-300">Treatments</Link>
              <Link href="/medicines" className="block hover:text-emerald-300">Medicines</Link>
              <Link href="/bills" className="block hover:text-emerald-300">Bills</Link>
              <Link href="/treatment-medicines" className="block hover:text-emerald-300">Treatment Medicines</Link>
              <Link href="/access-log" className="block hover:text-emerald-300">Access Log</Link>
            </nav>
          </aside>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
