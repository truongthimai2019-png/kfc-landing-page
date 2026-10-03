/**
 * stores.js – Danh sách cửa hàng, lọc Tỉnh/Quận, trạng thái mở cửa
 */

import { escapeHTML, showSectionError } from '../utils/dom.js';

let allStores = []; // Toàn bộ dữ liệu cửa hàng

/** Khởi chạy module cửa hàng */
export function init(storesData) {
  const grid = document.getElementById('stores-grid');
  const citySelect = document.getElementById('filter-city');
  const districtSelect = document.getElementById('filter-district');
  if (!grid || !citySelect || !districtSelect) return;

  allStores = storesData;

  if (allStores.length === 0) {
    showSectionError(grid, 'Chưa có dữ liệu cửa hàng.');
    return;
  }

  populateCityFilter(citySelect, districtSelect, grid);
  renderStores(grid, allStores);
}

/** Điền dropdown Tỉnh/Thành */
function populateCityFilter(citySelect, districtSelect, grid) {
  const cities = [...new Set(allStores.map(s => s.city))];

  cities.forEach(city => {
    const opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    citySelect.appendChild(opt);
  });

  citySelect.addEventListener('change', () => {
    const selectedCity = citySelect.value;
    updateDistrictFilter(districtSelect, selectedCity);
    filterAndRender(grid, selectedCity, districtSelect.value);
  });

  districtSelect.addEventListener('change', () => {
    filterAndRender(grid, citySelect.value, districtSelect.value);
  });
}

/** Cập nhật dropdown Quận/Huyện theo Tỉnh đã chọn */
function updateDistrictFilter(districtSelect, city) {
  districtSelect.innerHTML = '<option value="">-- Chọn Quận/Huyện --</option>';
  if (!city) return;
  const districts = [...new Set(
    allStores.filter(s => s.city === city).map(s => s.district)
  )];
  districts.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    districtSelect.appendChild(opt);
  });
}

/** Lọc và render lại danh sách cửa hàng */
function filterAndRender(grid, city, district) {
  let filtered = allStores;
  if (city) filtered = filtered.filter(s => s.city === city);
  if (district) filtered = filtered.filter(s => s.district === district);
  renderStores(grid, filtered);
}

/** Vẽ danh sách thẻ cửa hàng */
function renderStores(grid, stores) {
  grid.innerHTML = '';
  if (stores.length === 0) {
    grid.innerHTML = '<p class="menu-no-result">Không tìm thấy cửa hàng.</p>';
    return;
  }
  stores.forEach((s, i) => {
    const card = buildStoreCard(s, i);
    grid.appendChild(card);
  });
}

/** Kiểm tra cửa hàng đang mở cửa không */
function isOpen(openTime, closeTime) {
  const now = new Date();
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  const curMins = now.getHours() * 60 + now.getMinutes();
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  return curMins >= openMins && curMins <= closeMins;
}

/** Tạo thẻ một cửa hàng */
function buildStoreCard(s, idx) {
  const card = document.createElement('div');
  card.className = 'store-card reveal';
  card.style.animationDelay = `${idx * 0.08}s`;

  const open = isOpen(s.open_time, s.close_time);
  const statusClass = open ? 'open' : 'closed';
  const statusText = open ? '🟢 Đang mở' : '🔴 Đã đóng';

  const mapsUrl = s.lat && s.lng
    ? `https://maps.google.com/?q=${s.lat},${s.lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(s.address)}`;

  card.innerHTML = `
    <div class="store-card-header">
      <h3 class="store-name">${escapeHTML(s.name)}</h3>
      <span class="store-status ${statusClass}">${statusText}</span>
    </div>
    <div class="store-info">
      <span class="store-info-icon">📍</span>
      <span>${escapeHTML(s.address)}, ${escapeHTML(s.district)}, ${escapeHTML(s.city)}</span>
    </div>
    <div class="store-info">
      <span class="store-info-icon">🕐</span>
      <span>${escapeHTML(s.open_time)} – ${escapeHTML(s.close_time)}</span>
    </div>
    <div class="store-info">
      <span class="store-info-icon">📞</span>
      <a href="tel:${escapeHTML(s.phone)}">${escapeHTML(s.phone)}</a>
    </div>
    <div class="store-actions">
      <a href="tel:${escapeHTML(s.phone)}" class="btn btn-secondary">📞 Gọi ngay</a>
      <a href="${escapeHTML(mapsUrl)}" target="_blank" rel="noopener" class="btn btn-primary">🗺️ Chỉ đường</a>
    </div>
  `;

  return card;
}

/** Export danh sách cửa hàng để dùng ở order-form.js */
export function getStores() { return allStores; }
