# Product Requirements Document (PRD)
## Système d'Extensions WhatAutosys v2.0

**Version:** 1.0  
**Date:** 24 Décembre 2025  
**Auteur:** Équipe Produit WhatAutosys  
**Status:** Draft → Validation

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Problématique & Objectifs](#problématique--objectifs)
3. [Personas & Use Cases](#personas--use-cases)
4. [Spécifications Fonctionnelles](#spécifications-fonctionnelles)
5. [Architecture Technique](#architecture-technique)
6. [Expérience Utilisateur](#expérience-utilisateur)
7. [Sécurité & Permissions](#sécurité--permissions)
8. [Roadmap & Phases](#roadmap--phases)
9. [Métriques de Succès](#métriques-de-succès)
10. [Risques & Mitigations](#risques--mitigations)
11. [Ressources & Budget](#ressources--budget)

---

## 1. Vue d'Ensemble

### 1.1 Contexte

WhatAutosys v1 est actuellement un client WhatsApp Desktop avec des fonctionnalités avancées, mais il a évolué vers un outil **trop spécialisé pour les commerciaux**, ce qui limite son adoption par d'autres segments d'utilisateurs (freelances, créatifs, support client, etc.).

### 1.2 Vision Produit

**Transformer WhatAutosys en une plateforme modulaire** où chaque utilisateur peut personnaliser son expérience en activant uniquement les fonctionnalités dont il a besoin via un **système d'extensions**.

**Analogie:** VS Code pour la messagerie WhatsApp
- Core léger et performant
- Marketplace d'extensions riches
- Personnalisation infinie
- Écosystème ouvert aux développeurs tiers

### 1.3 Objectifs Stratégiques

| Objectif | Description | Impact |
|----------|-------------|--------|
| **Démocratisation** | Rendre WhatAutosys utilisable par tous les profils | +300% TAM potentiel |
| **Monétisation** | Modèle freemium avec extensions premium | +40% ARR prévu |
| **Scalabilité** | Architecture permettant croissance rapide du catalogue | 50+ extensions an 2 |
| **Écosystème** | Attirer des développeurs tiers | Effet réseau |

---

## 2. Problématique & Objectifs

### 2.1 Problèmes Actuels

#### 🔴 P0 - Critique
- **Sur-spécialisation involontaire:** L'app est devenue un "CRM pour commerciaux" alors que ce n'était pas la vision initiale
- **Barrière à l'adoption:** Un graphiste ou un coach n'a pas besoin de "Hot Leads" ou de "marges de négociation"
- **Code monolithique:** Toutes les fonctionnalités sont chargées même si non utilisées

#### 🟡 P1 - Important
- **Maintenance difficile:** Ajouter une feature requiert de toucher au core
- **Tests complexes:** Impossible de tester indépendamment chaque module
- **Pas de monétisation granulaire:** Impossible de vendre séparément certaines fonctionnalités

### 2.2 Objectifs SMART

| Objectif | Mesurable | Deadline |
|----------|-----------|----------|
| **O1** | Extraire 3 modules (CRM, E-commerce, Marketing) en extensions fonctionnelles | Fin Phase 2 (S10) |
| **O2** | Réduire de 40% la taille du bundle Core | Fin Phase 3 (S14) |
| **O3** | Lancer le Store avec 5 extensions disponibles | Fin Phase 4 (S18) |
| **O4** | Atteindre 30% d'utilisateurs avec ≥1 extension active | 3 mois post-launch |
| **O5** | Publier SDK et onboarder 2 développeurs externes | 6 mois post-launch |

---

## 3. Personas & Use Cases

### 3.1 Personas Cibles

#### Persona 1: Marie - Freelance Graphiste
**Besoins:**
- Gestion simple des conversations clients
- IA pour répondre rapidement aux demandes récurrentes
- Envoi de fichiers lourds (maquettes, logos)

**Extensions utiles:**
- ✅ Core (messagerie + IA neutre)
- ❌ CRM, Hot Leads (inutile)
- ✅ Extension "Créatifs" (templates de réponses, compression images)

#### Persona 2: Thomas - Commercial B2B
**Besoins:**
- Détection automatique des prospects chauds
- Suivi des négociations
- Campagnes de prospection

**Extensions utiles:**
- ✅ Core
- ✅ CRM (Hot Leads, scoring)
- ✅ E-commerce (catalogue, négociation)
- ✅ Marketing (campagnes)

#### Persona 3: Sarah - Support Client SaaS
**Besoins:**
- Réponses rapides avec IA spécialisée support
- Base de connaissance intégrée
- Tickets et suivi

**Extensions utiles:**
- ✅ Core
- ✅ Extension "Support" (tickets, FAQ, SLA)
- ❌ E-commerce, Marketing

### 3.2 User Stories

```gherkin
# US-001: Installation d'extension depuis le Store
Given je suis un utilisateur connecté
When je browse le Store intégré
And je clique sur "Installer" pour l'extension CRM
Then l'extension est téléchargée et installée automatiquement
And un message de confirmation apparaît
And je suis invité à redémarrer l'application

# US-002: Import manuel d'une extension
Given j'ai reçu un fichier extension.wext par email
When je fais un drag & drop du fichier dans l'app
Then le système valide la signature
And affiche les permissions requises
And me demande confirmation avant installation

# US-003: Désactivation temporaire
Given j'ai 5 extensions installées
When je désactive l'extension "Marketing" depuis les paramètres
Then les fonctionnalités marketing disparaissent de l'UI
And l'extension reste installée (pas de désinstallation)
And je peux la réactiver en un clic

# US-004: Mise à jour automatique
Given une nouvelle version de l'extension CRM est disponible
When je lance l'application
Then une notification m'informe de la mise à jour
And je peux l'installer en un clic
And un changelog s'affiche
```

---

## 4. Spécifications Fonctionnelles

### 4.1 Core Features (Toujours Présents)

#### 4.1.1 Messagerie de Base
- ✅ Connexion WhatsApp via QR Code
- ✅ Envoi/réception tous types de médias
- ✅ Historique local (SQLite)
- ✅ Recherche dans les conversations
- ✅ Gestion des contacts

#### 4.1.2 IA Assistant Neutre
- ✅ Chatbot configurable (non-commercial par défaut)
- ✅ Suggestions de réponses (mode co-pilote)
- ✅ Personnalisation du ton et du style
- ❌ **Supprimé du Core:** Persona commercial imposée, objectifs de vente, négociation

#### 4.1.3 Système d'Extensions
- ✅ ExtensionManager (chargement/validation)
- ✅ Store intégré
- ✅ Import manuel (.wext)
- ✅ Gestion des permissions
- ✅ Mises à jour automatiques

### 4.2 Extensions Officielles (Phase 1)

#### Extension 1: CRM Pro
**ID:** `com.whatautosys.crm`  
**Prix:** 19€/mois  
**Description:** Détection automatique de Hot Leads avec scoring et alertes

**Fonctionnalités:**
- Analyse en temps réel des messages entrants (mots-clés, urgence)
- Score de 0-100 pour chaque prospect
- Alertes Telegram si score > seuil
- Dashboard de suivi des leads
- Export CSV

**Hooks utilisés:**
- `onMessageReceived` → analyse automatique
- `onContactAdded` → initialisation scoring

**Permissions:**
- `read:messages`
- `write:database`
- `send:notifications`

---

#### Extension 2: E-commerce
**ID:** `com.whatautosys.ecommerce`  
**Prix:** 29€/mois  
**Description:** Catalogue produits et négociation assistée par IA

**Fonctionnalités:**
- Import catalogue (CSV/JSON)
- Affichage produits dans la conversation
- Module de négociation avec marges min/max
- IA détecte les demandes de prix et propose réponses
- Historique des ventes

**Hooks utilisés:**
- `onMessageReceived` → détection demande prix
- `onAIPrompt` → injection contexte catalogue

**Permissions:**
- `read:messages`
- `write:database`
- `access:ai`

---

#### Extension 3: Marketing Campaigns
**ID:** `com.whatautosys.marketing`  
**Prix:** 39€/mois  
**Description:** Campagnes de diffusion hyper-personnalisées

**Fonctionnalités:**
- Import liste contacts (CSV)
- Génération IA de messages uniques par contact
- Système anti-ban (délais aléatoires, typing simulation)
- File d'attente gérée
- Analytics temps réel (envoyés, lus, réponses)

**Hooks utilisés:**
- `onCampaignScheduled` → démarrage automatique
- `beforeMessageSend` → vérification anti-spam

**Permissions:**
- `read:contacts`
- `send:messages`
- `access:ai`
- `write:database`

---

#### Extension 4: Brain (Documents RAG)
**ID:** `com.whatautosys.brain`  
**Prix:** Gratuit (Core feature déplacée)  
**Description:** Upload de documents pour enrichir les réponses IA

**Fonctionnalités:**
- Upload PDF, DOCX, TXT
- Indexation automatique
- IA "lit" les documents pour répondre
- Gestion multi-documents

**Hooks utilisés:**
- `onAIPrompt` → injection contexte documents

**Permissions:**
- `read:files`
- `access:ai`

---

#### Extension 5: Goals (Objectifs)
**ID:** `com.whatautosys.goals`  
**Prix:** Gratuit (Core feature déplacée)  
**Description:** Définition d'objectifs conversationnels

**Fonctionnalités:**
- Création de stratégies (ex: "Prendre RDV")
- Tactiques et indicateurs de succès
- L'IA adapte son comportement selon l'objectif
- Dashboard de performance

**Hooks utilisés:**
- `onAIPrompt` → injection contexte objectifs
- `onMessageSent` → tracking succès

**Permissions:**
- `access:ai`
- `write:database`

---

### 4.3 Format d'Extension (.wext)

#### Structure du Fichier
```
extension-crm-1.2.0.wext (Archive ZIP signée)
│
├── manifest.json          # Métadonnées obligatoires
├── index.js               # Point d'entrée
├── package.json           # Dépendances npm (optionnel)
│
├── ui/                    # Composants React
│   ├── HotLeadsPanel.jsx
│   ├── SettingsPage.jsx
│   └── styles.css
│
├── handlers/              # Logique métier
│   ├── analyzeMessage.js
│   └── scoring.js
│
├── migrations/            # SQL
│   ├── 001_create_tables.sql
│   └── 002_add_indexes.sql
│
├── assets/                # Ressources
│   ├── icon.png (256x256)
│   ├── screenshot1.png
│   └── screenshot2.png
│
├── docs/
│   ├── README.md
│   └── CHANGELOG.md
│
└── signature.json         # Signature numérique
```

#### manifest.json (Spec Complète)
```json
{
  "manifestVersion": "2.0",
  "id": "com.whatautosys.crm",
  "name": "CRM Pro",
  "version": "1.2.0",
  "description": "Détection automatique de Hot Leads avec scoring intelligent",
  
  "author": {
    "name": "WhatAutosys Team",
    "email": "support@whatautosys.com",
    "website": "https://whatautosys.com"
  },
  
  "license": "MIT",
  "repository": "https://github.com/whatautosys/extension-crm",
  
  "category": "productivity",
  "tags": ["crm", "sales", "leads", "scoring"],
  
  "pricing": {
    "type": "subscription",
    "amount": 19.99,
    "currency": "EUR",
    "billingPeriod": "monthly",
    "trialDays": 14
  },
  
  "icon": "assets/icon.png",
  "screenshots": [
    "assets/screenshot1.png",
    "assets/screenshot2.png"
  ],
  
  "requires": {
    "core": ">=2.0.0",
    "node": ">=18.0.0",
    "extensions": {
      "com.whatautosys.notifications": ">=1.0.0"
    }
  },
  
  "conflicts": [
    "com.thirdparty.basic-crm"
  ],
  
  "permissions": [
    "read:messages",
    "write:database",
    "send:notifications",
    "access:contacts"
  ],
  
  "entrypoint": "index.js",
  
  "ui": {
    "slots": {
      "sidebar": {
        "id": "hot-leads-panel",
        "icon": "chart-line",
        "label": "Hot Leads",
        "component": "ui/HotLeadsPanel.jsx",
        "position": 3
      },
      "chatActions": {
        "id": "tag-hot-lead",
        "icon": "fire",
        "label": "Marquer Hot Lead",
        "component": "ui/TagButton.jsx"
      },
      "settings": {
        "component": "ui/SettingsPage.jsx"
      }
    }
  },
  
  "hooks": {
    "onInstall": "handlers/onInstall.js",
    "onUninstall": "handlers/onUninstall.js",
    "onActivate": "handlers/onActivate.js",
    "onDeactivate": "handlers/onDeactivate.js",
    "onMessageReceived": "handlers/analyzeMessage.js",
    "onMessageSent": "handlers/trackSent.js",
    "onContactAdded": "handlers/initContact.js"
  },
  
  "database": {
    "namespace": "crm",
    "migrations": [
      "migrations/001_create_tables.sql",
      "migrations/002_add_indexes.sql"
    ]
  },
  
  "settings": {
    "schema": {
      "hotLeadThreshold": {
        "type": "number",
        "default": 70,
        "min": 0,
        "max": 100,
        "label": "Seuil Hot Lead",
        "description": "Score minimum pour considérer un lead comme 'chaud'"
      },
      "telegramEnabled": {
        "type": "boolean",
        "default": false,
        "label": "Alertes Telegram"
      },
      "telegramToken": {
        "type": "string",
        "default": "",
        "label": "Token Bot Telegram",
        "secret": true
      }
    }
  },
  
  "i18n": {
    "defaultLocale": "fr",
    "locales": ["fr", "en", "es"]
  }
}
```

---

## 5. Architecture Technique

### 5.1 Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                    WHATAUTOSYS CLIENT                       │
│                     (Electron App)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              CORE (Obligatoire)                      │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • Messaging Engine (Baileys)                        │  │
│  │  • Storage Layer (SQLite)                            │  │
│  │  • AI Base Client (Mistral)                          │  │
│  │  • License Manager                                   │  │
│  │  • Extension Manager ◄─────────────────────┐         │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                         │          │
│                        ▼                         │          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           EXTENSION SYSTEM                           │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Extension Loader                                    │  │
│  │  Hook Manager                                        │  │
│  │  Sandbox Executor                                    │  │
│  │  Permission Manager                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                    │
│         ┌──────────────┼──────────────┬─────────────┐      │
│         ▼              ▼              ▼             ▼      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐  ┌─────────┐ │
│  │Extension │   │Extension │   │Extension │  │Extension│ │
│  │   CRM    │   │E-commerce│   │Marketing │  │  Brain  │ │
│  └──────────┘   └──────────┘   └──────────┘  └─────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              UI LAYER (React)                        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • Dynamic Component Registry                        │  │
│  │  • Slot System (sidebar, chat, settings)            │  │
│  │  • Extension UI Injector                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  CLOUDFLARE BACKEND    │
              ├────────────────────────┤
              │  • Workers (API)       │
              │  • D1 (Database)       │
              │  • R2 (Storage .wext)  │
              │  • KV (Cache)          │
              │  • Pages (Store UI)    │
              └────────────────────────┘
```

### 5.2 ExtensionManager (Core)

#### Responsabilités
1. **Chargement:** Lecture et parsing des .wext
2. **Validation:** Vérification manifest, signature, dépendances
3. **Isolation:** Sandboxing et gestion permissions
4. **Lifecycle:** Init, activation, désactivation, destruction
5. **Hooks:** Système d'événements pour communication

#### API Publique
```javascript
class ExtensionManager {
  // Installation
  async installExtension(fileData: Buffer, fileName: string): Promise<InstallResult>
  async installFromStore(extensionId: string): Promise<InstallResult>
  
  // Gestion
  async activateExtension(extensionId: string): Promise<void>
  async deactivateExtension(extensionId: string): Promise<void>
  async uninstallExtension(extensionId: string): Promise<void>
  
  // Queries
  getInstalledExtensions(): Extension[]
  getActiveExtensions(): Extension[]
  isExtensionActive(extensionId: string): boolean
  
  // Hooks
  async executeHook(hookName: string, data: any): Promise<void>
  registerHook(extensionId: string, hookName: string, handler: Function): void
  
  // Updates
  async checkForUpdates(): Promise<UpdateInfo[]>
  async updateExtension(extensionId: string): Promise<void>
}
```

### 5.3 Système de Hooks

#### Hooks Disponibles

| Hook | Quand | Données Passées | Use Case |
|------|-------|-----------------|----------|
| `onInstall` | Installation extension | `{manifest}` | Setup initial DB |
| `onUninstall` | Désinstallation | `{manifest}` | Cleanup données |
| `onActivate` | Activation | `{manifest}` | Charger config |
| `onDeactivate` | Désactivation | `{manifest}` | Sauvegarder état |
| `onMessageReceived` | Message entrant | `{message, contact}` | Hot Leads, analytics |
| `onMessageSent` | Message envoyé | `{message, contact}` | Tracking, goals |
| `onContactAdded` | Nouveau contact | `{contact}` | Init scoring |
| `onAIPrompt` | Avant requête IA | `{prompt, context}` | Injection contexte |
| `onAIResponse` | Après réponse IA | `{response, prompt}` | Post-processing |
| `beforeMessageSend` | Avant envoi | `{message}` | Validation, spam check |

#### Exemple d'Utilisation
```javascript
// Extension CRM
class CRMExtension {
  async onMessageReceived({ message, contact }) {
    // Analyse du message
    const analysis = await this.hotLeadsDetector.analyze(message);
    
    if (analysis.score > this.config.threshold) {
      // Enregistrement en DB
      await this.db.insertHotLead(contact, analysis);
      
      // Notification
      if (this.config.telegramEnabled) {
        await this.notifications.send('telegram', {
          message: `🔥 Hot Lead: ${contact} (Score: ${analysis.score})`
        });
      }
    }
  }
}
```

### 5.4 Sandboxing & Permissions

#### Niveaux d'Isolation

**Niveau 1: API Restreinte**
```javascript
// Extensions n'ont accès qu'à l'API Core exposée
const coreAPI = {
  db: sandboxedDatabase,        // Uniquement namespace extension
  ai: sandboxedAI,              // Rate limited
  whatsapp: sandboxedMessaging, // Permissions requises
  notifications: notificationService,
  settings: settingsManager
};
```

**Niveau 2: Permissions Explicites**
```json
// manifest.json
"permissions": [
  "read:messages",      // Lecture messages
  "write:database",     // Écriture DB (namespace uniquement)
  "send:notifications", // Envoi notifs
  "access:ai",          // Utilisation IA
  "send:messages"       // Envoi messages (dangereux)
]
```

**Niveau 3: Rate Limiting**
```javascript
// Limites par défaut
const limits = {
  aiRequests: 100,      // par heure
  dbWrites: 1000,       // par heure
  messagesSent: 50      // par heure
};
```

#### Validation de Sécurité

**1. Analyse Statique (AST)**
```javascript
async function validateExtensionCode(code) {
  const ast = parseCode(code);
  
  // Interdictions
  const forbidden = [
    'eval',
    'Function',
    'require("child_process")',
    'require("fs")',
    'localStorage',
    'sessionStorage'
  ];
  
  for (const pattern of forbidden) {
    if (containsPattern(ast, pattern)) {
      throw new SecurityError(`Forbidden API: ${pattern}`);
    }
  }
}
```

**2. Signature Cryptographique**
```javascript
async function verifySignature(wextFile) {
  const publicKey = loadPublicKey();
  const manifest = extractManifest(wextFile);
  const signature = extractSignature(wextFile);
  
  const hash = crypto.createHash('sha256');
  hash.update(wextFile);
  
  return crypto.verify(
    'sha256',
    hash.digest(),
    publicKey,
    Buffer.from(signature, 'base64')
  );
}
```

### 5.5 Store Backend (Cloudflare) ☁️

> **🔑 DÉCISION ARCHITECTURE MAJEURE:**  
> Le système externe du Store d'extensions sera **entièrement hébergé sur Cloudflare**, offrant une infrastructure mondiale performante, sécurisée et économique (~2-5€/mois vs 100€+ pour un VPS classique).

#### Stack Cloudflare Complète

```
┌────────────────────────────────────────────────────────┐
│          CLOUDFLARE EDGE NETWORK                       │
│              (300+ datacenters)                        │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │ Cloudflare Pages │      │Cloudflare Workers│       │
│  │   (Frontend)     │◄─────┤   (API Backend)  │       │
│  │                  │      │                  │       │
│  │ - Catalogue UI   │      │ - REST API       │       │
│  │ - Search         │      │ - Auth           │       │
│  │ - Details page   │      │ - Validation     │       │
│  └──────────────────┘      └─────────┬────────┘       │
│                                      │                 │
│                    ┌─────────────────┼──────────┐      │
│                    ▼                 ▼          ▼      │
│         ┌────────────┐    ┌──────────────┐  ┌──────┐ │
│         │Cloudflare  │    │ Cloudflare   │  │Cloud-│ │
│         │    D1      │    │      R2      │  │flare │ │
│         │(Database)  │    │  (Storage)   │  │  KV  │ │
│         │            │    │              │  │(Cache│ │
│         │ - Metadata │    │ - .wext files│  │)     │ │
│         │ - Versions │    │ - Screenshots│  │      │ │
│         │ - Reviews  │    │ - Icons      │  │- Hot │ │
│         │ - Purchases│    │              │  │ data │ │
│         └────────────┘    └──────────────┘  └──────┘ │
│                                                         │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  WhatAutosys Client  │
                │   (Electron App)     │
                │                      │
                │  Communique via:     │
                │  HTTPS API calls     │
                └──────────────────────┘
```

#### Avantages de Cloudflare

| Avantage | Détail | Impact |
|----------|--------|--------|
| **💰 Coût** | Tier gratuit très généreux | ~2-5€/mois vs 100€+ VPS |
| **⚡ Performance** | Edge computing mondial | Latence <50ms partout |
| **🔒 Sécurité** | DDoS, WAF, SSL natifs | Protection enterprise |
| **📈 Scalabilité** | Auto-scaling illimité | 0 → 1M req sans config |
| **🛠️ DevOps** | Zéro gestion serveur | Déploiement en 30 sec |
| **🌍 Global** | CDN intégré gratuit | Pas besoin CloudFront |

#### API Endpoints (Workers)

| Endpoint | Method | Description | Auth | Worker |
|----------|--------|-------------|------|--------|
| `/api/extensions` | GET | Liste extensions | Public | `store-api` |
| `/api/extension/:id` | GET | Détails extension | Public | `store-api` |
| `/api/extension/:id/versions` | GET | Historique versions | Public | `store-api` |
| `/api/download` | POST | Télécharger .wext | License | `download-api` |
| `/api/upload` | POST | Upload extension | Developer | `upload-api` |
| `/api/purchase` | POST | Acheter extension | Stripe | `payment-api` |
| `/api/reviews` | GET/POST | Avis utilisateurs | License | `reviews-api` |
| `/api/search` | GET | Recherche extensions | Public | `search-api` |

#### Configuration Cloudflare (wrangler.toml)

```toml
name = "whatautosys-store"
main = "src/index.js"
compatibility_date = "2025-01-01"

# Workers (API Backend)
[env.production]
name = "whatautosys-store-prod"
route = "store.whatautosys.com/*"

# Database SQL
[[d1_databases]]
binding = "DB"
database_name = "whatautosys_store"
database_id = "<GENERATED_BY_CLOUDFLARE>"

# Object Storage (.wext files)
[[r2_buckets]]
binding = "EXTENSIONS_BUCKET"
bucket_name = "whatautosys-extensions"
preview_bucket_name = "whatautosys-extensions-dev"

# Cache rapide
[[kv_namespaces]]
binding = "STORE_CACHE"
id = "<GENERATED_BY_CLOUDFLARE>"
preview_id = "<PREVIEW_ID>"

# Variables publiques
[vars]
ENVIRONMENT = "production"
STRIPE_PUBLIC_KEY = "pk_live_xxx"
STORE_URL = "https://store.whatautosys.com"

# Secrets (via CLI: wrangler secret put)
# STRIPE_SECRET_KEY
# SIGNING_PRIVATE_KEY
# JWT_SECRET
```

#### Exemple Worker (API Liste Extensions)

```javascript
// src/workers/store-api.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }
    
    // Routing
    if (url.pathname === '/api/extensions') {
      return handleListExtensions(env);
    }
    
    if (url.pathname.match(/^\/api\/extension\/[\w.-]+$/)) {
      const id = url.pathname.split('/').pop();
      return handleGetExtension(id, env);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

async function handleListExtensions(env) {
  try {
    // 1. Check cache KV first (ultra-fast)
    const cacheKey = 'extensions:list:v1';
    const cached = await env.STORE_CACHE.get(cacheKey, 'json');
    
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'X-Cache': 'HIT'
        }
      });
    }
    
    // 2. Query D1 database
    const { results } = await env.DB.prepare(`
      SELECT 
        id, name, version, description, author,
        icon_url, category, price, downloads, 
        rating, updated_at
      FROM extensions
      WHERE status = 'published'
      ORDER BY downloads DESC
      LIMIT 100
    `).all();
    
    // 3. Cache for 5 minutes
    await env.STORE_CACHE.put(
      cacheKey, 
      JSON.stringify(results),
      { expirationTtl: 300 }
    );
    
    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'X-Cache': 'MISS'
      }
    });
    
  } catch (error) {
    console.error('Error fetching extensions:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

#### Stockage R2 (.wext files)

```javascript
// src/workers/download-api.js
async function handleDownload(request, env) {
  const { extensionId, licenseKey } = await request.json();
  
  // 1. Verify license
  const license = await verifyLicense(licenseKey, env);
  if (!license.valid) {
    return new Response(
      JSON.stringify({ error: 'Invalid license' }),
      { status: 401 }
    );
  }
  
  // 2. Get extension metadata
  const extension = await env.DB.prepare(
    'SELECT * FROM extensions WHERE id = ?'
  ).bind(extensionId).first();
  
  if (!extension) {
    return new Response(
      JSON.stringify({ error: 'Extension not found' }),
      { status: 404 }
    );
  }
  
  // 3. Check purchase if paid
  if (extension.price > 0) {
    const purchased = await checkPurchase(
      license.clientId, 
      extensionId, 
      env
    );
    if (!purchased) {
      return new Response(
        JSON.stringify({ error: 'Purchase required' }),
        { status: 402 }
      );
    }
  }
  
  // 4. Get file from R2
  const fileName = `${extensionId}/${extension.version}.wext`;
  const file = await env.EXTENSIONS_BUCKET.get(fileName);
  
  if (!file) {
    return new Response(
      JSON.stringify({ error: 'File not found' }),
      { status: 404 }
    );
  }
  
  // 5. Increment download counter
  await env.DB.prepare(
    'UPDATE extensions SET downloads = downloads + 1 WHERE id = ?'
  ).bind(extensionId).run();
  
  // 6. Return file
  return new Response(file.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${extensionId}.wext"`,
      'Cache-Control': 'private, no-cache'
    }
  });
}
```

#### Coûts Réels Cloudflare

**Tier Gratuit (Largement suffisant au démarrage):**
```
✅ Workers: 100,000 requêtes/jour
✅ D1: 5GB storage + 5M rows
✅ R2: 10GB storage
✅ KV: 1GB storage + 100k reads/jour
✅ Pages: Déploiements illimités
```

**Scaling Payant (si croissance forte):**
```
Workers Paid ($5/mois):
├─ 10M requests inclus
└─ $0.50 par million supplémentaire

D1 Paid:
├─ $0.75/GB au-delà de 5GB
└─ $1 par million de rows lues

R2 Storage:
├─ $0.015/GB au-delà de 10GB
└─ $0 frais de sortie (vs AWS S3)

KV Paid:
├─ $0.50/GB au-delà de 1GB
└─ $0.50 par 10M reads

Estimation avec 10k utilisateurs actifs:
Total: ~15-20€/mois (vs 100€+ VPS)
```

#### Base de Données D1

```sql
-- Extensions
CREATE TABLE extensions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  author TEXT NOT NULL,
  manifest TEXT NOT NULL,
  icon_url TEXT,
  category TEXT,
  price REAL DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  uploaded_at INTEGER NOT NULL,
  updated_at INTEGER,
  UNIQUE(id, version)
);

-- Versions
CREATE TABLE extension_versions (
  extension_id TEXT NOT NULL,
  version TEXT NOT NULL,
  changelog TEXT,
  file_url TEXT NOT NULL,
  released_at INTEGER NOT NULL,
  PRIMARY KEY (extension_id, version)
);

-- Achats
CREATE TABLE extension_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  extension_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  price REAL NOT NULL,
  purchased_at INTEGER NOT NULL,
  stripe_payment_id TEXT
);

-- Reviews
CREATE TABLE extension_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  extension_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at INTEGER NOT NULL
);

-- Licences
CREATE TABLE licenses (
  key TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  enabled_extensions TEXT,
  created_at INTEGER NOT NULL
);
```

---

## 6. Expérience Utilisateur

### 6.1 Store Intégré

#### Interface Principale
```
┌─────────────────────────────────────────────────────────┐
│  🪟 Extension Store                        🔍 Rechercher│
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Tous] [Productivité] [Marketing] [E-commerce]         │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  📊 CRM Pro  │  │ 💰 E-commerce│  │ 📢 Marketing │ │
│  │              │  │              │  │              │ │
│  │ Hot Leads    │  │ Catalogue    │  │ Campagnes    │ │
│  │ & Scoring    │  │ & Négo IA    │  │ Personnalisé │ │
│  │              │  │              │  │              │ │
│  │ ⭐ 4.8 (124) │  │ ⭐ 4.9 (89)  │  │ ⭐ 4.7 (156) │ │
│  │ 📦 5.2k DL   │  │ 📦 3.1k DL   │  │ 📦 8.9k DL   │ │
│  │              │  │              │  │              │ │
│  │ [19€/mois] ✓│  │ [29€/mois]   │  │ [39€/mois]   │ │
│  │  Installé    │  │ [Installer]  │  │ [Essai 14j]  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  🧠 Brain    │  │ 🎯 Goals     │  │ 🎨 Créatifs  │ │
│  │              │  │              │  │              │ │
│  │ Documents    │  │ Objectifs    │  │ Templates    │ │
│  │ RAG          │  │ IA           │  │ & Médias     │ │
│  │              │  │              │  │              │ │
│  │ ⭐ 4.9 (201) │  │ ⭐ 4.6 (78)  │  │ ⭐ 4.8 (92)  │ │
│  │ 📦 12k DL    │  │ 📦 4.5k DL   │  │ 📦 2.8k DL   │ │
│  │              │  │              │  │              │ │
│  │   Gratuit ✓  │  │   Gratuit    │  │ [9€/mois]    │ │
│  │  Installé    │  │ [Installer]  │  │ [Installer]  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘