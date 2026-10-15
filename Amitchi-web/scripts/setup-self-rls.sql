-- 1. Permettre aux utilisateurs de lire leur propre profil utilisateur
-- Cette règle résout le problème de dépendance circulaire (chicken-and-egg RLS deadlock)
-- où get_my_school_id() a besoin de lire la table users pour savoir quel est le school_id de l'utilisateur connecté.
DROP POLICY IF EXISTS user_self_select ON users;
CREATE POLICY user_self_select ON users
FOR SELECT
USING (supabase_id = auth.uid()::text OR utilisateur = (auth.jwt() ->> 'email'));

-- 2. Permettre aux employés de lire leur propre profil d'employé
-- Cela permet aux enseignants de charger leur identifiant d'enseignant et informations de manière sécurisée.
DROP POLICY IF EXISTS employee_self_select ON employees;
CREATE POLICY employee_self_select ON employees
FOR SELECT
USING (email = (auth.jwt() ->> 'email'));
