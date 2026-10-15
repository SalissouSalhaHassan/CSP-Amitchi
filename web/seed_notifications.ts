import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { notifications } from "./src/infrastructure/database/schema/messaging";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function seedNotifications() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in .env.local");
  }

  const isSupabase = connectionString.includes("supabase.co") || connectionString.includes("supabase.com");
  const client = postgres(connectionString, {
    prepare: false,
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
  });
  const db = drizzle(client);

  console.log("🌱 Seeding notifications...");

  const sampleNotifications = [
    {
      title: "مرحباً بك في النظام!",
      content: "تم تفعيل حسابك بنجاح. يمكنك الآن الوصول إلى جميع ميزات منصة Edut.",
      type: "success",
      category: "Général",
      userId: null,
      isRead: false,
    },
    {
      title: "دفع الرسوم الدراسية — تذكير",
      content: "يرجى التذكر أن آخر موعد لدفع رسوم الفصل الدراسي الثاني هو 15 يونيو 2026. تأخير الدفع قد يؤدي إلى رسوم إضافية.",
      type: "warning",
      category: "Finances",
      userId: null,
      isRead: false,
    },
    {
      title: "نتائج الفصل الأول متاحة",
      content: "تم رفع نتائج الفصل الدراسي الأول للسنة 2025-2026. يمكنكم الاطلاع عليها من خلال قسم التقارير.",
      type: "info",
      category: "Scolarité",
      userId: null,
      isRead: false,
    },
    {
      title: "إغلاق استثنائي — غداً",
      content: "نحيطكم علماً بأن المؤسسة ستكون مغلقة يوم غد الأربعاء 4 يونيو 2026 بسبب يوم وطني. سيستأنف العمل يوم الخميس.",
      type: "warning",
      category: "Général",
      userId: null,
      isRead: false,
    },
    {
      title: "تحديث النظام بنجاح ✅",
      content: "تم تحديث منصة Edut إلى الإصدار 2.4. تشمل التحديثات تحسينات في الأداء وإصلاح بعض الأخطاء.",
      type: "success",
      category: "Système",
      userId: null,
      isRead: true,
    },
    {
      title: "قائمة الشرف — الفصل الأول",
      content: "تهانينا للطلاب المتميزين الذين حصلوا على معدل 16/20 فأكثر! ستُعلن قائمة الشرف الرسمية يوم الجمعة.",
      type: "success",
      category: "Scolarité",
      userId: null,
      isRead: true,
    },
    {
      title: "خطأ في استيراد البيانات",
      content: "حدث خطأ أثناء استيراد بيانات الطلاب الجدد. يرجى مراجعة ملف CSV والتأكد من صحة التنسيق.",
      type: "error",
      category: "Système",
      userId: null,
      isRead: false,
    },
  ];

  try {
    await db.insert(notifications).values(sampleNotifications);
    console.log(`✅ Inserted ${sampleNotifications.length} sample notifications!`);
  } catch (err: any) {
    console.error("❌ Error inserting notifications:", err.message);
  } finally {
    await client.end();
  }
}

seedNotifications();
