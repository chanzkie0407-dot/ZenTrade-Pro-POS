// ==================================================
// BPOS — Offline + Auto-Sync Module
// LocalStorage = Primary / Firebase = Cloud Backup
// ==================================================

const BPOS_SYNC = {
  firebaseInitialized: false,
  firebaseEnabled: false,
  db: null,
  syncQueue: [],
  isOnline: navigator.onLine,
  lastSync: null,

  // Firebase Config
  config: {
    apiKey: "AIzaSyAxuB4gacmWIf3U4Ic5TsOxSHCaynR0vhw",
    authDomain: "bpos-pos.firebaseapp.com",
    projectId: "bpos-pos",
    storageBucket: "bpos-pos.firebasestorage.app",
    messagingSenderId: "1024558399693",
    appId: "1:1024558399693:web:13412d95960d8be732a984",
    measurementId: "G-BY03FZEN6E"
  },

  // Initialize
  init: function () {
    const self = this;
    
    // Online/Offline detection
    window.addEventListener('online', () => {
      self.isOnline = true;
      console.log('✅ Online — Auto-sync starting...');
      self.uploadAll();
    });
    window.addEventListener('offline', () => {
      self.isOnline = false;
      console.log('⚠️ Offline — Saving to local storage');
    });

    // Load pending sync queue
    try {
      this.syncQueue = JSON.parse(localStorage.getItem('_syncQueue') || '[]');
    } catch (e) {
      this.syncQueue = [];
    }

    // Initialize Firebase
    if (this.config.projectId && !this.config.projectId.includes('ILAGAY')) {
      this.initFirebase();
    } else {
      console.log('ℹ️ Firebase not configured — Local-only mode');
      this.firebaseEnabled = false;
    }

    // Auto-sync every 30 seconds kung online
    setInterval(() => {
      if (this.isOnline && this.firebaseEnabled) this.uploadAll();
    }, 30000);

    console.log('✅ BPOS Sync Ready — Mode:', this.isOnline ? 'Online' : 'Offline');
  },

  initFirebase: async function () {
    try {
      if (!window.firebase) {
        console.log('⏳ Loading Firebase SDK...');
        await this.loadFirebaseSDK();
      }
      
      const app = firebase.initializeApp(this.config);
      this.db = firebase.firestore(app);
      this.firebaseEnabled = true;
      this.firebaseInitialized = true;
      
      await this.downloadAll();
      console.log('✅ Firebase Connected & Synced');
    } catch (err) {
      console.warn('⚠️ Firebase init failed — Local mode only:', err.message);
      this.firebaseEnabled = false;
    }
  },

  loadFirebaseSDK: function () {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
      script.onload = () => {
        const firestoreScript = document.createElement('script');
        firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js';
        firestoreScript.onload = resolve;
        firestoreScript.onerror = reject;
        document.head.appendChild(firestoreScript);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  save: function (key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    this.queueForSync(key, data);
  },

  get: function (key, defaultValue = null) {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    try { return JSON.parse(stored); } 
    catch { return stored; }
  },

  queueForSync: function (key, data) {
    const entry = {
      key, data,
      timestamp: new Date().toISOString(),
      retry: 0
    };
    this.syncQueue = this.syncQueue.filter(e => e.key !== key);
    this.syncQueue.push(entry);
    this.persistQueue();
    if (this.isOnline && this.firebaseEnabled) {
      setTimeout(() => this.uploadAll(), 500);
    }
  },

  persistQueue: function () {
    localStorage.setItem('_syncQueue', JSON.stringify(this.syncQueue));
  },

  uploadAll: async function () {
    if (!this.firebaseEnabled || !this.db || !this.syncQueue.length) return;
    const successKeys = [];
    
    for (const entry of this.syncQueue) {
      try {
        const collection = this.getCollectionName(entry.key);
        await this.db.collection(collection).doc(entry.key).set({
          data: entry.data,
          updatedAt: new Date()
        });
        successKeys.push(entry.key);
      } catch (err) {
        entry.retry++;
      }
    }

    if (successKeys.length) {
      this.syncQueue = this.syncQueue.filter(e => !successKeys.includes(e.key));
      this.persistQueue();
      this.lastSync = new Date().toISOString();
      console.log(`☁️ Synced: ${successKeys.length} items`);
    }
  },

  downloadAll: async function () {
    if (!this.firebaseEnabled || !this.db) return;
    const collections = ['settings', 'transactions', 'users', 'logs', 'chats', 'subscription'];
    
    for (const coll of collections) {
      try {
        const snapshot = await this.db.collection(coll).get();
        snapshot.forEach(doc => {
          const localTime = localStorage.getItem(`_ts_${doc.id}`) || '0';
          const remoteTime = doc.data().updatedAt?.toDate?.()?.toISOString() || '0';
          if (remoteTime > localTime) {
            localStorage.setItem(doc.id, JSON.stringify(doc.data().data));
            localStorage.setItem(`_ts_${doc.id}`, remoteTime);
          }
        });
      } catch (err) {
        console.warn(`⚠️ Download error [${coll}]:`, err.message);
      }
    }
  },

  getCollectionName: function (key) {
    if (key.includes('Transaction') || key.includes('trans')) return 'transactions';
    if (key.includes('user') || key.includes('Pass') || key.includes('Admin')) return 'users';
    if (key.includes('Log')) return 'logs';
    if (key.includes('chat')) return 'chats';
    if (key.includes('sub')) return 'subscription';
    return 'settings';
  },

  getStatus: function () {
    return {
      online: this.isOnline,
      firebase: this.firebaseEnabled,
      pending: this.syncQueue.length,
      lastSync: this.lastSync
    };
  }
};

document.addEventListener('DOMContentLoaded', () => BPOS_SYNC.init());
