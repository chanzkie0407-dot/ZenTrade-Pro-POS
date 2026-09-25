// cashier.js — Full Cashier Logic
import { requireCashier } from './auth-guard.js';
import { db, auth } from './firebase-init.js';
import { 
  collection, getDocs, addDoc, serverTimestamp, query, where, orderBy 
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { CONFIG } from './config.js';

// State
let currentUser = null;
let currentUserData = null;
let cart = [];
let allProducts = [];

// DOM Elements
const cashierNameEl = document.getElementById('cashier-name');
const logoutBtn = document.getElementById('logout-btn');
const searchEl = document.getElementById('search-product');
const productGridEl = document.getElementById('product-grid');
const cartItemsEl = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const cashTenderedEl = document.getElementById('cash-tendered');
const changeEl = document.getElementById('change-amount');
const clearCartBtn = document.getElementById('clear-cart');
const checkoutBtn = document.getElementById('checkout-btn');

// Init
async function init() {
  try {
    const authData = await requireCashier();
    currentUser = authData.user;
    currentUserData = authData.userData;
    cashierNameEl.textContent = `Hi, ${currentUserData.name || 'Cashier'}`;
    
    await loadProducts();
    bindEvents();
  } catch (err) {
    console.error('Access denied:', err);
    alert(err);
    window.location.href = '/login.html';
  }
}

// Load Products
async function loadProducts() {
  const snapshot = await getDocs(collection(db, 'products'));
  allProducts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  renderProducts(allProducts);
}

// Render Products
function renderProducts(products) {
  productGridEl.innerHTML = '';
  if (!products.length) {
    productGridEl.innerHTML = '<p class="col-span-full text-gray-500">No products found</p>';
    return;
  }
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <h3 class="font-semibold text-sm truncate">${product.name}</h3>
      <p class="text-emerald-700 font-bold">₱${product.price.toFixed(2)}</p>
      <p class="text-xs text-gray-500">Stock: ${product.stock || '—'}</p>
    `;
    card.addEventListener('click', () => addToCart(product));
    productGridEl.appendChild(card);
  });
}

// Cart Functions
function addToCart(product) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  updateCartUI();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

function updateQuantity(index, delta) {
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  updateCartUI();
}

function updateCartUI() {
  if (!cart.length) {
    cartItemsEl.innerHTML = '<p class="text-gray-500 text-sm">No items added</p>';
    cartTotalEl.textContent = '₱0.00';
    changeEl.textContent = '₱0.00';
    return;
  }

  cartItemsEl.innerHTML = '';
  let total = 0;
  cart.forEach((item, idx) => {
    total += item.price * item.quantity;
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <div>
        <p class="font-medium text-sm">${item.name}</p>
        <p class="text-xs">₱${item.price.toFixed(2)} × ${item.quantity}</p>
      </div>
      <div class="flex items-center gap-1">
        <button class="qty-minus bg-gray-200 px-2 rounded" data-idx="${idx}">−</button>
        <span class="w-6 text-center">${item.quantity}</span>
        <button class="qty-plus bg-gray-200 px-2 rounded" data-idx="${idx}">+</button>
        <button class="remove-item text-red-500 ml-1" data-idx="${idx}">×</button>
      </div>
    `;
    cartItemsEl.appendChild(itemEl);
  });

  cartTotalEl.textContent = `₱${total.toFixed(2)}`;
  calculateChange(total);
}

function calculateChange(total) {
  const cash = parseFloat(cashTenderedEl.value) || 0;
  const change = cash - total;
  changeEl.textContent = `₱${Math.max(0, change).toFixed(2)}`;
  changeEl.className = change < 0 ? 'text-red-600' : 'text-green-600';
}

// Checkout
async function processCheckout() {
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cash = parseFloat(cashTenderedEl.value) || 0;

  if (!cart.length) return alert('Cart is empty');
  if (cash < total) return alert('Insufficient cash');

  try {
    await addDoc(collection(db, 'sales'), {
      items: cart.map(i => ({
        productId: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity
      })),
      totalAmount: total,
      cashTendered: cash,
      change: cash - total,
      cashierId: currentUser.uid,
      cashierName: currentUserData.name,
      storeId: currentUserData.storeId || 'main',
      timestamp: serverTimestamp(),
      status: 'completed'
    });

    alert('✅ Sale saved!');
    cart = [];
    cashTenderedEl.value = '';
    updateCartUI();
  } catch (err) {
    console.error(err);
    alert('Error saving sale: ' + err.message);
  }
}

// Events
function bindEvents() {
  searchEl.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => 
      p.name.toLowerCase().includes(keyword) ||
      (p.sku && p.sku.toLowerCase().includes(keyword))
    );
    renderProducts(filtered);
  });

  cartItemsEl.addEventListener('click', (e) => {
    const idx = parseInt(e.target.dataset.idx);
    if (e.target.classList.contains('qty-minus')) updateQuantity(idx, -1);
    if (e.target.classList.contains('qty-plus')) updateQuantity(idx, 1);
    if (e.target.classList.contains('remove-item')) removeFromCart(idx);
  });

  cashTenderedEl.addEventListener('input', () => {
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    calculateChange(total);
  });

  clearCartBtn.addEventListener('click', () => {
    if (confirm('Clear cart?')) {
      cart = [];
      cashTenderedEl.value = '';
      updateCartUI();
    }
  });

  checkoutBtn.addEventListener('click', processCheckout);

  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '/login.html';
  });
}

// Start
init();
