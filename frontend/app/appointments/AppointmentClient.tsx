"use client";

import { useEffect, useMemo, useState } from "react";

/* ---------- types ---------- */

type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

type Appointment = {
  appointment_id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  doctor: {
    name: string;
    specialty: {
      name: string;
    };
  };
};

type TabKey = "UPCOMING" | "PAST";

/* ---------- helpers ---------- */

function toLocalDateNumber(dateStr: string) {
  // "2025-12-15" => 20251215
  return parseInt(dateStr.replace(/-/g, ""), 10);
}

const statusPriority: Record<AppointmentStatus, number> = {
  CONFIRMED: 1,
  PENDING: 2,
  COMPLETED: 3,
  CANCELLED: 4,
};

/* ---------- component ---------- */

export default function AppointmentClient() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("UPCOMING");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/appointments")
      .then(res => res.json())
      .then(data => {
        const normalized: Appointment[] = (data.appointments ?? []).map(
          (a: any) => ({
            ...a,
            status: (a.status ?? "").toUpperCase(),
          })
        );
        setAppointments(normalized);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load appointments");
        setLoading(false);
      });
  }, []);

  const todayNumber = toLocalDateNumber(new Date().toISOString().split("T")[0]);

  const filteredAppointments = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => {
      const da = toLocalDateNumber(a.date);
      const db = toLocalDateNumber(b.date);

      if (db !== da) return db - da; // ใกล้ๆ วันนี้ก่อน
      return statusPriority[a.status] - statusPriority[b.status];
    });

    if (activeTab === "UPCOMING") {
      return sorted.filter(a => {
        const dateNum = toLocalDateNumber(a.date);
        const status = a.status.toUpperCase();

        return (
          // ไม่เอา CANCELLED
          status !== "CANCELLED" &&
          // เอา appointment ที่ date >= today
          dateNum >= todayNumber
        );
      });
    }

    // PAST
    return sorted.filter(a => {
      const dateNum = toLocalDateNumber(a.date);
      const status = a.status.toUpperCase();

      return (
        // เอา CANCELLED หรือ COMPLETED
        status === "CANCELLED" ||
        status === "COMPLETED" ||
        // หรือ date < today
        dateNum < todayNumber
      );
    });
  }, [appointments, activeTab, todayNumber]);

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this appointment?")) return;

    setAppointments(prev =>
      prev.map(a =>
        a.appointment_id === id
          ? { ...a, status: "CANCELLED" }
          : a
      )
    );

    const res = await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });

    if (!res.ok) {
      alert("Failed to cancel appointment");
      location.reload();
    }
  };

  if (loading) return <p className="p-4">Loading...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6">My Appointments</h1>

      <div className="flex gap-2 mb-6">
        <Tab
          label="Upcoming"
          active={activeTab === "UPCOMING"}
          onClick={() => setActiveTab("UPCOMING")}
        />
        <Tab
          label="Past"
          active={activeTab === "PAST"}
          onClick={() => setActiveTab("PAST")}
        />
      </div>

      {filteredAppointments.length === 0 && (
        <p className="text-slate-500">No appointments</p>
      )}

      <div className="space-y-4">
        {filteredAppointments.map(a => (
          <AppointmentCard
            key={a.appointment_id}
            appointment={a}
            isUpcoming={activeTab === "UPCOMING"}
            onCancel={handleCancel}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- UI ---------- */

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function AppointmentCard({
  appointment,
  isUpcoming,
  onCancel,
}: {
  appointment: Appointment;
  isUpcoming: boolean;
  onCancel: (id: number) => void;
}) {
  return (
    <div className="rounded-xl border p-4 flex justify-between items-center bg-white shadow-sm">
      <div>
        <p className="font-semibold text-lg">{appointment.doctor.name}</p>
        <p className="text-sm text-slate-600">
          {appointment.doctor.specialty.name}
        </p>
        <p className="text-sm mt-1 text-slate-700">
          📅 {appointment.date} · ⏰ {appointment.time}
        </p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <StatusBadge status={appointment.status} />

        {isUpcoming && appointment.status === "PENDING" && (
          <button
            onClick={() => onCancel(appointment.appointment_id)}
            className="text-sm px-3 py-1 rounded-md border border-red-500 text-red-600 hover:bg-red-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const map = {
    PENDING: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    COMPLETED: "bg-slate-200 text-slate-600",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
}
