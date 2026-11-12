import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../src/lib/auth";
import DashboardClient from "./DashboardClient";
export const instant = false;
export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return <DashboardClient />;
}