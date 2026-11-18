# SamaDeal

Marketplace d'articles d'occasion au Sénégal (React + Vite + Tailwind + Supabase).

## Mise en route

1. **Base de données** : déjà en place dans le projet Supabase « SamaDealL » (tables, règles RLS, stockage des photos). Le dossier `supabase/migrations/` garde la trace des changements.
2. **Authentification** : Supabase > Authentication > URL Configuration : mettre l'URL du site en *Site URL* et dans *Redirect URLs* (aussi `http://localhost:3000`). Garder « Confirm email » activé.
3. **Variables** : copier `.env.example` en `.env.local` et renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (à reproduire dans l'hébergeur : Vercel/Netlify).
4. `npm install` puis `npm run dev` (local) ou `npm run build` (dossier `dist/`).
5. **Premier admin** : créer un compte sur le site, confirmer l'e-mail, puis exécuter dans SQL Editor : `update public.profiles set role = 'admin' where email = 'TON_EMAIL';`

## Pas encore en ligne
Messagerie interne (le bouton « Contacter » ouvre WhatsApp), paiement séquestre Wave / Orange Money, boost payant, vérification du téléphone par SMS.
