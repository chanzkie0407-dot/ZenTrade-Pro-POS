// config.js
export const CONFIG = {
  ROLES: {
    ADMIN: 'admin',
    CASHIER: 'cashier',
    SERVICE_PROVIDER: 'service_provider'
  },
  FIREBASE: {
    API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    APP_ID: import.meta.env.VITE_FIREBASE_APP_ID
  },
  CURRENCY: 'PHP',
  DECIMALS: 2
};
