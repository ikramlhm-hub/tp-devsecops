# Helpdesk — Support Tickets

Mini-plateforme de gestion de tickets fournie pour le **TP DevSecOps**.

> 👉 **L'énoncé complet du TP est dans [`TP-ENONCE.md`](./TP-ENONCE.md).**
> Ce README sert uniquement à vérifier que le projet démarre en local.

---

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind
- **Prisma** + **SQLite**
- **JWT** pour l'auth, **bcrypt** pour les passwords
- **Vitest** pour les tests
- **k6** pour les tests de charge

## Démarrage rapide (sans Docker)

```bash
# 1. Dépendances
npm install

# 2. Variables d'environnement
cp .env.example .env

# 3. Base de données + seed
npx prisma migrate dev --name init
npx prisma db seed

# 4. Lancer en dev
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Comptes de démo

| Rôle  | Email                | Mot de passe   |
|-------|----------------------|----------------|
| ADMIN | admin@helpdesk.io    | Password123!   |
| AGENT | agent@helpdesk.io    | Password123!   |
| USER  | user@helpdesk.io     | Password123!   |

## Endpoints API

| Méthode | Route                   | Auth | Description              |
|---------|-------------------------|------|--------------------------|
| GET     | `/api/health`           | ❌   | Healthcheck              |
| POST    | `/api/auth/register`    | ❌   | Inscription              |
| POST    | `/api/auth/login`       | ❌   | Connexion → JWT          |
| GET     | `/api/tickets`          | ✅   | Liste des tickets        |
| POST    | `/api/tickets`          | ✅   | Créer un ticket          |
| GET     | `/api/tickets/[id]`     | ✅   | Détail d'un ticket       |
| PATCH   | `/api/tickets/[id]`     | ✅   | Modifier un ticket       |
| DELETE  | `/api/tickets/[id]`     | ✅   | Supprimer (ADMIN only)   |

## Scripts utiles

```bash
npm run dev              # serveur dev
npm run build            # build production
npm test                 # tests unitaires
npm run test:coverage    # tests + couverture
npm run prisma:migrate   # migrations DB
npm run prisma:seed      # seed DB
```
