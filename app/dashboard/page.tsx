import { cookies } from "next/headers";

import DashboardClientPage from "./DashboardClientPage";
import { isEditor } from "@/lib/auth/isEditor";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function resolveServerEditorGrant(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return false;

  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data?.user?.email) return false;

  return isEditor(data.user.email);
}

export default async function DashboardPage() {
  const serverEditor = await resolveServerEditorGrant();
  return <DashboardClientPage serverEditor={serverEditor} />;
}
