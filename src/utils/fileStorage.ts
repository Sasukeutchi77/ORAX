/**
 * Persistent IndexedDB File Store for ORAX PROJET
 * Saves real binary project archives, source files and assets locally
 * so they can be downloaded on mobile and desktop without server expiration.
 */

const DB_NAME = 'OraxProjetDB';
const DB_VERSION = 1;
const STORE_NAME = 'project_files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export interface StoredFileRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  data: Blob;
  createdAt: number;
}

export async function saveFileToIndexedDB(id: string, file: File | Blob, fileName: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: StoredFileRecord = {
      id,
      name: fileName,
      type: file.type || 'application/zip',
      size: file.size,
      data: file,
      createdAt: Date.now(),
    };

    store.put(record);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save file to IndexedDB:', err);
  }
}

export async function deleteStoredFile(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Could not delete file from IndexedDB:', err);
  }
}

export async function getFileFromIndexedDB(id: string): Promise<StoredFileRecord | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}
