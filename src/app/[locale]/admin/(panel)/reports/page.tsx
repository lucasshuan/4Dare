import type { Metadata } from "next";
import { ReportsScreen } from "@/features/admin/people/reports-screen";
import { adminReports } from "@/server/admin/people";
import { adminPage } from "@/server/auth/roles";

export const metadata: Metadata = { title: "Denúncias" };

/** Reports, by the person they are about. */
export default async function AdminReportsPage() {
  await adminPage();
  return <ReportsScreen groups={await adminReports()} />;
}
