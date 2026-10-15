import type { Metadata } from "next";
import { connection } from "next/server";
import { OverviewScreen } from "@/features/admin/overview/overview-screen";
import { overview } from "@/server/admin/overview";
import { adminOnly } from "@/server/auth/roles";

export const metadata: Metadata = { title: "Visão geral" };

/** The panel's home: what needs the admin, then the numbers. */
export default async function AdminOverview() {
  await connection();
  const me = await adminOnly();
  const stats = await overview();
  return (
    <OverviewScreen stats={stats} name={me.name ?? "admin"} now={Date.now()} />
  );
}
