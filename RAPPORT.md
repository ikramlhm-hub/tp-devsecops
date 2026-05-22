# RAPPORT — TP DevSecOps

**Étudiante** : Ikram Lahmouri  
**Dépôt** : https://github.com/ikramlhm-hub/tp-devsecops  
**App déployée** : http://180.149.198.63

## Mise en route

Installation, configuration et lancement de l'application en local :

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
npm run dev
```

![Dashboard local](captures/capture-01.png)
*L'application tourne sur localhost:3000 — dashboard admin avec les tickets de test*

## Étape 1 — Docker

### Questions sur le Dockerfile

**Q1 — Pourquoi un multi-stage build ?**

Avec un seul `FROM`, l'image finale embarquerait tout : TypeScript, les sources, les devDependencies, le CLI Prisma... soit environ 1 GB. Le multi-stage sépare les rôles :

| Stage | Rôle | Dans l'image finale |
|---|---|---|
| `deps` | `npm ci` — installe toutes les dépendances | Non |
| `builder` | Compile TypeScript, génère le build Next.js | Non |
| `runner` | Copie uniquement les artefacts de prod | Oui |

Résultat : 234 MB au lieu de ~1 GB.

**Q2 — `output: 'standalone'` dans next.config.js**

Cette option génère un dossier `.next/standalone` avec un `server.js` autonome et uniquement les modules nécessaires à l'exécution. Docker exploite ça dans le stage `runner` :

```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
CMD ["node", "server.js"]
```

Sans cette option, il faudrait copier l'intégralité de `node_modules` dans l'image finale.

**Q3 — Utilisateur non-root**

Si un attaquant exploite une faille dans l'app, il se retrouve avec les droits de l'utilisateur `nextjs` (uid 1001, sans shell) et non de `root`. Il ne peut ni modifier le système, ni installer des outils, ni lire des fichiers sensibles. C'est le principe du moindre privilège.

**Q4 — HEALTHCHECK**

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --spider http://localhost:3000/api/health || exit 1
```

Docker interroge `/api/health` toutes les 30 secondes. Après 3 échecs consécutifs, le conteneur passe en `unhealthy` et peut être redémarré automatiquement. Sans ça, un conteneur planté mais toujours "en cours d'exécution" serait invisible.

### Build et lancement

```bash
docker build -t helpdesk:dev .
# Image: 234 MB (moins de 300 Mo requis)

docker run -d -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -base64 32)" \
  -e DATABASE_URL="file:/app/dev.db" \
  --name helpdesk-container helpdesk:dev

docker cp prisma/dev.db helpdesk-container:/app/dev.db
curl http://localhost:3000/api/health
# {"status":"ok"}
```

### Docker Compose

```bash
docker compose up -d
docker cp prisma/dev.db helpdesk-app:/app/data/dev.db
curl http://localhost:3000/api/health
# {"status":"ok"}
```

## Étape 2 — Tests unitaires

### Tests existants

```bash
npm test
# auth.test.ts (6 tests)
# validators.test.ts (7 tests)
# 13 tests passent
```

### Nouveaux tests ajoutés

**`src/lib/permissions.ts`** — fichier créé :

```typescript
export function canEditTicket(user: User, ticket: Ticket): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'AGENT') return true;
  if (user.role === 'USER' && ticket.authorId === user.id) return true;
  return false;
}

export function canDeleteTicket(user: User): boolean {
  return user.role === 'ADMIN';
}
```

Tests ajoutés :

- `permissions.test.ts` — 6 tests : ADMIN/AGENT peuvent tout modifier, USER seulement ses tickets, seul ADMIN peut supprimer
- `extra.test.ts` — 6 tests : `loginSchema` (cas valides et invalides), `ticketUpdateSchema`, token JWT expiré

Total : 25 tests passent sur 4 fichiers.

### Couverture finale

![Tableau de couverture](captures/capture-03.png)
*Résultat de npm run test:coverage — couverture sur src/lib/*

| Fichier | Statements | Branches | Fonctions |
|---|---|---|---|
| `validators.ts` | 100% | 100% | 100% |
| `permissions.ts` | 100% | 100% | 100% |
| `auth.ts` | 80% | 100% | 80% |
| `prisma.ts` | 0% | 0% | 0% |

**Pourquoi moins de 100% sur certains fichiers ?**

- `auth.ts` à 80% : la fonction `getAuthFromRequest()` dépend de `NextRequest`, un objet Next.js impossible à instancier proprement en test unitaire. Les lignes 39-43 restent non couvertes.
- `prisma.ts` à 0% : ce fichier initialise uniquement la connexion à la DB. On ne teste pas une connexion réelle en unitaire, c'est du ressort des tests d'intégration.
- Routes API et pages React à 0% : nécessitent un serveur Next.js complet (Cypress, Playwright).

## Étape 3 — Tests de charge k6

### Smoke test (1 VU, 10 secondes)

```bash
k6 run k6/smoke-test.js
```

| Métrique | Résultat | Seuil | Validation |
|---|---|---|---|
| p(95) latency | 1.61 ms | moins de 200 ms | OK |
| Taux d'erreur | 0% | moins de 1% | OK |
| Requêtes/s | 986 | — | — |

### Load test (50 VUs, 4 minutes)

```bash
k6 run k6/load-test.js
```

![Résultats k6 — 50 VUs et 200 VUs](captures/capture-04.png)
*Résumés k6 : 50 VUs (haut) et 200 VUs (bas)*

| Métrique | Résultat | Seuil | Validation |
|---|---|---|---|
| p(95) latency | 12 ms | moins de 500 ms | OK |
| Taux d'erreur | 33% | moins de 1% | Dépassé |
| Requêtes totales | 25 603 | — | — |

La latence est excellente mais 33% d'erreurs révèlent une limite de SQLite : le verrou exclusif en écriture bloque les créations de tickets simultanées (`SQLITE_BUSY`). Les lectures ne sont pas impactées.

### Bonus — 200 VUs (5 minutes)

![Load test 200 VUs](captures/capture-05.png)
*200 VUs sur 5 minutes — point de rupture documenté*

| Métrique | 50 VUs | 200 VUs |
|---|---|---|
| p(95) | 12 ms | 13 ms |
| Erreurs | 33% | 33% |
| Requêtes | 25 603 | 89 572 |

Point de rupture : dès 50 VUs. Le taux d'erreur reste stable à 33% même à 200 VUs et la latence ne se dégrade pas — ce qui confirme que le problème vient uniquement du verrou SQLite, pas des ressources système. En production, PostgreSQL ou MySQL résoudrait totalement ce problème.

## Étape 4 — Sécurité

### Audit npm

```bash
npm audit --audit-level=high
# 11 vulnerabilities (7 moderate, 4 high)
```

![npm audit et Trivy](captures/capture-06.png)
*Résultats npm audit (haut) et scan Trivy (bas)*

4 HIGH détectées :

| Package | Vulnérabilité |
|---|---|
| `next` 14.2.33 | DoS via Server Components, cache poisoning, XSS |
| `glob` 10.4.2 | Command injection via filenames malveillants |

Recommandation : mise à jour vers `next >= 14.2.34`. Le fix requiert `npm audit fix --force` à tester avec régression avant déploiement.

### Scan Trivy

```bash
trivy image helpdesk:dev --severity HIGH,CRITICAL
# Total: 18 (HIGH: 18, CRITICAL: 0)
```

18 vulnérabilités HIGH sur `next`, `glob`, `tar`, `cross-spawn`, `minimatch`. Toutes ont un fix disponible. Les CVE sur `tar` (path traversal) seraient critiques si l'app traitait des uploads d'archives.

### Exercice 1 — JWT secret faible

Le `.env.example` contient :
```
JWT_SECRET="change-me-in-production-use-a-strong-secret-key-please"
```

Procédure :

1. Connexion avec `user@helpdesk.io` — token récupéré dans le localStorage

![Token JWT dans le localStorage](captures/capture-07.png)
*Token JWT visible dans les DevTools, onglet Application, Local Storage*

2. Sur jwt.io : `"role": "USER"` modifié en `"role": "ADMIN"`, resigné avec le secret du `.env`

![jwt.io avec payload ADMIN forgé](captures/capture-08.png)
*Token forgé avec rôle ADMIN — secret valide confirmé par jwt.io, résultat DELETE en dessous*

3. `DELETE /api/tickets/<id>` avec le token forgé retourne `{"ok":true}` — le ticket est supprimé.

Résultat : oui, ça marche. L'app accepte n'importe quel token valide sans vérifier le rôle en base. Un USER peut se faire passer pour ADMIN.

3 mitigations :

1. Secret fort — `openssl rand -base64 64` génère 512 bits aléatoires. Le stocker dans Azure Key Vault, jamais dans un `.env` versionné.
2. Rotation — renouveler le secret tous les 90 jours. Un secret compromis non tourné reste exploitable indéfiniment.
3. Vérification en base — pour les actions critiques, vérifier le rôle réel de l'utilisateur en DB à chaque requête sensible, pas seulement dans le token.

### Exercice 2 — Authorization bypass

```bash
curl -H "Authorization: Bearer $TOKEN_USER" \
  http://localhost:3001/api/tickets/<id-ticket-admin>
# {"error":"Forbidden"}
```

![Authorization bypass — Forbidden](captures/capture-10.png)
*Un USER ne peut pas accéder au ticket d'un autre utilisateur — 403 retourné*

La protection est en place. Le code vérifie correctement l'ownership :

```typescript
if (auth.role === 'USER' && ticket.authorId !== auth.userId) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Exercice 3 — Headers de sécurité manquants

Headers absents des réponses HTTP :

| Header | Protection |
|---|---|
| `Content-Security-Policy` | Contre les attaques XSS |
| `X-Frame-Options` | Contre le clickjacking |
| `Strict-Transport-Security` | Force HTTPS, contre le MITM |
| `X-Content-Type-Options` | Contre le MIME sniffing |

Middleware créé (`middleware.ts`) :

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;"
  )
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

Note : en mode `output: standalone`, le middleware ne s'applique pas via `node server.js`. En production, la solution propre est un reverse proxy Nginx ou la configuration des headers dans `next.config.js` via `headers()`.

## Étape 5 — CI/CD GitHub Actions

Le fichier `.github/workflows/ci-cd.yml` enchaîne 4 jobs :

```
test → security → docker → deploy (main uniquement)
```

Chaque job ne s'exécute que si le précédent réussit — principe du pipeline gate : une vulnérabilité critique ou un test échoué bloque le déploiement.

3 corrections apportées pour obtenir le pipeline vert :

| Problème | Solution |
|---|---|
| ESLint non configuré | Ajout de `.eslintrc.json` |
| Dossier `public` vide non versionné | Ajout de `public/.gitkeep` |
| Image Docker non disponible pour Trivy | Ajout de `load: true` dans build-push-action |

![Pipeline GitHub Actions vert](captures/capture-11.png)
*Jobs test, security et docker verts sur la branche develop*

## Étape 6 — Déploiement

### Contexte

L'abonnement Azure for Students était expiré au moment du TP. Plutôt que de ne pas rendre cette partie, j'ai déployé sur le VPS Debian fourni par l'école — les concepts mis en oeuvre sont identiques.

| | Azure (prévu) | Solution retenue |
|---|---|---|
| Registry | Azure Container Registry | Docker Hub |
| Hébergement | Azure App Service | VPS Debian |
| CI Deploy | `azure/webapps-deploy` | `appleboy/ssh-action` |

### Déploiement

```bash
docker tag helpdesk:dev ikram279/helpdesk:v1
docker push ikram279/helpdesk:v1

# Sur le VPS via SSH
docker run -d -p 80:3000 \
  --name helpdesk-app \
  --restart unless-stopped \
  -e JWT_SECRET="$(openssl rand -base64 32)" \
  -e DATABASE_URL="file:/app/data/dev.db" \
  ikram279/helpdesk:v1

docker cp /tmp/dev.db helpdesk-app:/app/data/dev.db
curl http://localhost/api/health
# {"status":"ok"}
```

![Déploiement sur le VPS](captures/capture-12.png)
*Conteneur lancé sur le VPS — health check OK*

![Page d'accueil sur l'IP publique](captures/capture-13.png)
*Application accessible sur http://180.149.198.63*

![Dashboard admin sur le VPS](captures/capture-14.png)
*Dashboard connecté en admin — tickets visibles en production*

### CI/CD automatisé (bonus)

Secrets configurés dans GitHub Actions :

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` | Authentification Docker Hub |
| `VPS_HOST` / `VPS_USER` / `VPS_PASSWORD` | Connexion SSH au VPS |

A chaque push sur `main` : build, push Docker Hub, redéploiement automatique via SSH.

![Pipeline complet vert avec Deploy to VPS](captures/capture-15.png)
*4 jobs verts sur main — le deploy automatique fonctionne*

## Synthèse

### Architecture

```
┌─────────────────────────────────────────────────┐
│                  DEV (local)                    │
│  code → commit → git push origin develop        │
└────────────────────┬────────────────────────────┘
                     |
                     v
┌─────────────────────────────────────────────────┐
│              GITHUB — develop                   │
│                                                 │
│  [test] ──> [security] ──> [docker]             │
│  lint+       audit+          build+             │
│  vitest      trivy fs        trivy img          │
│                                                 │
│       git merge develop → main                  │
└────────────────────┬────────────────────────────┘
                     |
                     v
┌─────────────────────────────────────────────────┐
│              GITHUB — main                      │
│                                                 │
│  [deploy]                                       │
│  1. docker build                                │
│  2. push → Docker Hub (ikram279/helpdesk)       │
│  3. SSH → VPS → docker pull + run               │
└────────────────────┬────────────────────────────┘
                     |
                     v
┌─────────────────────────────────────────────────┐
│         VPS Debian — 180.149.198.63             │
│         http://180.149.198.63                   │
└─────────────────────────────────────────────────┘

Equivalent Azure : Docker Hub → ACR  /  VPS → App Service
```

### 3 améliorations avec plus de temps

**1. Secrets dans Azure Key Vault**

Le `JWT_SECRET` est actuellement injecté via une variable d'environnement. En production, il doit être stocké dans un gestionnaire de secrets (Key Vault, HashiCorp Vault) et récupéré au démarrage via une identité managée — jamais exposé dans les logs ni les variables visibles.

**2. Monitoring avec Prometheus et Grafana**

L'app n'a aucune observabilité au-delà de `/api/health`. Il faudrait des métriques (latence, taux d'erreur, RPS), des logs structurés JSON et des alertes automatiques. Cela aurait aussi permis de détecter le bottleneck SQLite en temps réel pendant les tests k6.

**3. SAST avec SonarQube ou Semgrep**

L'audit npm et Trivy détectent les vulnérabilités dans les dépendances. Un outil SAST analyse le code source lui-même : injections potentielles, secrets hardcodés, failles de logique métier. A intégrer dans le pipeline entre les jobs `security` et `docker`.

### Coût

Azure non utilisé — coût 0 euro. Le VPS est fourni par l'école, Docker Hub est gratuit.

Estimé avec Azure : ACR Basic (~5$/mois) + App Service B1 (~13$/mois) = moins de 1$ sur la durée du TP.

### Difficultés rencontrées

| Problème | Solution |
|---|---|
| `npx prisma migrate deploy` échoue dans le conteneur — le CLI Prisma n'est pas dans l'image finale | `docker cp prisma/dev.db` pour copier la DB directement |
| Disque saturé à 100% pendant les builds Docker | `docker system prune -a` + suppression des dossiers en double (1,8 GB récupérés) |
| Middleware Next.js sans effet en mode standalone | Documenté — solution : reverse proxy Nginx ou `headers()` dans `next.config.js` |
| Azure for Students expiré | Déploiement sur VPS Debian — mêmes concepts, résultat équivalent |
| Pipeline rouge au premier push | 3 corrections ciblées diagnostiquées via les logs GitHub Actions |

*Ikram Lahmouri — TP DevSecOps*
