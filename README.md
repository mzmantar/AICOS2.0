# AICOS 2.0 - Plateforme Éducative Intelligente

AICOS est une plateforme éducative intelligente basée sur une architecture microservices modulaire, offrant une expérience d'apprentissage personnalisée et interactive.

## Technologies Utilisées

### Backend

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Apollo Server** - Serveur GraphQL
- **gRPC** - Communication inter-services
- **Kafka** - Messagerie et streaming d'événements
- **MongoDB** - Base de données NoSQL
- **JWT** - Authentification et autorisation

### IA et Machine Learning

- **Google Gemini API** - Modèle de langage pour le chatbot
- **TensorFlow.js** - Analyse des performances et recommandations

### Infrastructure

- **Docker** - Conteneurisation
- **Docker Compose** - Orchestration des conteneurs
- **MongoDB** - Base de données principale
- **Kafka** - Gestion des événements et messages

### Communication

- **REST API** - API RESTful
- **GraphQL** - API GraphQL
- **gRPC** - Communication RPC
- **Kafka** - Messagerie asynchrone

### Sécurité

- **JWT** - Gestion des tokens
- **Helmet** - Sécurité HTTP
- **CORS** - Gestion des origines croisées

### Monitoring et Logging

- **Winston** - Logging
- **Morgan** - Logging HTTP

## Fonctionnalités Principales

- 🤖 Assistant IA intelligent pour l'aide aux études
- 📚 Gestion de contenu pédagogique personnalisé
- 📝 Système d'évaluation et de quiz interactifs
- 📊 Suivi des progrès en temps réel
- 🔔 Notifications personnalisées
- 🎯 Recommandations de contenu adaptées

## Architecture

L'application est composée des microservices suivants :

- **API Gateway** (Node.js + Apollo)

  - Point d'entrée unique pour REST et GraphQL
  - Gestion des routes et de la sécurité
  - Port : 4000

- **Auth Service** (gRPC + JWT)

  - Gestion des utilisateurs et authentification
  - Gestion des sessions et tokens
  - Port : 50051

- **Chatbot Service** (REST + Gemini API)

  - Réponses intelligentes aux questions
  - Historique des conversations
  - Port : 4001

- **Course Service** (GraphQL)

  - Gestion du contenu pédagogique
  - Organisation des cours et modules
  - Port : 4002

- **Quiz Service** (gRPC + Kafka)

  - Évaluations et publication des résultats
  - Analyse des performances
  - Port : 50052

- **Recommender Service** (Kafka Consumer)

  - Suggestions personnalisées
  - Analyse des préférences
  - Port : 4003

- **Notification Service** (Kafka Consumer)

  - Envoi d'emails/notifications
  - Gestion des alertes
  - Port : 4004

- **Tracker Service** (REST)
  - Suivi des progrès des étudiants
  - Statistiques et rapports
  - Port : 4005

## Prérequis

- Docker et Docker Compose
- Node.js
- MongoDB
- Kafka

## Installation

1. Cloner le repository :

```bash
git clone
cd AICOS 2.0
```

2. Configurer les variables d'environnement :

```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

3. Installer les dépendances :

```bash
npm install
```

4. Lancer l'infrastructure :

```bash
docker-compose up -d
```

5. Démarrer les services :

```bash
# Démarrer tous les services
npm run start:all

# Ou démarrer un service spécifique
npm run start:service <service-name>
```

## Configuration

### Variables d'Environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Général
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/aicos

# JWT
JWT_SECRET=votre_secret_jwt

# Services
API_GATEWAY_PORT=4000
AUTH_SERVICE_PORT=50051
CHATBOT_SERVICE_PORT=4001
COURSE_SERVICE_PORT=4002
QUIZ_SERVICE_PORT=50052
RECOMMENDER_SERVICE_PORT=4003
NOTIFICATION_SERVICE_PORT=4004
TRACKER_SERVICE_PORT=4005

# Gemini API
GEMINI_API_KEY=votre_cle_api_gemini

# SendGrid
SENDGRID_API_KEY=votre_cle_api_sendgrid
```

## Documentation

- API REST : http://localhost:4000/api-docs
- GraphQL Playground : http://localhost:4000/graphql

## Structure du Projet

```
AICOS 2.0 - Microservice/
├── docker-compose.yml
├── README.md
├── package.json
├── package-lock.json
├── services/          # Microservices
│   ├── api-gateway/    # Point d'entrée API
│   ├── auth-service/   # Authentification
│   ├── chatbot-service/# Assistant IA
│   ├── course-service/ # Gestion des cours
│   ├── quiz-service/   # Évaluations
│   ├── recommender-service/ # Recommandations
│   ├── notification-service/ # Notifications
│   └── tracker-service/ # Suivi des progrès
└── node_modules/
```

## Développement

### Commandes Utiles

```bash
# Lancer les tests
npm test

# Lancer les tests d'un service spécifique
npm run test:service <service-name>

# Vérifier le linting
npm run lint

# Construire les images Docker
npm run build:docker

# Nettoyer les conteneurs
npm run clean
```
