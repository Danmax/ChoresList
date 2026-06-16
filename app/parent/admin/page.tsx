import { redirect } from "next/navigation";

export default function ParentAdminRedirectPage() {
  redirect("/parent/settings?tab=admin");
}
