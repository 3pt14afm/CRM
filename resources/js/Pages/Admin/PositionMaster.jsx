import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";

export default function Page() {
  return (
    <AuthenticatedLayout>
      <Head title="Admin" />
      <div className="p-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-xl font-semibold text-darkgreen">Position Master</h1>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}