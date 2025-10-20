let sortState = { key: null, asc: true };
let currentPage = 1;
const productsPerPage = 20;

// ------------------ 商品載入 ------------------
function loadProducts() {
  let products = JSON.parse(localStorage.getItem("products") || "null");

  if (products) {
    renderProducts(products);
    loadCategories(); // 從 localStorage 讀分類
  } else {
    callGAS({ type: "products" }, data => {
      if (data && data.data) data = data.data;
      if (!Array.isArray(data)) data = [];
      localStorage.setItem("products", JSON.stringify(data));
      renderProducts(data);
      loadCategories(); // 初次生成分類
    });
  }
}

// ------------------ 分類處理（快取優化） ------------------
function loadCategories() {
  const container = document.getElementById("category-filter");
  if (!container) return;

  let categories = JSON.parse(localStorage.getItem("categories") || "null");
  if (!categories) {
    const products = JSON.parse(localStorage.getItem("products") || "[]");
    categories = ["全部商品", ...new Set(products.map(p => p.category).filter(Boolean))];
    localStorage.setItem("categories", JSON.stringify(categories));
  }

  // 如果已經有按鈕，不重複生成
  if (container.children.length > 0) return;

  renderCategories(categories);
}

function renderCategories(categories) {
  const container = document.getElementById("category-filter");
  if (!container) return;

  categories.forEach(c => {
    const btn = document.createElement("button");
    btn.textContent = c;
    btn.className = "category-btn";
    btn.dataset.category = c;

    if (c === "全部商品") btn.classList.add("active");

    btn.addEventListener("click", () => {
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const products = JSON.parse(localStorage.getItem("products") || "[]");
      renderProducts(c === "全部商品" ? products : products.filter(p => p.category === c));
    });

    container.appendChild(btn);
  });
}

// ------------------ 商品渲染 ------------------
function renderProducts(products, page = 1) {
  updateProductCount(products);
  const container = document.getElementById("product-list");
  if (!container) return;

  const totalProducts = products.length;
  const totalPages = Math.ceil(totalProducts / productsPerPage);
  currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * productsPerPage;
  const end = start + productsPerPage;
  const pageProducts = products.slice(start, end);

  container.innerHTML = "";

  pageProducts.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    const image = p.image || "";
    const name = p.name || "未命名商品";
    const price = p.price || 0;
    const stock = p.stock || 0;

    const btn = document.createElement("button");
    btn.textContent = "加入購物車";
    btn.addEventListener("click", () => {
      if (!checkLoginBeforeCart(p)) return;
      addToCart(p);
    });

    card.innerHTML = `
      ${p.tag ? `<div class="tag">${p.tag}</div>` : ""}
      <img src="${image}" alt="${name}">
      <h3>${name}</h3>
      <p>每公斤</p>
      <p>價格: $${price}元</p>
      <!-- <p>庫存: ${stock}</p> -->
    `;
    card.appendChild(btn);
    container.appendChild(card);
  });

  renderPagination(totalPages);
}

function updateProductCount(products) {
  const countEl = document.getElementById("product-count");
  if (countEl) countEl.textContent = `共 ${products.length} 項商品`;
}

// ------------------ 分頁 ------------------
function renderPagination(totalPages) {
  const container = document.getElementById("pagination");
  if (!container) return;

  container.innerHTML = "";
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = i === currentPage ? "page-btn active" : "page-btn";
    btn.addEventListener("click", () => {
      const products = JSON.parse(localStorage.getItem("products") || "[]");
      renderProducts(products, i);
    });
    container.appendChild(btn);
  }
}

// ------------------ 搜尋 ------------------
function searchProducts() {
  const keyword = document.getElementById("searchInput")?.value.trim().toLowerCase();
  const products = JSON.parse(localStorage.getItem("products") || "[]");
  const filtered = products.filter(p => p.name?.toLowerCase().includes(keyword));
  renderProducts(filtered, 1);
}

// ------------------ 排序 ------------------
function sortProducts(key) {
  let products = JSON.parse(localStorage.getItem("products") || "[]");
  if (sortState.key === key) sortState.asc = !sortState.asc;
  else { sortState.key = key; sortState.asc = true; }

  products.sort((a, b) => {
    if (key === "price") return sortState.asc ? a.price - b.price : b.price - a.price;
    if (key === "id") return sortState.asc ? a.id - b.id : b.id - a.id;
    return 0;
  });

  localStorage.setItem("products", JSON.stringify(products));
  renderProducts(products);
  updateProductCount(products);
  updateArrow(key);
}

function updateArrow(key) {
  document.querySelectorAll(".sort-btn").forEach(btn => {
    btn.classList.remove("asc", "desc");
    if (btn.getAttribute("onclick")?.includes(key)) {
      btn.classList.add(sortState.asc ? "asc" : "desc");
    }
  });
}

// ------------------ 購物車判斷 ------------------
function checkLoginBeforeCart(product) {
  const member = getMember();
  if (!member) {
    alert("請先登入會員，才能加入購物車！");
    setTimeout(() => { window.location.href = "login.html"; }, 1000);
    return false;
  }
  return true;
}

// ------------------ 初始化 ------------------
document.addEventListener("DOMContentLoaded", () => {
  updateMemberArea();
  updateCartCount();
  loadProducts();
  setCategoryActive('全部商品');

function setCategoryActive(category) {
  const buttons = document.querySelectorAll('.category-btn');
  const products = JSON.parse(localStorage.getItem('products') || '[]');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
  renderProducts(
    category === '全部商品' ? products : products.filter(p => p.category === category)
  );
}

// ------------------ 顯示最後更新日期 ------------------
const today = new Date().toISOString().split('T')[0]; // 例如 "2025-10-17"

// 從 localStorage 取出快取
const cache = JSON.parse(localStorage.getItem('lastUpdateCache') || '{}');

// 如果有快取，而且是今天抓的，就直接顯示
if (cache.date === today && cache.value) {
  showLastUpdate(cache.value);
} else {
  // 否則呼叫 GAS 抓最新日期
  callGAS({ type: "lastUpdate" }, res => {
    if (res?.lastUpdate) {
      // 顯示在畫面上
      showLastUpdate(res.lastUpdate);

      // 寫入快取（含日期）
      localStorage.setItem(
        'lastUpdateCache',
        JSON.stringify({ date: today, value: res.lastUpdate })
      );
    }
  });
}
  // ------------------ 刷新商品 ------------------
  document.getElementById('clear-cache-btn').addEventListener('click', () => {
    localStorage.removeItem('products');
    localStorage.removeItem('categories');
    location.reload();
  });
});

// ------------------ 顯示最後更新日期函數 ------------------
function showLastUpdate(dateStr) {
  // 放在商品控制列 (.product-controls)
  const container = document.querySelector(".product-controls");
  if (!container) return;

  let dateLabel = document.getElementById("last-update");
  if (!dateLabel) {
    dateLabel = document.createElement("span");
    dateLabel.id = "last-update";
    dateLabel.style.marginLeft = "12px";
    dateLabel.style.fontSize = "0.9em";
    dateLabel.style.color = "#666";
    container.appendChild(dateLabel);
  }
  dateLabel.textContent = `📅 價格最後更新：${dateStr}`;
}