const postgres = require('postgres');

async function cloneAuthUsers() {
  const oldSql = postgres('postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres', { ssl: 'require' });
  const newSql = postgres('postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

  try {
    // Delete existing dummy superadmin in new DB auth.users
    await newSql`DELETE FROM auth.users WHERE email = 'superadmin@gmail.com'`;
    console.log('Cleared existing auth.users in new DB');

    const oldUsers = await oldSql`SELECT * FROM auth.users`;
    console.log(`Found ${oldUsers.length} users in old auth.users`);

    for (const u of oldUsers) {
      console.log(`Cloning auth user: ${u.email} (${u.id})`);
      await newSql`
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at,
          email_change_token_new, email_change, email_change_sent_at, last_sign_in_at,
          raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
          phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at,
          email_change_token_current, email_change_confirm_status, banned_until,
          reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous
        ) VALUES (
          ${u.instance_id}, ${u.id}, ${u.aud}, ${u.role}, ${u.email}, ${u.encrypted_password}, ${u.email_confirmed_at},
          ${u.invited_at}, ${u.confirmation_token}, ${u.confirmation_sent_at}, ${u.recovery_token}, ${u.recovery_sent_at},
          ${u.email_change_token_new}, ${u.email_change}, ${u.email_change_sent_at}, ${u.last_sign_in_at},
          ${u.raw_app_meta_data}, ${u.raw_user_meta_data}, ${u.is_super_admin}, ${u.created_at}, ${u.updated_at},
          ${u.phone}, ${u.phone_confirmed_at}, ${u.phone_change}, ${u.phone_change_token}, ${u.phone_change_sent_at},
          ${u.email_change_token_current}, ${u.email_change_confirm_status}, ${u.banned_until},
          ${u.reauthentication_token}, ${u.reauthentication_sent_at}, ${u.is_sso_user}, ${u.deleted_at}, ${u.is_anonymous}
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          encrypted_password = EXCLUDED.encrypted_password,
          raw_app_meta_data = EXCLUDED.raw_app_meta_data,
          raw_user_meta_data = EXCLUDED.raw_user_meta_data,
          email_confirmed_at = EXCLUDED.email_confirmed_at;
      `;
    }
    console.log('✅ Cloned all auth.users into NEW DB successfully!');

    // Copy identities
    try {
      const oldIdentities = await oldSql`SELECT * FROM auth.identities`;
      console.log(`Found ${oldIdentities.length} identities in old auth.identities`);
      for (const id of oldIdentities) {
        await newSql`
          INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
          ) VALUES (
            ${id.id}, ${id.user_id}, ${id.identity_data}, ${id.provider}, ${id.provider_id || id.user_id}, ${id.last_sign_in_at}, ${id.created_at}, ${id.updated_at}
          )
          ON CONFLICT (id) DO NOTHING;
        `;
      }
      console.log('✅ Cloned identities successfully with provider_id!');
    } catch (identErr) {
      console.warn('Identities copy notice:', identErr.message);
    }

  } catch (err) {
    console.error('Error cloning auth:', err);
  } finally {
    await oldSql.end();
    await newSql.end();
  }
}

cloneAuthUsers();
