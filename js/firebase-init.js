// firebase-init.js
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { CONFIG } from './config.js';

const app = initializeApp(CONFIG.FIREBASE);
const db = getFirestore(app);
const auth = getAuth(app);

// Offline support
enableIndexedDbPersistence(db)
  .catch((err) => console.warn('Persistence error:', err));

export { db, auth };
