import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import { MdGroups, MdPersonAddAlt1 } from "react-icons/md";
import { FaUserCheck } from "react-icons/fa";
import { BsExclamationOctagonFill, BsTicketPerforatedFill } from "react-icons/bs";

import StatCard from "@/Components/StatCard";
import { cardThemes, defaultCardTheme } from "@/Config/cardThemes";

export default function Dashboard() {
  const cards = [
    { icon: MdGroups, name: "Total Customers", num: 12000, percent: 30 },
    { icon: FaUserCheck, name: "Active Accounts", num: 8320, percent: 10 },
    { icon: MdPersonAddAlt1, name: "Prospect Customers", num: 128, percent: 1.4 },
    { icon: BsExclamationOctagonFill, name: "At-Risk Accounts", num: 45, percent: 1 },
    { icon: BsTicketPerforatedFill, name: "Open Tickets", num: 78, percent: 1.1 },
  ];

  return (
    <>
      <Head title="Customer Management Dashboard" />

      <h1 className="text-3xl mt-2 font-semibold text-gray-800 pt-5 px-8">
        Customer Management Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 mx-10 px-8 pt-8">
        {cards.map((card, index) => (
          <StatCard
            key={card.name}
            icon={card.icon}
            title={card.name}
            value={card.num}
            percent={card.percent}
            theme={cardThemes[card.name] ?? defaultCardTheme}
            index={index}
          />
        ))}
      </div>
    </>
  );
}

// Wrap in sidebar layout
Dashboard.layout = (page) => <AuthenticatedLayout children={page} />;
