export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getNotifications } from "@/domains/messaging/actions/notifications.actions";
import { getUsers } from "@/domains/auth/actions/users.actions";
import NotificationsUI from "./components/NotificationsUI";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch notifications
  const notifRes = await getNotifications();
  const initialNotifications = notifRes.success ? (notifRes.data || []) : [];

  // Fetch users if user is admin (for target dropdown list)
  let usersList: any[] = [];
  if (user.admin) {
    const usersRes = await getUsers();
    usersList = usersRes.success ? (usersRes.data || []) : [];
  }

  // Retrieve user locale
  const locale = user.langue || "FR";

  return (
    <NotificationsUI
      initialNotifications={initialNotifications as any}
      usersList={usersList}
      currentUser={{
        id: user.id,
        nomPrenom: user.nomPrenom || null,
        utilisateur: user.utilisateur,
        admin: user.admin || false,
      }}
      locale={locale}
    />
  );
}
