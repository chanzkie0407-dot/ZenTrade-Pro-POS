// auth-guard.js — Full Updated Version
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase-init.js';
import { CONFIG } from './config.js';

export function requireAdmin() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return reject('No user logged in');
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return reject('User record not found');
      const userData = userSnap.data();
      if (userData.role !== CONFIG.ROLES.ADMIN) return reject('Access denied — Admin only');
      resolve({ user, userData });
    });
  });
}

export function requireCashier() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return reject('No user logged in');
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return reject('User record not found');
      const userData = userSnap.data();
      if (userData.role !== CONFIG.ROLES.CASHIER && userData.role !== CONFIG.ROLES.ADMIN) {
        return reject('Access denied — Cashier or Admin only');
      }
      resolve({ user, userData });
    });
  });
}

export function requireServiceProvider() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return reject('No user logged in');
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return reject('User record not found');
      const userData = userSnap.data();
      if (userData.role !== CONFIG.ROLES.SERVICE_PROVIDER && userData.role !== CONFIG.ROLES.ADMIN) {
        return reject('Access denied — Service Provider or Admin only');
      }
      resolve({ user, userData });
    });
  });
}
