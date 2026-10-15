"use server";

import { sendNotification } from "@/lib/queue/notifications";
import { safeDbAction } from "@/lib/safe-action";

export async function triggerNotificationAction(formData: {
  type: 'sms' | 'email' | 'push';
  recipient: string;
  message: string;
}) {
  return safeDbAction(async () => {
    const { type, recipient, message } = formData;
    
    if (!recipient || !message) {
      throw new Error("المستلم والرسالة مطلوبان");
    }

    // Add to queue
    await sendNotification({
      type,
      recipient,
      message,
    });

    return { success: true, message: "تمت إضافة الإشعار إلى طابور الإرسال" };
  });
}
