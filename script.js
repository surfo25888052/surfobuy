// 👉 你的 Apps Script 網址
const SHEET_API = "https://script.google.com/macros/s/AKfycbz33rtggOjIDYRIHb_YAaQ7pX3MU2wdsSZY_PbUOrXvy6ZnLD2ECklXrQsQdBf79dfuZA/exec";

let allProducts = [];

// -------------------- 載入商品 --------------------
async function loadProducts() {
  const res = await fetch(`${SHEET_API}?type=products`);
  allProducts = await res.json();
  renderCategories(allProducts);
  renderProducts(allProducts);
  updateCartCount();
}

// -------------------- 商品渲染 --------------------
function renderProducts(products) {
  const container = document.getElementById("product-list");
  if (!container) return;
  container.innerHTML = products.map(p => `
    <div class="card">
      <img src="${p.image}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p class="price">$${p.price}</p>
      <p class="stock">庫存：${p.stock}</p>
      <button onclick="addToCart(${p.id}, '${p.name}', ${p.price}, ${p.stock})">加入購物車</button>
    </div>
  `).join("");
}

// -------------------- 分類渲染 --------------------
function renderCategories(products) {
  const categories = [...new Set(products.map(p => p.category || "全部"))];
  const container = document.getElementById("category-container");
  if (!container) return;
  container.innerHTML = `
    <button onclick="filterCategory('全部')">全部</button>
    ${categories.map(c => `<button onclick="filterCategory('${c}')">${c}</button>`).join("")}
  `;
}

// -------------------- 篩選 --------------------
function filterCategory(category) {
  if (category === "全部") renderProducts(allProducts);
  else renderProducts(allProducts.filter(p => p.category === category));
}

// -------------------- 搜尋 --------------------
function searchProducts() {
  const keyword = document.getElementById("searchInput").value.trim();
  const filtered = allProducts.filter(p => p.name.includes(keyword));
  renderProducts(filtered);
}

// -------------------- 加入購物車 --------------------
function addToCart(id, name, price, stock) {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const item = cart.find(i => i.id === id);

  // 庫存檢查
  const currentQty = item ? item.qty : 0;
  if (currentQty + 1 > stock) {
    alert("⚠️ 庫存不足！");
    return;
  }

  if (item) item.qty++;
  else cart.push({ id, name, price, qty: 1 });
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();

  // 加入動畫
  const btn = event.target;
  btn.innerText = "✅ 已加入";
  setTimeout(() => btn.innerText = "加入購物車", 1000);
}

// -------------------- 購物車 --------------------
function renderCart() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const container = document.getElementById("cart-items");
  if (!container) return;
  let total = 0;

  container.innerHTML = cart.map(item => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    return `
      <div class="cart-item">
        <span>${item.name}</span>
        <input type="number" value="${item.qty}" min="1" onchange="updateQty(${item.id}, this.value)">
        <span>$${subtotal}</span>
        <button onclick="removeItem(${item.id})">刪除</button>
      </div>
    `;
  }).join("");

  const totalEl = document.getElementById("cart-total");
  if (totalEl) totalEl.innerText = `總計：$${total}`;
  updateCartCount();
}

function updateQty(id, qty) {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const item = cart.find(i => i.id === id);
  if (item) item.qty = Number(qty);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

function removeItem(id) {
  let cart = JSON.parse(localStorage.getItem("cart") || "[]");
  cart = cart.filter(i => i.id !== id);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  const el = document.getElementById("cart-count");
  if (el) el.innerText = count;
}

// -------------------- 下單 --------------------
function handleCheckout() {
  const form = document.getElementById("orderForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (cart.length === 0) {
      alert("購物車是空的！");
      return;
    }

    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const address = document.getElementById("address").value;

    try {
      // 呼叫 Google Apps Script API 儲存訂單
      const res = await fetch(SHEET_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "order", name, phone, address, cart })
      });

      if (!res.ok) throw new Error("訂單送出失敗！");

      alert("✅ 訂單已送出！");
      localStorage.removeItem("cart");
      window.location.href = "index.html";
    } catch (err) {
      alert("❌ 發生錯誤：" + err.message);
    }
  });
}
