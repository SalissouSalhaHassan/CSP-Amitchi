const postgres = require('postgres');
const sql = postgres('postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

sql`SELECT id, utilisateur, mot_de_passe FROM public.users WHERE id = 4`
  .then(r => console.log('Current DB row:', r))
  .finally(() => sql.end());
