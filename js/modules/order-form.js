/**
 * order-form.js – Form đặt hàng: validation, giỏ món, gửi Zalo/Email, xuất CSV
 */

import { escapeHTML, showToast } from '../utils/dom.js';
import { formatVND, removeAccents } from '../utils/format.js';
import {
  getCartItems, getSubtotal, getDiscount, getTotal,
  getCartSnapshot, increaseQty, decreaseQty, removeFromCart,
  applyPromoCode, clearPromo
} from './cart.js';
// Cấu hình cục bộ (đồng bộ với CONFIG trong main.js)
const CONFIG = {
  zaloPhone: '0900000000',
  orderEmail: 'example@email.com',
};

let storesData = [];      // Danh sách cửa hàng cho dropdown
let promotionsData = [];  // Dữ liệu promotions để kiểm tra mã

/** Khởi chạy form đặt hàng */
export function init(stores, promotions) {
  storesData = stores;
  promotionsData = promotions;

  populateStoreDropdown();
  setupCartListener();
  setupPromoApply();
  setupSubmitButtons();
  renderCart(); // Vẽ giỏ ban đầu (trống)
}

/** Điền dropdown cửa hàng từ stores.csv */
function populateStoreDropdown() {
  const select = document.getElementById('order-store');
  if (!select) return;
  storesData.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.name} – ${s.address}`;
    select.appendChild(opt);
  });
}

/** Lắng nghe sự kiện cart:change để cập nhật giỏ */
function setupCartListener() {
  document.addEventListener('cart:change', () => renderCart());
}

/** Vẽ lại giỏ món và tổng tiền */
function renderCart() {
  try {
    const items = getCartItems() || [];
    const itemsEl = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal');
    const discountRow = document.getElementById('cart-discount-row');
    const discountEl = document.getElementById('cart-discount-amount');
    const totalEl = document.getElementById('cart-total');
    
    if (!itemsEl) return;

    itemsEl.innerHTML = '';

    if (items.length === 0) {
      itemsEl.innerHTML = '<p class="cart-empty">Chưa có món nào. Hãy chọn từ thực đơn!</p>';
    } else {
      items.forEach(ci => {
        const row = buildCartItemRow(ci);
        itemsEl.appendChild(row);
      });
    }

    const sub = getSubtotal() || 0;
    const disc = getDiscount() || 0;
    const total = getTotal() || 0;

    if (subtotalEl) subtotalEl.textContent = formatVND(sub);
    if (discountRow) discountRow.style.display = disc > 0 ? 'flex' : 'none';
    if (discountEl) discountEl.textContent = `−${formatVND(disc)}`;
    if (totalEl) totalEl.textContent = formatVND(total);
  } catch (err) {
    console.error('Lỗi khi render giỏ hàng:', err);
  }
}

/** Tạo một dòng trong giỏ món */
function buildCartItemRow(ci) {
  const row = document.createElement('div');
  row.className = 'cart-item';

  const namePrice = document.createElement('div');
  namePrice.innerHTML = `
    <div class="cart-item-name">${escapeHTML(ci.item.name)}</div>
    <div class="cart-item-price">${formatVND(ci.item.price)} × ${ci.quantity} = ${formatVND(ci.item.price * ci.quantity)}</div>
  `;

  const qtyWrap = document.createElement('div');
  qtyWrap.className = 'cart-item-qty';

  const minusBtn = document.createElement('button');
  minusBtn.className = 'qty-btn';
  minusBtn.textContent = '−';
  minusBtn.setAttribute('aria-label', `Giảm số lượng ${ci.item.name}`);
  minusBtn.addEventListener('click', (e) => { e.preventDefault(); decreaseQty(ci.item.id); });

  const qtyNum = document.createElement('span');
  qtyNum.className = 'qty-num';
  qtyNum.textContent = ci.quantity;

  const plusBtn = document.createElement('button');
  plusBtn.className = 'qty-btn';
  plusBtn.textContent = '+';
  plusBtn.setAttribute('aria-label', `Tăng số lượng ${ci.item.name}`);
  plusBtn.addEventListener('click', (e) => { e.preventDefault(); increaseQty(ci.item.id); });

  qtyWrap.append(minusBtn, qtyNum, plusBtn);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'cart-item-remove';
  removeBtn.textContent = '✕';
  removeBtn.setAttribute('aria-label', `Xoá ${ci.item.name}`);
  removeBtn.addEventListener('click', (e) => { e.preventDefault(); removeFromCart(ci.item.id); });

  row.append(namePrice, qtyWrap, removeBtn);
  return row;
}

/** Cài nút áp dụng mã khuyến mãi */
function setupPromoApply() {
  const applyBtn = document.getElementById('apply-promo');
  const promoInput = document.getElementById('promo-code');
  const errEl = document.getElementById('err-promo');
  const okEl = document.getElementById('ok-promo');
  if (!applyBtn || !promoInput) return;

  applyBtn.addEventListener('click', () => {
    const code = promoInput.value.trim();
    if (!code) {
      showFieldError(errEl, 'Vui lòng nhập mã khuyến mãi.');
      clearFieldOk(okEl);
      return;
    }
    clearFieldError(errEl);
    clearFieldOk(okEl);

    const result = applyPromoCode(code);
    if (result.success) {
      showFieldOk(okEl, result.message);
      showToast(result.message, 'success');
    } else {
      showFieldError(errEl, result.message);
      clearPromo();
    }
  });
}

/** Cài 3 nút gửi đơn */
function setupSubmitButtons() {
  document.getElementById('btn-send-zalo')?.addEventListener('click', () => sendZalo());
  document.getElementById('btn-send-email')?.addEventListener('click', () => sendEmail());
  document.getElementById('btn-download-csv')?.addEventListener('click', () => downloadCSV());
}

/** Validate form và trả về true nếu hợp lệ */
function validateForm() {
  let valid = true;

  const name = document.getElementById('customer-name')?.value.trim();
  const phone = document.getElementById('customer-phone')?.value.trim();
  const address = document.getElementById('customer-address')?.value.trim();

  // Họ tên
  if (!name) {
    showFieldError(document.getElementById('err-name'), 'Vui lòng nhập họ tên.');
    document.getElementById('customer-name')?.classList.add('has-error');
    valid = false;
  } else {
    clearFieldError(document.getElementById('err-name'));
    document.getElementById('customer-name')?.classList.remove('has-error');
  }

  // SĐT: 10 số, bắt đầu bằng 0
  if (!phone || !/^0\d{9}$/.test(phone)) {
    showFieldError(document.getElementById('err-phone'), 'SĐT phải 10 chữ số và bắt đầu bằng 0.');
    document.getElementById('customer-phone')?.classList.add('has-error');
    valid = false;
  } else {
    clearFieldError(document.getElementById('err-phone'));
    document.getElementById('customer-phone')?.classList.remove('has-error');
  }

  // Địa chỉ
  if (!address) {
    showFieldError(document.getElementById('err-address'), 'Vui lòng nhập địa chỉ giao hàng.');
    document.getElementById('customer-address')?.classList.add('has-error');
    valid = false;
  } else {
    clearFieldError(document.getElementById('err-address'));
    document.getElementById('customer-address')?.classList.remove('has-error');
  }

  // Giỏ không rỗng
  if (getCartItems().length === 0) {
    showToast('Giỏ hàng trống! Hãy chọn ít nhất một món.', 'error');
    valid = false;
  }

  return valid;
}

/** Lấy thông tin form */
function getFormData() {
  return {
    name: document.getElementById('customer-name')?.value.trim() || '',
    phone: document.getElementById('customer-phone')?.value.trim() || '',
    address: document.getElementById('customer-address')?.value.trim() || '',
    storeId: document.getElementById('order-store')?.value || '',
    note: document.getElementById('order-note')?.value.trim() || '',
    promoCode: document.getElementById('promo-code')?.value.trim() || '',
  };
}

/** Tạo văn bản đơn hàng dạng chuỗi */
function buildOrderText(form, snapshot) {
  const now = new Date().toLocaleString('vi-VN');
  let text = `=== ĐƠN ĐẶT MÓN KFC ===\nThời gian: ${now}\n\n`;
  text += `Khách hàng: ${form.name}\nSĐT: ${form.phone}\nĐịa chỉ: ${form.address}\n`;
  if (form.storeId) {
    const store = storesData.find(s => s.id === form.storeId);
    if (store) text += `Cửa hàng: ${store.name}\n`;
  }
  text += `\n--- Món đã chọn ---\n`;
  snapshot.items.forEach(ci => {
    text += `• ${ci.item.name} x${ci.quantity} = ${formatVND(ci.item.price * ci.quantity)}\n`;
  });
  text += `\nTạm tính: ${formatVND(snapshot.subtotal)}`;
  if (snapshot.discount > 0) text += `\nGiảm giá: −${formatVND(snapshot.discount)}`;
  text += `\nTổng cộng: ${formatVND(snapshot.total)}`;
  if (form.note) text += `\n\nGhi chú: ${form.note}`;
  text += '\n\n(Đơn từ trang web luyện tập – không phải trang chính thức KFC)';
  return text;
}

/** Gửi đơn qua Zalo: copy clipboard rồi mở zalo.me */
async function sendZalo() {
  if (!validateForm()) return;
  const form = getFormData();
  const snapshot = getCartSnapshot();
  const text = buildOrderText(form, snapshot);

  try {
    await navigator.clipboard.writeText(text);
    showToast('Đã sao chép đơn hàng! Đang mở Zalo…', 'success');
    window.open(`https://zalo.me/${CONFIG.zaloPhone}`, '_blank');
  } catch {
    showToast('Không sao chép được. Hãy thử gửi Email hoặc tải đơn.', 'error');
  }
}

/** Gửi đơn qua Email: mở mailto: */
function sendEmail() {
  if (!validateForm()) return;
  const form = getFormData();
  const snapshot = getCartSnapshot();
  const text = buildOrderText(form, snapshot);
  const subject = `Đơn đặt món KFC – ${form.name} – ${new Date().toLocaleDateString('vi-VN')}`;
  const mailtoUrl = `mailto:${CONFIG.orderEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  window.location.href = mailtoUrl;
  showToast('Đang mở ứng dụng email…', 'success');
}

/** Xuất đơn dạng CSV với BOM để Excel đọc đúng tiếng Việt */
function downloadCSV() {
  if (!validateForm()) return;
  const form = getFormData();
  const snapshot = getCartSnapshot();
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 15);

  const BOM = '\uFEFF';
  const header = 'order_time,customer_name,phone,address,store_id,item_id,item_name,quantity,unit_price,line_total,promo_code,discount,grand_total,note\n';

  const rows = snapshot.items.map(ci => {
    const cols = [
      now.toLocaleString('vi-VN'),
      form.name,
      form.phone,
      form.address,
      form.storeId,
      ci.item.id,
      ci.item.name,
      ci.quantity,
      ci.item.price,
      ci.item.price * ci.quantity,
      form.promoCode,
      snapshot.discount,
      snapshot.total,
      form.note,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    return cols.join(',');
  });

  const csvContent = BOM + header + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `don-hang-${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Đã tải đơn hàng thành công!', 'success');
}

/* ---- Helpers hiển thị lỗi / thành công form ---- */
function showFieldError(el, msg) { if (el) el.textContent = msg; }
function clearFieldError(el) { if (el) el.textContent = ''; }
function showFieldOk(el, msg) { if (el) el.textContent = msg; }
function clearFieldOk(el) { if (el) el.textContent = ''; }
