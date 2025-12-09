export default function Home() {
  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold">HospitalLogic System</h1>

      <ul className="mt-6 space-y-2 text-blue-600">
        <li><a href="/patients">Patients</a></li>
        <li><a href="/doctors">Doctors</a></li>
        <li><a href="/treatments">Treatments</a></li>
        <li><a href="/bills">Bills</a></li>
      </ul>
    </div>
  );
}
