import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Departments
  const cardiology = await prisma.department.create({
    data: { name: "Cardiology", location: "Building A, Floor 2" },
  });

  const pediatrics = await prisma.department.create({
    data: { name: "Pediatrics", location: "Building B, Floor 3" },
  });

  // Specialties
  const cardioSpec = await prisma.specialty.create({
    data: { name: "Cardiologist", description: "Heart specialist" },
  });

  const childSpec = await prisma.specialty.create({
    data: { name: "Pediatrician", description: "Child specialist" },
  });

  // Doctors
  const doctorJohn = await prisma.doctor.create({
    data: {
      name: "Dr. John Doe",
      phone: "0891234567",
      department_id: cardiology.department_id,
      specialty_id: cardioSpec.specialty_id,
    },
  });

  const doctorAnna = await prisma.doctor.create({
    data: {
      name: "Dr. Anna Smith",
      phone: "0819876543",
      department_id: pediatrics.department_id,
      specialty_id: childSpec.specialty_id,
    },
  });

  // Patients
  const patientA = await prisma.patient.create({
    data: { name: "Mark Lee", gender: "Male", phone: "0911111111" },
  });

  const patientB = await prisma.patient.create({
    data: { name: "Lisa Sun", gender: "Female", phone: "0922222222" },
  });

  // PatientPII
  await prisma.patientPII.create({
    data: {
      patient_id: patientA.patient_id,
      DOB: new Date("2000-01-01"),
      address: "Bangkok, Thailand",
    },
  });

  await prisma.patientPII.create({
    data: {
      patient_id: patientB.patient_id,
      DOB: new Date("1998-05-12"),
      address: "Chiang Mai, Thailand",
    },
  });

  // Diagnoses
  const diag1 = await prisma.diagnosis.create({
    data: { code: "C101", description: "Common Cold" },
  });

  const diag2 = await prisma.diagnosis.create({
    data: { code: "H202", description: "Heart Palpitations" },
  });

  // Medicines
  const med1 = await prisma.medicine.create({
    data: { name: "Paracetamol", quantity: 500, price: 5.0 },
  });

  const med2 = await prisma.medicine.create({
    data: { name: "Amoxicillin", quantity: 350, price: 10.0 },
  });

  const med3 = await prisma.medicine.create({
    data: { name: "Ibuprofen", quantity: 200, price: 15.0 },
  });

  // Appointments
  const appt1 = await prisma.appointment.create({
    data: {
      patient_id: patientA.patient_id,
      doctor_id: doctorJohn.doctor_id,
      date: new Date(),
      time: "10:00",
      status: "Completed",
    },
  });

  const appt2 = await prisma.appointment.create({
    data: {
      patient_id: patientB.patient_id,
      doctor_id: doctorAnna.doctor_id,
      date: new Date(),
      time: "11:30",
      status: "Scheduled",
    },
  });

  // Treatments
  const treatment1 = await prisma.treatment.create({
    data: {
      patient_id: patientA.patient_id,
      doctor_id: doctorJohn.doctor_id,
      diagnosis_id: diag2.diagnosis_id,
      treatment_date: new Date(),
    },
  });

  const treatment2 = await prisma.treatment.create({
    data: {
      patient_id: patientB.patient_id,
      doctor_id: doctorAnna.doctor_id,
      diagnosis_id: diag1.diagnosis_id,
      treatment_date: new Date(),
    },
  });

  // Treatment Medicines
  await prisma.treatmentMedicine.create({
    data: {
      treatment_id: treatment1.treatment_id,
      medicine_id: med3.medicine_id,
      quantity: 2,
    },
  });

  await prisma.treatmentMedicine.create({
    data: {
      treatment_id: treatment2.treatment_id,
      medicine_id: med1.medicine_id,
      quantity: 5,
    },
  });

  // Bills
  const bill1 = await prisma.bill.create({
    data: {
      patient_id: patientA.patient_id,
      total_amount: 300.0,
      payment_status: "Paid",
      bill_date: new Date(),
    },
  });

  const bill2 = await prisma.bill.create({
    data: {
      patient_id: patientB.patient_id,
      total_amount: 120.0,
      payment_status: "Pending",
      bill_date: new Date(),
    },
  });

  // BillTreatment links
  await prisma.billTreatment.create({
    data: {
      bill_id: bill1.bill_id,
      treatment_id: treatment1.treatment_id,
    },
  });

  await prisma.billTreatment.create({
    data: {
      bill_id: bill2.bill_id,
      treatment_id: treatment2.treatment_id,
    },
  });

  // Login accounts
  const bcrypt = await import("bcryptjs");
  const hashed = await bcrypt.hash("password123", 10);

  const adminUser = await prisma.login.create({
    data: {
      username: "admin",
      hashed_password: hashed,
      role: "admin",
    },
  });

  const doctorLogin = await prisma.login.create({
    data: {
      username: "john",
      hashed_password: hashed,
      role: "doctor",
      doctor_id: doctorJohn.doctor_id,
    },
  });

  const patientLogin = await prisma.login.create({
    data: {
      username: "mark",
      hashed_password: hashed,
      role: "patient",
      patient_id: patientA.patient_id,
    },
  });

  // Access Logs
  await prisma.accessLog.create({
    data: {
      user_id: adminUser.user_id,
      entity_type: "SYSTEM",
      entity_id: 0,
      action: "INIT_SEED",
    },
  });

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
