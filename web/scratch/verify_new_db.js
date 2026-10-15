const postgres = require('postgres');
const sql = postgres('postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

async function verify() {
  const [students, users, schools, classes, expenses, fees] = await Promise.all([
    sql`SELECT count(*)::int as count FROM public.students`,
    sql`SELECT count(*)::int as count FROM public.users`,
    sql`SELECT count(*)::int as count FROM public.schools`,
    sql`SELECT count(*)::int as count FROM public.school_classes`,
    sql`SELECT count(*)::int as count FROM public.expenses`,
    sql`SELECT count(*)::int as count FROM public.student_fees`
  ]);

  console.log('====================================================');
  console.log('✅ NEW SUPABASE DATABASE VERIFICATION REPORT');
  console.log('====================================================');
  console.log('👨‍🎓 Students (الطلاب):', students[0].count);
  console.log('👤 Users (المستخدمون):', users[0].count);
  console.log('🏫 Schools (المدارس):', schools[0].count);
  console.log('📚 Classes (الفصول):', classes[0].count);
  console.log('💰 Expenses (المصاريف):', expenses[0].count);
  console.log('💳 Student Fees (الرسوم الدراسية):', fees[0].count);
  console.log('====================================================');
  await sql.end();
}

verify();
