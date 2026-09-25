// admin.js — Complete Admin Module
import { requireAdmin } from './auth-guard.js';
import { db, auth } from './firebase-init.js';
import { CONFIG } from './config.js';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, where, writeBatch
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';

let currentUser = null;
let currentUserData = null;

// DOM Elements
const adminNameEl = document.getElementById('admin-name');
const logoutBtn = document.getElementById('logout-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Forms
const addUserForm = document.getElementById('add-user-form');
const productForm = document.getElementById('product-form');
const storeForm = document.getElementById('store-form');

// Lists
const usersListEl = document.getElementById('users-list');
const productsListEl = document.getElementById('products-list');
const salesListEl = document.getElementById('sales-list');
const storesListEl = document.getElementById('stores-list');

// Sales Stats
const salesTodayEl = document.getElementById('sales-today');
const salesMonthEl = document.getElementById('sales-month');
const salesCountEl = document.getElementById('sales-count');

// Init
async function init() {
  try {
    const authData = await requireAdmin();
    currentUser = authData.user;
    currentUserData = authData.userData;
    adminNameEl.textContent = `Hi, ${currentUserData.name || 'Admin'}`;
    
    bindTabEvents();
    await loadUsers();
    await loadProducts();
    await loadSales();
    await loadStores();
    bindFormEvents();
  } catch (err) {
    console.error('Admin access denied:', err);
    alert(err);
    window.location.href = '/login.html';
  }
}

// Tab Navigation
function bindTabEvents() {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      tabBtns.forEach(b => {
        b.classList.remove('active', 'border-indigo-600', 'text-indigo-600');
        b.classList.add('border-transparent', 'text-gray-500');
      });
      btn.classList.add('active', 'border-indigo-600', 'text-indigo-600');
      btn.classList.remove('border-transparent', 'text-gray-500');
      
      tabContents.forEach(content => {
        content.classList.add('hidden');
        if (content.id === `tab-${targetTab}`) content.classList.remove('hidden');
      });
    });
  });
}

// === USERS MANAGEMENT ===
async function loadUsers() {
  const snapshot = await getDocs(collection(db, 'users'));
  usersListEl.innerHTML = '';
  if (!snapshot.docs.length) {
    usersListEl.innerHTML = '<p class="text-gray-500">No users found</p>';
    return;
  }
  snapshot.docs.forEach(doc => {
    const user = { id: doc.id, ...doc.data() };
    const card = document.createElement('div');
    card.className = 'user-card';
    card.innerHTML = `
      <div>
        <p class="font-medium">${user.name || 'Unnamed'}</p>
        <p class="text-sm text-gray-500">${user.email}</p>
        <span class="inline-block mt-1 px-2 py-0.5 rounded text-xs ${
          user.role === 'admin' ? 'bg-red-100 text-red-700' :
          user.role === 'cashier' ? 'bg-green-100 text-green-700' :
          'bg-blue-100 text-blue-700'
        }">${user.role.replace('_', ' ')}</span>
      </div>
      <div class="flex gap-2">
        <button class="delete-user-btn bg-red-500 text-white btn-sm" data-uid="${user.id}">Delete</button>
      </div>
    `;
    usersListEl.appendChild(card);
  });
}

async function addUser(e) {
  e.preventDefault();
  const name = document.getElementById('user-name').value;
  const email = document.getElementById('user-email').value;
  const role = document.getElementById('user-role').value;
  
  try {
    // Create auth user
    const userCred = await createUserWithEmailAndPassword(auth, email, 'TempPass123!');
    // Create user profile
    await setDoc(doc(db, 'users', userCred.user.uid), {
      name,
      email,
      role,
      storeId: 'main',
      createdAt: serverTimestamp()
    });
    alert('✅ User added! Temporary password: TempPass123!');
    addUserForm.reset();
    await loadUsers();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteUser(uid) {
  if (!confirm('Delete this user?')) return;
  await deleteDoc(doc(db, 'users', uid));
  await loadUsers();
}

// === PRODUCTS MANAGEMENT ===
async function loadProducts() {
  const snapshot = await getDocs(collection(db, 'products'));
  productsListEl.innerHTML = '';
  if (!snapshot.docs.length) {
    productsListEl.innerHTML = '<p class="text-gray-500">No products found</p>';
    return;
  }
  snapshot.docs.forEach(doc => {
    const prod = { id: doc.id, ...doc.data() };
    const item = document.createElement('div');
    item.className = 'product-item';
    item.innerHTML = `
      <div>
        <p class="font-medium">${prod.name}</p>
        <p class="text-sm text-gray-500">SKU: ${prod.sku || '—'} | Stock: ${prod.stock || 0}</p>
        <p class="text-emerald-600 font-bold">₱${prod.price.toFixed(2)}</p>
      </div>
      <div class="flex gap-2">
        <button class="edit-product-btn bg-blue-500 text-white btn-sm" data-id="${prod.id}">Edit</button>
        <button class="delete-product-btn bg-red-500 text-white btn-sm" data-id="${prod.id}">Delete</button>
      </div>
    `;
    productsListEl.appendChild(item);
  });
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('product-id').value;
  const data = {
    name: document.getElementById('product-name').value,
    sku: document.getElementById('product-sku').value,
    price: parseFloat(document.getElementById('product-price').value),
    stock: parseInt(document.getElementById('product-stock').value) || 0,
    updatedAt: serverTimestamp()
  };
  
  try {
    if (id) {
      await updateDoc(doc(db, 'products', id), data);
      alert('✅ Product updated!');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'products'), data);
      alert('✅ Product added!');
    }
    productForm.reset();
    await loadProducts();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  await deleteDoc(doc(db, 'products', id));
  await loadProducts();
}

// === SALES REPORTS ===
async function loadSales() {
  const q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  
  let todayTotal = 0, monthTotal = 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  salesListEl.innerHTML = '';
  if (!snapshot.docs.length) {
    salesListEl.innerHTML = '<p class="text-gray-500">No sales records</p>';
  }
  
  snapshot.docs.forEach(doc => {
    const sale = { id: doc.id, ...doc.data() };
    const saleDate = sale.timestamp?.toDate() || new Date();
    
    if (saleDate >= today) todayTotal += sale.totalAmount || 0;
    if (saleDate >= monthStart) monthTotal += sale.totalAmount || 0;
    
    const item = document.createElement('div');
    item.className = 'sale-item border-b pb-2';
    item.innerHTML = `
      <div>
        <p class="font-medium">${sale.cashierName || 'Unknown'} — ${saleDate.toLocaleString()}</p>
        <p class="text-sm text-gray-500">${(sale.items || []).length} items</p>
      </div>
      <p class="font-bold text-green-600">₱${(sale.totalAmount || 0).toFixed(2)}</p>
    `;
    salesListEl.appendChild(item);
  });
  
  salesTodayEl.textContent = `₱${todayTotal.toFixed(2)}`;
  salesMonthEl.textContent = `₱${monthTotal.toFixed(2)}`;
  salesCountEl.textContent = snapshot.docs.length;
}

// === STORES MANAGEMENT ===
async function loadStores() {
  const snapshot = await getDocs(collection(db, 'stores'));
  storesListEl.innerHTML = '';
  if (!snapshot.docs.length) {
    storesListEl.innerHTML = '<p class="text-gray-500">No stores added</p>';
    return;
  }
  snapshot.docs.forEach(doc => {
    const store = { id: doc.id, ...doc.data() };
    const item = document.createElement('div');
    item.className = 'store-item';
    item.innerHTML = `
      <div>
        <p class="font-medium">${store.name}</p>
        <p class="text-sm text-gray-500">${store.address || 'No address'}</p>
      </div>
      <button class="delete-store-btn bg-red-500 text-white btn-sm" data-id="${store.id}">Delete</button>
    `;
    storesListEl.appendChild(item);
  });
}

async function addStore(e) {
  e.preventDefault();
  const name = document.getElementById('store-name').value;
  const address = document.getElementById('store-address').value;
  
  await addDoc(collection(db, 'stores'), {
    name, address,
    createdAt: serverTimestamp()
  });
  alert('✅ Store added!');
  storeForm.reset();
  await loadStores();
}

// Event Binding
function bindFormEvents() {
  addUserForm.addEventListener('submit', addUser);
  productForm.addEventListener('submit', saveProduct);
  storeForm.addEventListener('submit', addStore);
  
  usersListEl.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-user-btn')) {
      await deleteUser(e.target.dataset.uid);
    }
  });
  
  productsListEl.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-product-btn')) {
      await deleteProduct(e.target.dataset.id);
    }
    if (e.target.classList.contains('edit-product-btn')) {
      const prodDoc = await getDoc(doc(db, 'products', e.target.dataset.id));
      const prod = { id: prodDoc.id, ...prodDoc.data() };
      document.getElementById('product-id').value = prod.id;
      document.getElementById('product-name').value = prod.name;
      document.getElementById('product-sku').value = prod.sku || '';
      document.getElementById('product-price').value = prod.price;
      document.getElementById('product-stock').value = prod.stock || 0;
    }
  });
  
  storesListEl.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-store-btn')) {
      if (!confirm('Delete this store?')) return;
      await deleteDoc(doc(db, 'stores', e.target.dataset.id));
      await loadStores();
    }
  });
  
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '/login.html';
  });
}

// Start
init();
