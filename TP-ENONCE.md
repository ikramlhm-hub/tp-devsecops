# TP DevSecOps — De l'application au déploiement Azure

> **Module** : DevSecOps · **Durée** : 6-8h (2 séances) · **Niveau** : B3 / M1
> **Projet support** : `helpdesk` — application Next.js fullstack de gestion de tickets
> **Objectif global** : prendre une application web, la **conteneuriser**, la **tester** (unitaire + charge), la **sécuriser**, mettre en place une **CI/CD** et la **déployer** sur **Azure for Students**.

---

## 🎯 Compétences visées

À l'issue de ce TP, vous serez capable de :

- Conteneuriser une application Node.js multi-stage avec Docker
- Écrire des tests unitaires et mesurer la couverture de code
- Concevoir un test de montée en charge avec k6 et interpréter les résultats (p95, RPS, taux d'erreur)
- Identifier des vulnérabilités dans une application et ses dépendances (SAST + scan d'image)
- Construire un pipeline CI/CD GitHub Actions
- Déployer une image Docker sur Azure App Service via Azure Container Registry
- Gérer les secrets en production (Azure Key Vault / GitHub Secrets)

---

## 📦 Livrables attendus

Vous devez rendre, dans un **dépôt GitHub personnel** :

| # | Livrable | Détail |
|---|----------|--------|
| 1 | Code source forké | Avec tous vos ajouts (Dockerfile, tests, workflows) |
| 2 | `RAPPORT.md` | Captures + réponses aux questions de chaque étape |
| 3 | URL Azure publique | Lien vers votre app déployée et fonctionnelle |
| 4 | Workflow GitHub Actions vert | Tous les jobs passent |
| 5 | Rapport k6 | Fichier `k6-summary.json` ou capture du résumé |

**Date limite** : `[À COMPLÉTER]`

---

## 🚀 Mise en route

### Pré-requis logiciels

| Outil | Version min | Vérif |
|-------|-------------|-------|
| Node.js | 20.x | `node -v` |
| Docker Desktop | 24.x | `docker --version` |
| Git | 2.x | `git --version` |
| k6 | 0.50+ | `k6 version` ([install](https://k6.io/docs/getting-started/installation/)) |
| Azure CLI | 2.x | `az --version` ([install](https://learn.microsoft.com/cli/azure/install-azure-cli)) |

### Comptes nécessaires

- **GitHub** (gratuit)
- **Azure for Students** : activez votre compte sur [azure.microsoft.com/free/students](https://azure.microsoft.com/free/students/) — vous obtenez 100$ de crédit + services gratuits sans carte bancaire.

### Cloner et démarrer

```bash
# Forkez le repo sur GitHub puis :
git clone https://github.com/<votre-user>/helpdesk.git
cd helpdesk

npm install
cp .env.example .env
npx prisma migrate dev --name init
npx prisma db seed

npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000), connectez-vous avec `admin@helpdesk.io / Password123!` et explorez l'app **avant** de continuer.

**✅ Checkpoint** : capture d'écran de la page `/dashboard` avec au moins un ticket.

---

# ÉTAPE 1 — Conteneurisation Docker (90 min)

## 1.1 Lire le Dockerfile fourni

Ouvrez le `Dockerfile` à la racine. Il utilise un **multi-stage build** avec 3 étapes : `deps`, `builder`, `runner`.

### ❓ Questions à répondre dans `RAPPORT.md`

1. Pourquoi utilise-t-on un multi-stage build plutôt qu'un seul `FROM` ?
2. Que fait la ligne `output: 'standalone'` dans `next.config.js` et comment Docker l'exploite-t-elle ?
3. Pourquoi crée-t-on un utilisateur `nextjs` non-root ?
4. À quoi sert `HEALTHCHECK` dans le Dockerfile ?

## 1.2 Builder et lancer le conteneur

```bash
docker build -t helpdesk:dev .
docker images | grep helpdesk    # Notez la taille de l'image
docker run -d -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -base64 32)" \
  --name helpdesk-container helpdesk:dev

# Initialiser la DB dans le conteneur
docker exec helpdesk-container npx prisma migrate deploy
docker exec helpdesk-container npx tsx prisma/seed.ts

# Vérifier
curl http://localhost:3000/api/health
```

### ✅ Validation étape 1.2

- [ ] L'image fait **moins de 300 Mo**
- [ ] `curl /api/health` renvoie `{"status":"ok",...}`
- [ ] Vous pouvez vous connecter avec un compte de démo via le navigateur

## 1.3 Docker Compose

Le fichier `docker-compose.yml` est fourni. Lancez :

```bash
docker compose down -v       # nettoie tout
docker compose up -d --build
docker compose logs -f app   # observez les logs
```

### ❓ Question

5. Quel est l'avantage du volume `helpdesk-data` ? Faites le test : `docker compose down` (sans `-v`) puis `docker compose up -d` — vos tickets sont-ils toujours là ?

**📸 Capture à fournir** : sortie de `docker ps` et `docker images`.

---

# ÉTAPE 2 — Tests unitaires (60 min)

## 2.1 Lancer les tests fournis

```bash
npm test
npm run test:coverage    # ouvre coverage/index.html
```

Deux fichiers de tests existent déjà : `tests/unit/auth.test.ts` et `tests/unit/validators.test.ts`.

### ✅ Validation étape 2.1

- [ ] Tous les tests passent (✓)
- [ ] La couverture est affichée pour les fichiers `src/lib/*`

## 2.2 Ajouter vos propres tests

Vous devez **ajouter au moins 5 tests supplémentaires** dans `tests/unit/`. Suggestions :

- **Validators** : tester `loginSchema`, `ticketUpdateSchema` (cas limites)
- **Auth** : tester qu'un token expiré est rejeté (utilisez un payload avec `exp` passé)
- **Logique métier** : créez `src/lib/permissions.ts` avec une fonction `canEditTicket(user, ticket)` et testez-la

### ❓ Question

6. Quelle est votre couverture finale (% statements / branches / functions) ? Pourquoi est-elle < 100% sur certains fichiers ?

**📸 Capture à fournir** : sortie console `npm run test:coverage` montrant le tableau de couverture.

---

# ÉTAPE 3 — Tests de montée en charge avec k6 (60 min)

## 3.1 Smoke test

Avec l'app en cours d'exécution (Docker compose), lancez :

```bash
k6 run k6/smoke-test.js
```

### ❓ Questions

7. Que signifient les métriques `http_req_duration`, `http_req_failed`, `iterations` ?
8. Que se passe-t-il si vous coupez l'app pendant le smoke test ?

## 3.2 Test de charge

```bash
k6 run k6/load-test.js
```

Le test monte progressivement à **50 utilisateurs virtuels** sur 4 minutes.

### ❓ Questions

9. Quel est votre **p95** (95ème percentile de latence) ? Est-il sous le seuil défini (`p(95)<500`) ?
10. Quel est le **taux d'erreur** ? Combien de requêtes par seconde (RPS) votre app encaisse-t-elle ?
11. Pendant le test, ouvrez un second terminal : `docker stats helpdesk-app`. Quelle est l'utilisation CPU / RAM au pic ?

## 3.3 Pousser plus loin (bonus)

Modifiez `k6/load-test.js` pour monter à **200 VUs** sur 5 minutes. Observez quand l'app **casse** (timeouts, 503, etc.). Documentez le point de rupture.

**📸 Capture à fournir** : résumé console k6 + fichier `k6-summary.json`.

---

# ÉTAPE 4 — Sécurité (90 min)

## 4.1 Audit des dépendances

```bash
npm audit
npm audit --audit-level=high
```

### ❓ Question

12. Combien de vulnérabilités critiques / hautes ? Identifiez une et expliquez en 2 phrases la nature du risque (CVE + impact).

## 4.2 Scan d'image Docker avec Trivy

Installez [Trivy](https://aquasecurity.github.io/trivy/) puis :

```bash
trivy image helpdesk:dev --severity HIGH,CRITICAL
```

### ❓ Question

13. Quelles vulnérabilités trouve-t-on **dans l'image** qui ne sont pas remontées par `npm audit` ? D'où viennent-elles ?

## 4.3 Pentester l'app — exercices guidés

### 🎯 Exercice 4.3.1 — JWT secret faible

Le `.env.example` contient un `JWT_SECRET` trivial. Avec un compte USER, exfiltrez votre token (visible dans `localStorage` ou via DevTools réseau).

Allez sur [jwt.io](https://jwt.io), collez le token, et **tentez de modifier le rôle** dans le payload (`"role": "ADMIN"`). Pour resigner, utilisez le secret du `.env`.

**Test** : appelez `DELETE /api/tickets/<id>` avec ce token forgé.

### ❓ Question

14. Ça marche ? Pourquoi ? Quelles seraient les **3 mitigations** ? (taille du secret, rotation, alg, etc.)

### 🎯 Exercice 4.3.2 — Authorization bypass

En tant que `user@helpdesk.io`, essayez :

```bash
TOKEN="<votre token user>"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/tickets/<id-d-un-ticket-d-un-autre-user>
```

### ❓ Question

15. L'API protège-t-elle correctement contre l'IDOR (Insecure Direct Object Reference) ? Si oui, où dans le code ?

### 🎯 Exercice 4.3.3 — Headers de sécurité manquants

Ouvrez les DevTools → onglet Network → regardez les headers de réponse de la page d'accueil.

### ❓ Question

16. Quels headers de sécurité manquent ? (CSP, X-Frame-Options, Strict-Transport-Security, X-Content-Type-Options). Proposez un middleware Next.js qui les ajoute (code à inclure dans le rapport).

**📸 Capture à fournir** : sortie de `npm audit`, sortie de `trivy`, et capture montrant votre test d'escalade de privilèges.

---

# ÉTAPE 5 — CI/CD GitHub Actions (90 min)

## 5.1 Comprendre le workflow

Le fichier `.github/workflows/ci-cd.yml` contient 4 jobs : `test`, `security`, `docker`, `deploy`.

### ❓ Questions

17. Pourquoi le job `deploy` a-t-il `needs: [test, security, docker]` ?
18. Que fait `if: github.ref == 'refs/heads/main'` ?
19. Pourquoi a-t-on `continue-on-error: true` sur certains jobs ? Est-ce une bonne pratique ?

## 5.2 Exécuter le pipeline

1. Poussez votre code sur GitHub : `git push`
2. Onglet **Actions** → vérifiez que les jobs `test`, `security`, `docker` passent (pas `deploy` pour l'instant).
3. Si un job échoue, **corrigez** avant de continuer.

### ✅ Validation étape 5.2

- [ ] Workflow vert sur `test`, `security`, `docker`
- [ ] Artifact `coverage-report` téléchargeable depuis l'onglet Actions

**📸 Capture à fournir** : screenshot du workflow GitHub Actions en vert.

---

# ÉTAPE 6 — Déploiement Azure for Students (120 min)

## 6.1 Setup Azure CLI

```bash
az login                                    # ouvre un navigateur
az account list --output table              # vérifiez votre souscription Azure for Students
az account set --subscription "<id>"        # si plusieurs
```

## 6.2 Créer les ressources Azure

> **⚠ Azure for Students** : utilisez les régions `francecentral` ou `westeurope`. Évitez les services Premium (non couverts par le crédit étudiant).

```bash
# Variables (CHANGEZ <vosinitiales>)
RG=helpdesk-rg
LOCATION=francecentral
ACR=helpdeskacr<vosinitiales>     # doit être unique globalement, minuscules
APP_NAME=helpdesk-<vosinitiales>  # idem
PLAN=helpdesk-plan

# Groupe de ressources
az group create --name $RG --location $LOCATION

# Azure Container Registry (SKU Basic = couvert par crédit étudiant)
az acr create --resource-group $RG --name $ACR --sku Basic --admin-enabled true

# App Service Plan en tier B1 (Basic, le moins cher avec support Linux containers)
az appservice plan create \
  --name $PLAN \
  --resource-group $RG \
  --location $LOCATION \
  --is-linux \
  --sku B1

# Récupérer les credentials ACR
ACR_SERVER=$(az acr show --name $ACR --query loginServer --output tsv)
ACR_USER=$(az acr credential show --name $ACR --query username --output tsv)
ACR_PASS=$(az acr credential show --name $ACR --query passwords[0].value --output tsv)
echo "Server : $ACR_SERVER"
echo "User   : $ACR_USER"
```

> 💡 **Alternative gratuite** : si vous voulez rester 100% sur le tier gratuit, utilisez `--sku F1` (mais sans support Docker — il faut alors déployer en code source, ce qui sort du cadre du TP).

## 6.3 Pousser l'image sur ACR

```bash
# Login Docker sur ACR
docker login $ACR_SERVER -u $ACR_USER -p $ACR_PASS

# Tag + push
docker tag helpdesk:dev $ACR_SERVER/helpdesk:v1
docker push $ACR_SERVER/helpdesk:v1
```

## 6.4 Créer la Web App

```bash
JWT=$(openssl rand -base64 32)

az webapp create \
  --resource-group $RG \
  --plan $PLAN \
  --name $APP_NAME \
  --deployment-container-image-name $ACR_SERVER/helpdesk:v1

# Configurer les credentials ACR
az webapp config container set \
  --name $APP_NAME \
  --resource-group $RG \
  --docker-custom-image-name $ACR_SERVER/helpdesk:v1 \
  --docker-registry-server-url https://$ACR_SERVER \
  --docker-registry-server-user $ACR_USER \
  --docker-registry-server-password $ACR_PASS

# Variables d'environnement
az webapp config appsettings set \
  --resource-group $RG \
  --name $APP_NAME \
  --settings \
    DATABASE_URL="file:/home/data/prod.db" \
    JWT_SECRET="$JWT" \
    NODE_ENV="production" \
    WEBSITES_PORT=3000

# Activer le stockage persistant (pour SQLite)
az webapp config storage-account add \
  --resource-group $RG \
  --name $APP_NAME \
  --custom-id helpdeskdata \
  --storage-type AzureFiles \
  --account-name <votre-storage-account> \
  --share-name helpdesk-data \
  --mount-path /home/data 2>/dev/null || echo "Skip — alternative : utilisez /home (persisté par défaut)"
```

> 💡 **Pour SQLite en production sur App Service** : le dossier `/home` est persisté entre les redémarrages. Configurez `DATABASE_URL="file:/home/prod.db"` et faites un `prisma migrate deploy` au démarrage (à ajouter dans un script d'init).

## 6.5 Initialiser la DB en prod

```bash
# Trouver l'URL de votre app
APP_URL=$(az webapp show --resource-group $RG --name $APP_NAME --query defaultHostName -o tsv)
echo "https://$APP_URL"

# SSH dans le container
az webapp ssh --resource-group $RG --name $APP_NAME

# Une fois connecté :
cd /app
npx prisma migrate deploy
npx tsx prisma/seed.ts
exit
```

## 6.6 Vérifier le déploiement

```bash
curl https://$APP_URL/api/health
# → {"status":"ok",...}
```

Ouvrez `https://$APP_URL` dans un navigateur. Connectez-vous avec `admin@helpdesk.io / Password123!`.

### ✅ Validation étape 6

- [ ] L'app est accessible publiquement via HTTPS
- [ ] Vous pouvez vous connecter et créer un ticket
- [ ] Le healthcheck répond `ok`

## 6.7 Connecter la CI au déploiement (bonus)

Dans GitHub → **Settings** → **Secrets and variables** → **Actions**, ajoutez :

| Secret | Valeur |
|--------|--------|
| `AZURE_CREDENTIALS` | sortie de `az ad sp create-for-rbac --sdk-auth` |
| `ACR_LOGIN_SERVER` | `$ACR_SERVER` |
| `ACR_USERNAME` | `$ACR_USER` |
| `ACR_PASSWORD` | `$ACR_PASS` |
| `AZURE_WEBAPP_NAME` | `$APP_NAME` |

Poussez sur `main` → le job `deploy` doit passer et redéployer l'image.

**📸 Capture à fournir** : URL Azure dans le navigateur + dashboard de l'app.

---

# 🏁 Synthèse finale

Dans `RAPPORT.md`, rédigez en conclusion (1 page max) :

1. **Architecture finale** : un schéma simple (ASCII ou Excalidraw) montrant le flux complet `dev → GitHub → CI → ACR → App Service`.
2. **3 améliorations DevSecOps** que vous mettriez en place avec plus de temps (ex: Key Vault pour les secrets, monitoring App Insights, scan SAST avec SonarQube, etc.).
3. **Coût Azure** estimé : combien votre crédit étudiant a-t-il été entamé ?
4. **Ce qui vous a posé problème** et comment vous l'avez résolu.

---

# 📊 Grille d'évaluation (sur 20)

| Critère | Points |
|---------|--------|
| **Étape 1** — Docker fonctionnel + questions | 3 |
| **Étape 2** — Tests unitaires + 5 nouveaux tests | 2 |
| **Étape 3** — Test k6 lancé et interprété | 2 |
| **Étape 4** — Audit sécu + 3 exercices | 4 |
| **Étape 5** — CI/CD GitHub Actions vert | 3 |
| **Étape 6** — Déploiement Azure fonctionnel | 4 |
| **Rapport** — Clarté, captures, réponses | 2 |
| **Bonus** — k6 200 VUs / CI deploy auto / middleware sécu | +2 |

---

# 🆘 Troubleshooting

| Problème | Solution |
|----------|----------|
| `prisma migrate` échoue dans Docker | Vérifiez que `DATABASE_URL` est bien `file:/app/data/...` et que `/app/data` existe |
| Image Docker > 500 Mo | Vérifiez `.dockerignore` et que `output: 'standalone'` est bien dans `next.config.js` |
| `k6` échoue sur `dial tcp` | App pas démarrée ou mauvaise URL — vérifiez `BASE_URL` |
| Azure : Web App répond 503 | Logs : `az webapp log tail --name $APP_NAME --resource-group $RG` |
| Azure : "DOCKER_REGISTRY_SERVER..." | Refaites le `az webapp config container set` |
| Quota Azure dépassé | Vérifiez `az consumption usage list` — passez en B1 si vous étiez sur P1V2 |

---

**Bon TP ! 🚀**

> Pour toute question : utilisez le canal Discord/Teams du cours.
> Les commits doivent être atomiques et avoir des messages clairs (conventional commits si possible).
