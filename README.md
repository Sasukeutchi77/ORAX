# 🌐 ORAX PROJET — Plateforme de Partage & Téléchargement

> **Développé par LORD DEMON**  
> Une plateforme web complète, moderne, rapide et sécurisée permettant aux développeurs de publier, partager, explorer et télécharger des projets logiciels, bots, scripts et applications.

---

## ✨ Fonctionnalités Principales

1. **🔐 Authentification Firebase Auth**
   - Inscription sécurisée (Nom d'utilisateur, Email, Mot de passe, Confirmation avec jauge de sécurité)
   - Connexion & Déconnexion
   - Réinitialisation du mot de passe par email
   - Gestion des sessions et routes protégées
   - Messages d'erreurs traduits en français

2. **🗄️ Base de Données Firestore**
   - Stockage en temps réel des fiches projets, propriétaires et utilisateurs
   - Compteurs de téléchargements et de vues avec protection anti-spam
   - Tri dynamique : *Plus récents, Plus anciens, Plus téléchargés, Plus populaires, Ordre alphabétique A-Z*
   - Filtres combinés par Catégorie, Technologie et Mots-clés / Tags

3. **⭐ Système de Notes & Avis (Style Google Play Store)**
   - Répartition détaillée des notes de 5★ à 1★ avec histogrammes de progression interactifs
   - Calcul en temps réel de la moyenne et des pourcentages par niveau d'étoiles
   - Sélecteur d'étoiles interactif (1 à 5 étoiles) avec descriptions contextuelles
   - Modification et suppression de note avec recalcul instantané
   - Filtre par note (Tous, 5★, 4★, 3★, 2★, 1★) et tri (Récents, Utiles, Meilleures, Moins bonnes)
   - Bouton d'utilité *"Cet avis vous a-t-il été utile ? Oui (X)"*
   - Réponses directes des créateurs/développeurs sous chaque avis

4. **☁️ Stockage Cloudinary**
   - Téléversement direct des archives de projets (`.zip`, `.tar.gz`, `.rar`, `.apk`, etc.)
   - Téléversement des miniatures et logos de projets
   - Suivi en temps réel de la progression de l'upload (`%`)
   - Affichage précis de la taille des fichiers (`formatFileSize`)
   - Gestion des erreurs et reprise possible

5. **🏆 Écosystème Développeurs & Profils**
   - Classement des développeurs (*Leaderboard*) selon les téléchargements, projets et abonnés
   - Profils développeurs détaillés avec biographie, badges et projets associés
   - Système d'abonnement (*Follow / Unfollow*)
   - Mise en valeur distinctive du créateur et fondateur **LORD DEMON**

6. **🚀 Expérience Utilisateur & Design**
   - Interface sombre technologique, moderne et élégante
   - Adaptabilité responsive complète (Smartphones Android, iPhone, Tablettes, PC)
   - Modale de détail avec documentation Markdown, aperçu des technologies et statistiques
   - Espace **Mon Profil** avec gestion des projets personnels (Modification, Suppression avec confirmation)
   - Badge officiel et visibilité renforcée du développeur **LORD DEMON**

---

## 🛠️ Stack Technique

- **Frontend** : React 19, TypeScript, Vite, Tailwind CSS v4, Motion
- **Icônes** : Lucide React
- **Authentification** : Firebase Authentication
- **Base de Données** : Firebase Firestore
- **Stockage Fichiers** : Cloudinary API
- **Déploiement Cloud** : Netlify (avec redirection SPA `_redirects`)

---

## 📦 Installation & Lancement Local

### 1. Cloner le projet
```bash
git clone <URL_DU_DEPOT>
cd orax-projet
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer les variables d'environnement
Créez un fichier `.env` à la racine en copiant `.env.example` :
```bash
cp .env.example .env
```

Remplissez vos clés d'API (voir sections ci-dessous).

### 4. Démarrer le serveur de développement
```bash
npm run dev
```
L'application est accessible sur `http://localhost:3000`.

---

## ⚙️ Configuration de Firebase

1. Rendez-vous sur la [Console Firebase](https://console.firebase.google.com/).
2. Créez un nouveau projet Firebase nommé `orax-projet`.
3. Activez **Authentication** :
   - Allez dans *Authentication > Sign-in method*.
   - Activez le fournisseur **E-mail/Mot de passe**.
4. Activez **Firestore Database** :
   - Allez dans *Firestore Database > Créer une base de données*.
   - Choisissez le mode production ou test, puis appliquez les règles de sécurité du fichier `firestore.rules`.
5. Enregistrez une application Web :
   - Allez dans *Paramètres du projet > Général > Vos applications > Ajouter une application Web*.
   - Copiez les identifiants dans votre fichier `.env` :
   ```env
   VITE_FIREBASE_API_KEY="AIzaSy..."
   VITE_FIREBASE_AUTH_DOMAIN="orax-projet.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="orax-projet"
   VITE_FIREBASE_STORAGE_BUCKET="orax-projet.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
   VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
   ```

---

## ☁️ Configuration de Cloudinary

1. Créez un compte gratuit sur [Cloudinary](https://cloudinary.com/).
2. Récupérez votre **Cloud Name** depuis le Dashboard principal.
3. Allez dans *Settings (Engrenage) > Upload > Upload presets*.
4. Cliquez sur **Add upload preset** :
   - Nommez votre preset (ex: `orax_preset`).
   - Réglez le **Signing Mode** sur `Unsigned`.
   - Folder : `orax_projects`.
   - Cliquez sur **Save**.
5. Remplissez votre fichier `.env` :
   ```env
   VITE_CLOUDINARY_CLOUD_NAME="votre_cloud_name"
   VITE_CLOUDINARY_UPLOAD_PRESET="orax_preset"
   ```

---

## 🚀 Déploiement sur Netlify

Le projet est configuré nativement pour Netlify grâce au fichier `netlify.toml` et `public/_redirects`.

### Méthode 1 : Via l'interface Netlify (Recommandée)
1. Poussez votre code sur GitHub ou GitLab.
2. Connectez-vous sur [Netlify](https://app.netlify.com/).
3. Cliquez sur **Add new site > Import an existing project**.
4. Sélectionnez votre dépôt GitHub.
5. Paramètres de Build :
   - **Build command** : `npm run build`
   - **Publish directory** : `dist`
6. Ajoutez vos variables d'environnement dans *Site configuration > Environment variables* :
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`
7. Cliquez sur **Deploy Site**.

---

## 🔒 Règles de Sécurité Firestore (`firestore.rules`)

Les règles fournies dans `firestore.rules` garantissent :
- Lecture publique de tous les projets et catégories.
- Création autorisée uniquement aux membres authentifiés.
- Modification et suppression restreintes exclusivement au développeur propriétaire du projet ou à l'administrateur **LORD DEMON**.
- Incrémentation sécurisée des compteurs de vues et téléchargements.

---

## 👨‍💻 Auteur

Développé par **LORD DEMON**  
*ORAX PROJET © 2026 — Plateforme de Partage Dev*
