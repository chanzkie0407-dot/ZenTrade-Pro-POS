export const CONFIG = {
  ROLES: {
    ADMIN: 'admin',
    CASHIER: 'cashier',
    SERVICE_PROVIDER: 'service_provider'
  },
  DEFAULTS: {
    ADMIN_PASSWORD: '8888',
    SP_PASSWORD: '19970407chan',
    BARCODE_START: 1,
    TICKET_START: 1,
    FREE_TRIAL_DAYS: 7,
    AUTO_LOGOUT_MINUTES: 5,
    CURRENCY: 'PHP',
    DATE_FORMAT: 'en-PH'
  },
  SUBSCRIPTION: {
    WEEKLY: { price: 199, days: 7 },
    BIWEEKLY: { price: 325, days: 14 },
    MONTHLY: { price: 579, days: 30 }
  },
  FIREBASE: {
    API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    APP_ID: import.meta.env.VITE_FIREBASE_APP_ID
  }
};
