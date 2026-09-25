// service-provider.js — Complete Service Provider Module
import { requireServiceProvider } from './auth-guard.js';
import { db, auth } from './firebase-init.js';
import { CONFIG } from './config.js';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, 
  serverTimestamp, where
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

let currentUser = null;
let currentUserData = null;

// DOM Elements
const spNameEl = document.getElementById('sp-name');
const logoutBtn = document.getElementById('logout-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Forms
const serviceForm = document.getElementById('service-form');
const inventoryForm = document.getElementById('inventory-form');

// Lists
const servicesListEl = document.getElementById('services-list');
const bookingsListEl = document.getElementById('bookings-list');
const inventoryListEl = document.getElementById('inventory-list');
const earningsListEl = document.getElementById('earnings-list');

// Stats
const totalEarningsEl = document.getElementById('total-earnings');
const servicesCompletedEl = document.getElementById('services-completed');
const pendingTasksEl = document.getElementById('pending-tasks');

// Init
async function init() {
  try {
    const authData = await requireServiceProvider();
    currentUser = authData.user;
    currentUserData = authData.userData;
    spNameEl.textContent = `Hi, ${currentUserData.name || 'Service Provider'}`;
    
    bindTabEvents();
    await loadServices();
    await loadBookings();
    await loadInventory();
    await loadEarnings();
    bindFormEvents();
  } catch (err) {
    console.error('Access denied:', err);
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
        b.classList.remove('active', 'border-blue-600', 'text-blue-600');
        b.classList.add('border-transparent', 'text-gray-500');
      });
      btn.classList.add('active', 'border-blue-600', 'text-blue-600');
      btn.classList.remove('border-transparent', 'text-gray-500');
      
      tabContents.forEach(content => {
        content.classList.add('hidden');
        if (content.id === `tab-${targetTab}`) content.classList.remove('hidden');
      });
    });
  });
}

// === SERVICES MANAGEMENT ===
async function loadServices() {
  const q = query(
    collection(db, 'services'),
    where('providerId', 'in', [currentUser.uid, 'global']),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  servicesListEl.innerHTML = '';
  
  if (!snapshot.docs.length) {
    servicesListEl.innerHTML = '<p class="text-gray-500">No services created yet</p>';
    return;
  }
  
  snapshot.docs.forEach(doc => {
    const svc = { id: doc.id, ...doc.data() };
    const card = document.createElement('div');
    card.className = 'service-card flex justify-between items-center';
    card.innerHTML = `
      <div>
        <p class="font-medium">${svc.name}</p>
        <p class="text-sm text-gray-500">${svc.duration || 0} mins</p>
        <p class="text-blue-600 font-bold">₱${svc.price.toFixed(2)}</p>
      </div>
      <div class="flex gap-2">
        <button class="edit-service-btn bg-blue-500 text-white btn-sm" data-id="${svc.id}">Edit</button>
        <button class="delete-service-btn bg-red-500 text-white btn-sm" data-id="${svc.id}">Delete</button>
      </div>
    `;
    servicesListEl.appendChild(card);
  });
}

async function saveService(e) {
  e.preventDefault();
  const id = document.getElementById('service-id').value;
  const data = {
    name: document.getElementById('service-name').value,
    price: parseFloat(document.getElementById('service-price').value),
    duration: parseInt(document.getElementById('service-duration').value) || 30,
    providerId: currentUser.uid,
    providerName: currentUserData.name,
    updatedAt: serverTimestamp()
  };
  
  try {
    if (id) {
      await updateDoc(doc(db, 'services', id), data);
      alert('✅ Service updated!');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'services'), data);
      alert('✅ Service added!');
    }
    serviceForm.reset();
    await loadServices();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteService(id) {
  if (!confirm('Delete this service?')) return;
  await deleteDoc(doc(db, 'services', id));
  await loadServices();
}

// === BOOKINGS / TASKS ===
async function loadBookings() {
  const q = query(
    collection(db, 'service_bookings'),
    where('providerId', '==', currentUser.uid),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  bookingsListEl.innerHTML = '';
  
  if (!snapshot.docs.length) {
    bookingsListEl.innerHTML = '<p class="text-gray-500">No bookings yet</p>';
    pendingTasksEl.textContent = '0';
    return;
  }
  
  let pendingCount = 0;
  
  snapshot.docs.forEach(doc => {
    const booking = { id: doc.id, ...doc.data() };
    if (booking.status !== 'completed') pendingCount++;
    
    const card = document.createElement('div');
    card.className = `booking-card status-${booking.status || 'pending'}`;
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <p class="font-semibold">${booking.serviceName || 'Service'}</p>
          <p class="text-sm text-gray-500">Client: ${booking.clientName || 'Guest'}</p>
          <p class="text-sm text-gray-500">Date: ${booking.scheduledAt?.toDate?.()?.toLocaleString() || 'Not set'}</p>
          <span class="inline-block mt-1 px-2 py-0.5 rounded text-xs ${
            booking.status === 'completed' ? 'bg-green-100 text-green-700' :
            booking.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
            'bg-yellow-100 text-yellow-700'
          }">${booking.status || 'pending'}</span>
        </div>
        <div class="flex flex-col gap-1">
          ${booking.status === 'pending' ? `
            <button class="start-btn bg-blue-500 text-white btn-sm" data-id="${booking.id}">Start</button>
          ` : ''}
          ${booking.status === 'in-progress' ? `
            <button class="complete-btn bg-green-500 text-white btn-sm" data-id="${booking.id}" data-amount="${booking.price || 0}">Complete</button>
          ` : ''}
          ${booking.status !== 'completed' ? `
            <button class="cancel-btn bg-red-500 text-white btn-sm" data-id="${booking.id}">Cancel</button>
          ` : ''}
        </div>
      </div>
    `;
    bookingsListEl.appendChild(card);
  });
  
  pendingTasksEl.textContent = pendingCount;
}

async function updateBookingStatus(id, status, amount = 0) {
  const updateData = { status, updatedAt: serverTimestamp() };
  
  if (status === 'completed') {
    updateData.completedAt = serverTimestamp();
    await addDoc(collection(db, 'service_earnings'), {
      bookingId: id,
      providerId: currentUser.uid,
      providerName: currentUserData.name,
      amount: parseFloat(amount) || 0,
      type: 'service_payment',
      timestamp: serverTimestamp()
    });
  }
  
  await updateDoc(doc(db, 'service_bookings', id), updateData);
  await loadBookings();
  await loadEarnings();
}

// === INVENTORY MANAGEMENT ===
async function loadInventory() {
  const q = query(
    collection(db, 'service_inventory'),
    where('providerId', '==', currentUser.uid),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  inventoryListEl.innerHTML = '';
  
  if (!snapshot.docs.length) {
    inventoryListEl.innerHTML = '<p class="text-gray-500">No inventory items added</p>';
    return;
  }
  
  snapshot.docs.forEach(doc => {
    const item = { id: doc.id, ...doc.data() };
    const card = document.createElement('div');
    card.className = 'inventory-item flex justify-between items-center';
    card.innerHTML = `
      <div>
        <p class="font-medium">${item.name}</p>
        <p class="text-sm text-gray-500">Qty: ${item.quantity} | ₱${(item.cost || 0).toFixed(2)}/unit</p>
      </div>
      <button class="delete-item-btn bg-red-500 text-white btn-sm" data-id="${item.id}">Remove</button>
    `;
    inventoryListEl.appendChild(card);
  });
}

async function addInventoryItem(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('item-name').value,
    quantity: parseInt(document.getElementById('item-qty').value),
    cost: parseFloat(document.getElementById('item-cost').value) || 0,
    providerId: currentUser.uid,
    createdAt: serverTimestamp()
  };
  
  await addDoc(collection(db, 'service_inventory'), data);
  alert('✅ Item added!');
  inventoryForm.reset();
  await loadInventory();
}

async function deleteInventoryItem(id) {
  if (!confirm('Remove this item?')) return;
  await deleteDoc(doc(db, 'service_inventory', id));
  await loadInventory();
}

// === EARNINGS / REPORTS ===
async function loadEarnings() {
  const q = query(
    collection(db, 'service_earnings'),
    where('providerId', '==', currentUser.uid),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  
  let total = 0;
  earningsListEl.innerHTML = '';
  
  if (!snapshot.docs.length) {
    earningsListEl.innerHTML = '<p class="text-gray-500">No earnings yet</p>';
  }
  
  snapshot.docs.forEach(doc => {
    const record = { id: doc.id, ...doc.data() };
    total += record.amount || 0;
    
    const item = document.createElement('div');
    item.className = 'earning-item border-b pb-2';
    item.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <p class="font-medium">Service Payment</p>
          <p class="text-sm text-gray-500">${record.timestamp?.toDate?.()?.toLocaleString() || '—'}</p>
        </div>
        <p class="font-bold text-green-600">₱${(record.amount || 0).toFixed(2)}</p>
      </div>
    `;
    earningsListEl.appendChild(item);
  });
  
  totalEarningsEl.textContent = `₱${total.toFixed(2)}`;
  servicesCompletedEl.textContent = snapshot.docs.length;
}

// Event Binding
function bindFormEvents() {
  serviceForm.addEventListener('submit', saveService);
  inventoryForm.addEventListener('submit', addInventoryItem);
  
  servicesListEl.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-service-btn')) {
      await deleteService(e.target.dataset.id);
    }
    if (e.target.classList.contains('edit-service-btn')) {
      const docSnap = await getDoc(doc(db, 'services', e.target.dataset.id));
      const svc = { id: docSnap.id, ...docSnap.data() };
      document.getElementById('service-id').value = svc.id;
      document.getElementById('service-name').value = svc.name;
      document.getElementById('service-price').value = svc.price;
      document.getElementById('service-duration').value = svc.duration || '';
    }
  });
  
  bookingsListEl.addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (e.target.classList.contains('start-btn')) {
      await updateBookingStatus(id, 'in-progress');
    }
    if (e.target.classList.contains('complete-btn')) {
      const amount = e.target.dataset.amount;
      await updateBookingStatus(id, 'completed', amount);
    }
    if (e.target.classList.contains('cancel-btn')) {
      if (confirm('Cancel this booking?')) {
        await updateBookingStatus(id, 'cancelled');
      }
    }
  });
  
  inventoryListEl.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-item-btn')) {
      await deleteInventoryItem(e.target.dataset.id);
    }
  });
  
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '/login.html';
  });
}

// Start
init();
