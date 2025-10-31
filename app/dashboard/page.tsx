import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Celite Dashboard • Manage Your Account",
  description: "Review orders, update payment methods, and manage your Celite subscription.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}

