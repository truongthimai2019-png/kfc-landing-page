/**
 * menu.js – Vẽ thẻ món, tab danh mục, tìm kiếm không dấu, lọc kết hợp
 */

import { escapeHTML, showSectionError, showToast } from '../utils/dom.js';
import { formatVND, removeAccents } from '../utils/format.js';
import { addToCart } from './cart.js';

let allItems = [];        // Toàn bộ món ăn available
let currentCategory = 'Tất cả'; // Tab đang chọn
let searchQuery = '';     // Từ khoá tìm kiếm

/** Khởi chạy module menu với dữ liệu */
export function init(menuData) {
  const grid = document.getElementById('menu-grid');
  const tabsEl = document.getElementById('category-tabs');
  const searchEl = document.getElementById('menu-search');
  if (!grid || !tabsEl) return;

  // Chỉ hiện món available = 1
  allItems = menuData.filter(m => m.available == 1);

  if (allItems.length === 0) {
    showSectionError(grid, 'Không có món ăn nào trong thực đơn lúc này.');
    return;
  }

  renderTabs(tabsEl);
  renderMenu(grid);
  setupSearch(searchEl, grid);
}

/** Vẽ tab danh mục tự động từ dữ liệu */
function renderTabs(tabsEl) {
  const categories = ['Tất cả', ...new Set(allItems.map(m => m.category))];
  tabsEl.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `tab-btn${cat === currentCategory ? ' active' : ''}`;
    btn.textContent = cat;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(cat === currentCategory));
    btn.addEventListener('click', () => {
      currentCategory = cat;
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.textContent === cat);
        b.setAttribute('aria-selected', String(b.textContent === cat));
      });
      renderMenu(document.getElementById('menu-grid'));
    });
    tabsEl.appendChild(btn);
  });
}

/** Cài đặt ô tìm kiếm */
function setupSearch(searchEl, grid) {
  if (!searchEl) return;
  searchEl.addEventListener('input', () => {
    searchQuery = searchEl.value.trim();
    renderMenu(grid);
  });
}

/** Lọc và vẽ lại danh sách món */
function renderMenu(grid) {
  const filtered = filterItems();
  grid.innerHTML = '';

  if (filtered.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'menu-no-result';
    msg.textContent = 'Không tìm thấy món phù hợp.';
    grid.appendChild(msg);
    return;
  }

  filtered.forEach((item, i) => {
    const card = buildCard(item, i);
    grid.appendChild(card);
  });
}

/** Lọc theo tab danh mục và từ khoá tìm kiếm (kết hợp) */
function filterItems() {
  return allItems.filter(item => {
    const matchCat = currentCategory === 'Tất cả' || item.category === currentCategory;
    const matchSearch = !searchQuery ||
      removeAccents(item.name).includes(removeAccents(searchQuery)) ||
      removeAccents(item.description || '').includes(removeAccents(searchQuery));
    return matchCat && matchSearch;
  });
}

/** Tạo HTML một thẻ món */
function buildCard(item, idx) {
  const card = document.createElement('article');
  card.className = 'menu-card reveal';
  card.style.animationDelay = `${idx * 0.05}s`;

  // Badge và icon cay
  let badgeHTML = '';
  if (item.tag === 'Bán chạy') badgeHTML = `<span class="badge badge-hot">🔥 Bán chạy</span>`;
  else if (item.tag === 'Mới') badgeHTML = `<span class="badge badge-new">✨ Mới</span>`;

  const spicyHTML = item.spicy == 1 ? `<span class="spicy-icon" title="Món cay">🌶</span>` : '';

  // Ảnh
  const imgSrc = item.image || 'assets/images/placeholder.jpg';

  card.innerHTML = `
    <div class="menu-card-img-wrap">
      <img
        class="menu-card-img"
        src="${escapeHTML(imgSrc)}"
        alt="${escapeHTML(item.name)}"
        loading="lazy"
        onerror="this.src='assets/images/placeholder.jpg'"
      />
      ${badgeHTML}
      ${spicyHTML}
    </div>
    <div class="menu-card-body">
      <h3 class="menu-card-name">${escapeHTML(item.name)}</h3>
      <p class="menu-card-desc">${escapeHTML(item.description || '')}</p>
      <div class="menu-card-footer">
        <span class="menu-card-price">${formatVND(item.price)}</span>
        <button
          class="btn btn-primary btn-add-to-cart"
          data-id="${escapeHTML(item.id)}"
          aria-label="Chọn món ${escapeHTML(item.name)}"
        >Chọn món</button>
      </div>
    </div>
  `;

  // Nút chọn món → thêm vào giỏ và cuộn xuống form
  card.querySelector('.btn-add-to-cart').addEventListener('click', (e) => {
    e.preventDefault();
    try {
      addToCart(item);
      showToast(`Đã thêm ${item.name} vào giỏ`, 'success');
      document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('Lỗi khi thêm món:', err);
      showToast('Có lỗi khi thêm món vào giỏ!', 'error');
    }
  });

  return card;
}
