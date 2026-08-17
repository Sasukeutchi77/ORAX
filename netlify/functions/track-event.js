import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, runTransaction, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '',
};

function getDb() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getFirestore(app);
}

export const handler = async (event) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { projectId, type, visitorId, authToken } = payload;

    if (!projectId || typeof projectId !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid projectId.' }),
      };
    }

    if (type !== 'view' && type !== 'download') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid event type. Must be "view" or "download".' }),
      };
    }

    if (!visitorId || typeof visitorId !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid visitorId.' }),
      };
    }

    // Sanitize visitorId (alphanumeric, underscores, hyphens)
    const sanitizedVisitorId = visitorId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);

    const db = getDb();
    const projectRef = doc(db, 'projects', projectId);
    const subcollectionName = type === 'view' ? 'views' : 'downloads';
    const trackerRef = doc(db, 'projects', projectId, subcollectionName, sanitizedVisitorId);

    // Run atomic Firestore transaction
    const result = await runTransaction(db, async (transaction) => {
      const [projectDoc, trackerDoc] = await Promise.all([
        transaction.get(projectRef),
        transaction.get(trackerRef),
      ]);

      if (!projectDoc.exists()) {
        throw new Error('PROJECT_NOT_FOUND');
      }

      const projectData = projectDoc.data();

      // Check published status (unless owner or admin)
      if (projectData.status && projectData.status !== 'published') {
        throw new Error('PROJECT_NOT_PUBLISHED');
      }

      const countField = type === 'view' ? 'views' : 'downloads';
      const currentCount = projectData[countField] || (type === 'view' ? 1 : 0);

      // If this visitor already has a record in the subcollection, do not increment
      if (trackerDoc.exists()) {
        return {
          isNew: false,
          count: currentCount,
          projectId,
          type,
        };
      }

      // First time recording: create tracker record and atomically increment counter
      const now = new Date().toISOString();
      transaction.set(trackerRef, {
        visitorId: sanitizedVisitorId,
        createdAt: now,
        type,
        ip: event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'anonymous',
      });

      const newCount = currentCount + 1;
      transaction.update(projectRef, {
        [countField]: newCount,
        updatedAt: now,
      });

      return {
        isNew: true,
        count: newCount,
        projectId,
        type,
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    if (error.message === 'PROJECT_NOT_FOUND') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Projet introuvable.' }),
      };
    }
    if (error.message === 'PROJECT_NOT_PUBLISHED') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Le projet n\'est pas accessible publiquement.' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};
