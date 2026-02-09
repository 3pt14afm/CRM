import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // Adjust path if needed
import { Head } from '@inertiajs/react';
import KpiCard from '@/Components/KpiCard';

export default function Current() {
  const kpis = [
    { title: "Total Projects", value: 142, tone: "purple", badgeText: "+15%" },
    { title: "Pending Review", value: 18, tone: "orange", badgeText: "5 Urgent" },
    { title: "Active Contracts", value: 106, tone: "sky", badgeText: "98% Up" },
    { title: "Total Yields (Annual)", value: "516.4M", tone: "red", badgeText: "↑ 5.2%" },
    { title: "Total Cost", value: "₱2.48B", tone: "green", badgeText: "-2% Var" },
  ];

  return (
    <>
      <Head title="ROI Current" />

        <div className="px-2 pt-8 pb-3 flex justify-between mx-10">
          <div className="flex gap-1">
            <h1 className="font-semibold mt-3">Project ROI Approval</h1>
            <p className="mt-3">/</p>
            <p className="text-3xl font-semibold">Current</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 mx-10 px-8 pt-4">
          {kpis.map((k) => (
            <KpiCard
              key={k.title}
              title={k.title}
              value={k.value}
              tone={k.tone}
              badgeText={k.badgeText}
            />
          ))}
        </div>
    </>
  );
}

Current.layout = page => <AuthenticatedLayout children={page} />
