/**
 * ORAX PROJET - Firebase Admin Custom Claims Tool
 * 
 * Script Node.js pour assigner le rôle Admin (Custom Claim: admin: true) à un utilisateur Firebase
 * 
 * Utilisation :
 * 1. Télécharger la clé de service Firebase depuis la console Firebase (Paramètres du projet -> Comptes de service -> Générer une nouvelle clé privée)
 * 2. Placer le fichier json sous le nom 'serviceAccountKey.json' dans le dossier racine
 * 3. Exécuter : node scripts/setAdminClaim.js <EMAIL_OU_UID>
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath = resolve(process.cwd(), 'serviceAccountKey.json');

if (!existsSync(serviceAccountPath)) {
  console.error('❌ Fichier serviceAccountKey.json manquant à la racine du projet.');
  console.log('💡 Téléchargez votre clé de compte de service depuis la console Firebase :');
  console.log('   https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function grantAdmin(identifier) {
  try {
    let userRecord;
    if (identifier.includes('@')) {
      userRecord = await admin.auth().getUserByEmail(identifier);
    } else {
      userRecord = await admin.auth().getUser(identifier);
    }

    console.log(`👤 Utilisateur trouvé : ${userRecord.email} (UID: ${userRecord.uid})`);

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: true,
      lord_demon: true,
    });

    console.log(`✅ Succès : Rôle Custom Claim admin: true assigné à ${userRecord.email} !`);
    console.log('ℹ️ L\'utilisateur doit se déconnecter et se reconnecter (ou rafraîchir son ID token) pour activer le rôle.');
  } catch (error) {
    console.error('❌ Erreur lors de l\'attribution du Custom Claim :', error);
  } finally {
    process.exit(0);
  }
}

const target = process.argv[2] || 'epargnelock@gmail.com';
grantAdmin(target);
