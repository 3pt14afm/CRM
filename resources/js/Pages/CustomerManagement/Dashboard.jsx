import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import { MdGroups, MdPersonAddAlt1 } from "react-icons/md";
import { FaUserCheck } from "react-icons/fa";
import { BsExclamationOctagonFill, BsTicketPerforatedFill } from "react-icons/bs";

import StatCard from "@/Components/StatCard";
import { cardThemes, defaultCardTheme } from "@/Config/cardThemes";

export default function Dashboard() {
  const cards = [
    { icon: MdGroups, name: "Total Customer", num: 12000, percent: 30 },
    { icon: FaUserCheck, name: "Active Accounts", num: 8320, percent: 10 },
    { icon: MdPersonAddAlt1, name: "Prospect Customers", num: 128, percent: 1.4 },
    // { icon: BsExclamationOctagonFill, name: "Expiring Contracts", num: 45, percent: 1 },
    // { icon: BsTicketPerforatedFill, name: "Open Tickets", num: 78, percent: 1.1 },
  ];

  return (
    <>
      <Head title="Customer Account Management Dashboard" />

    <div className="mx-3 lg:px-8">
      <h1 className="text-md mt-2 font-medium text-gray-800 pt-5">
        Customer Management Dashboard
      </h1>

      <div className="flex flex-col items-start gap-1 mt-8">
        <span className="text-2xl font-medium text-gray-800">Welcome Back, [Name]!</span>
        <span className="text-gray-600 text-sm">Here's what's happening today</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-8 pb-5">
        {cards.map((card, index) => (
          <StatCard
            key={card.name}
            icon={card.icon}
            title={card.name}
            value={card.num}
            theme={cardThemes[card.name] ?? defaultCardTheme}
            index={index}
          />
        ))}
      </div>
    </div>
      
    </>
  );
}

// Wrap in sidebar layout
Dashboard.layout = (page) => <AuthenticatedLayout children={page} />;
