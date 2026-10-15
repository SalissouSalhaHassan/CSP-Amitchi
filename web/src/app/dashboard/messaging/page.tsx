import {
  getMessageTemplates,
  getMessageLogs,
  getMessagingStats,
  getScheduledMessages,
} from "@/domains/messaging/actions/messaging.actions";
import MessagerieUI from "./messaging-ui";

export const dynamic = "force-dynamic";

export default async function MessagingPage() {
  const [templatesRes, logsRes, statsRes, scheduledRes] = await Promise.all([
    getMessageTemplates(),
    getMessageLogs(),
    getMessagingStats(),
    getScheduledMessages(),
  ]);

  const templates = (templatesRes as any)?.data?.data ?? (templatesRes as any)?.data ?? [];
  const logs      = (logsRes as any)?.data?.data      ?? (logsRes as any)?.data      ?? [];
  const stats     = (statsRes as any)?.data?.data      ?? (statsRes as any)?.data      ?? {};
  const scheduled = (scheduledRes as any)?.data?.data  ?? (scheduledRes as any)?.data  ?? [];

  return (
    <MessagerieUI
      templates={templates}
      logs={logs}
      stats={stats}
      scheduled={scheduled}
    />
  );
}
