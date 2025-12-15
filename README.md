# 🏥 HospitaLogic

HospitaLogic is a full-stack hospital appointment management web application. It allows patients to book and track doctor appointments, while doctors can manage treatments, prescribe medication, and send billing information — all in one integrated system.

Built with **Next.js**, **Prisma**, and **MySQL**, HospitaLogic focuses on simplicity, clarity, and real-world hospital workflows.

---

## 🛠️ Tech Stack

### Frontend

* **Next.js (App Router)** – React framework for full-stack web applications
* **TypeScript** – Type-safe JavaScript
* **Tailwind CSS** – Utility-first CSS framework

### Backend

* **Next.js API Routes** – Backend logic and APIs
* **Prisma ORM (v7)** – Type-safe database access
* **Prisma Client (Custom Generated Path)** – `app/generated/prisma`

### Database

* **MySQL / MariaDB** – Relational database
* **Prisma MariaDB Adapter** – Database adapter layer

### Authentication

* **NextAuth.js** – Authentication & session management

### Tooling

* **Node.js** – JavaScript runtime
* **npm** – Package manager
* **Git** – Version control

---

---

## 💻 Getting Started

Below are **simple, copy-paste-ready setup instructions** using only what is already configured in this project.

---

### 🧩 Prerequisites

* Node.js (recommended v18 or later)
* Git
* MySQL (local database or Docker-based)

---

### 📥 Clone the Repository

```bash
git clone https://github.com/ClinixLab/HospitaLogic.git
cd HospitaLogic
```

---

### 📂 Navigate to Frontend Layer

```bash
cd frontend
```

---

### 📦 Install Dependencies

```bash
npm install
```

---

### ⚙️ Environment Variables

1. Create a `.env` file inside the `frontend` directory
2. Copy values from `.env.example`

```bash
cp .env.example .env
```

Then update the required values inside `.env`, for example:

```env
DATABASE_URL="mysql://user:password@localhost:3306/hospital_db"
NEXTAUTH_SECRET="your_secret"
NEXTAUTH_URL="http://localhost:3000"
```

---

### 🧬 Prisma Setup

Run the following commands inside the `frontend` directory:

````bash
npx prisma generate
npx prisma db push
```bash
npx prisma generate
npx prisma db push
````

---

### 🌱 Database Seeding (Optional but Recommended)

This project includes a **seed script** to populate the database with initial hospital data (departments, specialties, doctors, etc.).

Run the seed script **after Prisma setup**:

```bash
npx prisma db seed
```

> ⚠️ Make sure your `DATABASE_URL` in `.env` is correct before running the seed.

---

### ▶️ Run Development Server

```bash
npm run dev
```

---

### 🌐 Access the Application

Open your browser and visit:

```text
http://localhost:3000
```

---

## ✅ Quick Setup Summary

```bash
git clone https://github.com/ClinixLab/HospitaLogic.git
cd HospitaLogic/frontend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

The server will be available at 👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📄 License

This project is intended for educational and development purposes.

---

**HospitaLogic** — Smart hospital appointment management 🏥
