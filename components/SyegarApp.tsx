import { redirect } from "next/navigation";
import ClientSyegarApp from "@/components/features/app/SyegarApp";
import type { View } from "@/components/navigation";
import { currentUser } from "@/lib/auth";
import { getDashboard } from "@/services/analytics.service";
import type { User } from "@/types/app-ui";

export default async function SyegarApp({ view }: { view: View }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const initialDashboardData = view === "dashboard" ? await getDashboard() : null;
  return <ClientSyegarApp view={view} initialUser={user as User} initialDashboardData={initialDashboardData} />;
}
