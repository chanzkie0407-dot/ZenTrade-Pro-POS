import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase-init.js';

const pinInput = document.getElementById('system-pin');
const verifyBtn = document.getElementById('verify-pin');

verifyBtn.addEventListener('click', async () => {
  const enteredPin = pinInput.value;
  const settingSnap = await getDoc(doc(db, 'settings', 'system_pin'));
  
  if (!settingSnap.exists() || enteredPin !== settingSnap.data().pin) {
    return alert('Invalid PIN');
  }
  
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!user) return window.location.href = '/login.html';
  
  const redirects = {
    admin: '/admin/dashboard.html',
    cashier: '/cashier/dashboard.html',
    service_provider: '/service-provider/dashboard.html'
  };
  window.location.href = redirects[user.role];
});
