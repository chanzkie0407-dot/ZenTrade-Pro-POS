import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase-init.js';
import { CONFIG } from './config.js';

const roleSelect = document.getElementById('role-select');
const userSelect = document.getElementById('user-select');
const passwordInput = document.getElementById('password');
const loginForm = document.getElementById('login-form');
const userField = document.getElementById('user-field');
const passField = document.getElementById('pass-field');
const loginBtn = document.getElementById('login-btn');

let usersList = [];

roleSelect.addEventListener('change', async () => {
  const role = roleSelect.value;
  if (!role) { userField.classList.add('hidden'); return; }
  
  userSelect.innerHTML = '<option value="">-- Select user --</option>';
  const snap = await getDocs(collection(db, 'users'));
  usersList = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === role);
  
  if (role === CONFIG.ROLES.ADMIN) {
    const exists = usersList.some(u => u.email === 'admin@bpos.local');
    if (!exists) {
      usersList.unshift({
        id: 'default-admin',
        name: 'Admin',
        email: 'admin@bpos.local',
        role: CONFIG.ROLES.ADMIN,
        storeId: 'main'
      });
    }
  }
  if (role === CONFIG.ROLES.SERVICE_PROVIDER) {
    const exists = usersList.some(u => u.email === 'sp@bpos.local');
    if (!exists) {
      usersList.unshift({
        id: 'default-sp',
        name: 'Service Provider',
        email: 'sp@bpos.local',
        role: CONFIG.ROLES.SERVICE_PROVIDER
      });
    }
  }
  
  usersList.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name;
    userSelect.appendChild(opt);
  });
  
  userField.classList.remove('hidden');
  userSelect.disabled = false;
});

userSelect.addEventListener('change', () => {
  if (userSelect.value) {
    passField.classList.remove('hidden');
    loginBtn.disabled = false;
    passwordInput.focus();
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = userSelect.value;
  const pass = passwordInput.value;
  const selectedUser = usersList.find(u => u.id === userId);
  
  if (!selectedUser) return alert('Select user');
  
  let valid = false;
  if (selectedUser.id === 'default-admin' && pass === CONFIG.DEFAULTS.ADMIN_PASSWORD) valid = true;
  else if (selectedUser.id === 'default-sp' && pass === CONFIG.DEFAULTS.SP_PASSWORD) valid = true;
  else if (selectedUser.password && pass === selectedUser.password) valid = true;
  
  if (!valid) return alert('Incorrect password');
  
  sessionStorage.setItem('currentUser', JSON.stringify(selectedUser));
  window.location.href = '/pin-verify.html';
});
