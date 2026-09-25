import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase-init.js';
import { CONFIG } from './config.js';

let logoutTimer;

function resetLogoutTimer() {
  clearTimeout(logoutTimer);
  logoutTimer = setTimeout(() => {
    alert('Session expired — inactive for 5 minutes');
    window.location.href = '/login.html';
  }, CONFIG.DEFAULTS.AUTO_LOGOUT_MINUTES * 60 * 1000);
}

document.addEventListener('mousemove', resetLogoutTimer);
document.addEventListener('keypress', resetLogoutTimer);

export function requireRole(allowedRoles) {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return reject('Not logged in');
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return reject('User not found');
      const userData = userSnap.data();
      if (!allowedRoles.includes(userData.role)) return reject('Access denied');
      
      if (userData.role !== CONFIG.ROLES.SERVICE_PROVIDER) {
        const subSnap = await getDoc(doc(db, 'subscriptions', userData.storeId || 'main'));
        if (subSnap.exists()) {
          const sub = subSnap.data();
          const now = new Date();
          if (!sub.activeUntil || sub.activeUntil.toDate() < now) {
            return reject('Subscription expired — contact Service Provider');
          }
        }
      }
      
      resetLogoutTimer();
      resolve({ user, userData });
    });
  });
}

export function getNextNumber(prefix, lastNum) {
  const num = String(lastNum + 1).padStart(prefix === 'barcode' ? 7 : 3, '0');
  return num;
}
