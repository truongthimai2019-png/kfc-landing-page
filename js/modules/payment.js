/**
 * payment.js – Module thanh toán: QR MoMo và chuyển khoản ATM
 * Dùng lại dữ liệu từ cart.js: getCartItems, getCartSnapshot, getTotal
 */

import { escapeHTML, showToast } from '../utils/dom.js';
import { formatVND } from '../utils/format.js';
import { getCartSnapshot, getCartItems, getTotal, getSubtotal, getDiscount } from './cart.js';

// ---- Cấu hình thanh toán (dự án demo) ----
const PAYMENT_CONFIG = {
  momo: {
    phone: '0900000000',
    name: 'KFC DEMO',
  },
  bank: {
    bankName: 'Ngân hàng BIDV',
    bankCode: 'BIDV',
    branch: 'Chi nhánh Quận 1, TP. HCM',
    accountNumber: '31410001234567',
    accountName: 'NGUYEN VAN A (DEMO)',
  },
  // API công cộng tạo ảnh QR từ chuỗi bất kỳ (chỉ là <img src>, không phải thư viện)
  qrApiUrl: 'https://api.qrserver.com/v1/create-qr-code/',
  expirationMinutes: 15,
};

let countdownTimer = null;   // Timer đếm ngược
let currentMethod = 'momo';  // Tab đang chọn: 'momo' | 'atm'
let currentOrderId = '';     // Mã đơn hàng hiện tại

/** Khởi chạy module thanh toán */
export function init() {
  setupPaymentButton();
  setupModalEvents();
}

/** Gắn sự kiện cho nút Thanh Toán */
function setupPaymentButton() {
  const btn = document.getElementById('btn-payment');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openPaymentModal();
  });
}

/** Mở modal thanh toán */
function openPaymentModal() {
  // Kiểm tra giỏ trống
  const items = getCartItems();
  if (!items || items.length === 0) {
    showToast('Giỏ hàng trống! Hãy chọn ít nhất 1 món.', 'error');
    return;
  }

  // Validate form
  if (!validateBeforePayment()) return;

  const modal = document.getElementById('payment-modal');
  if (!modal) return;

  // Tạo mã đơn mới
  currentOrderId = generateOrderId();
  currentMethod = 'momo';

  renderPaymentModal();
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  startCountdown();
}

/** Đóng modal thanh toán */
function closePaymentModal() {
  const modal = document.getElementById('payment-modal');
  if (modal) {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  stopCountdown();
}

/** Dừng bộ đếm ngược */
function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

/** Validate form cơ bản trước khi mở thanh toán */
function validateBeforePayment() {
  const name = document.getElementById('customer-name')?.value.trim();
  const phone = document.getElementById('customer-phone')?.value.trim();
  const address = document.getElementById('customer-address')?.value.trim();

  const errors = [];
  if (!name) errors.push('Họ tên');
  if (!phone || !/^0\d{9}$/.test(phone)) errors.push('Số điện thoại (10 số, bắt đầu bằng 0)');
  if (!address) errors.push('Địa chỉ giao hàng');

  if (errors.length > 0) {
    showToast(`Vui lòng điền đúng: ${errors.join(', ')}`, 'error');
    return false;
  }
  return true;
}

/** Tạo mã đơn hàng duy nhất theo thời gian */
function generateOrderId() {
  const now = new Date();
  const parts = [
    now.getFullYear().toString().slice(-2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ];
  return 'KFC' + parts.join('');
}

/** Render toàn bộ nội dung modal thanh toán */
function renderPaymentModal() {
  const content = document.getElementById('payment-content');
  if (!content) return;

  const total = getTotal();

  // Render tóm tắt đơn hàng
  const summaryHTML = buildOrderSummaryHTML();

  if (currentMethod === 'momo') {
    renderMoMoPayment(content, total, summaryHTML);
  } else {
    renderATMPayment(content, total, summaryHTML);
  }

  // Cập nhật tab active
  document.querySelectorAll('.payment-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.method === currentMethod);
  });
}

/** Tạo HTML tóm tắt đơn hàng */
function buildOrderSummaryHTML() {
  const snapshot = getCartSnapshot();
  let rows = '';
  snapshot.items.forEach(ci => {
    rows += `
      <div class="payment-order-item">
        <span>${escapeHTML(ci.item.name)} × ${ci.quantity}</span>
        <span>${formatVND(ci.item.price * ci.quantity)}</span>
      </div>`;
  });

  let discountHTML = '';
  if (snapshot.discount > 0) {
    discountHTML = `
      <div class="payment-order-item payment-order-discount">
        <span>Giảm giá</span>
        <span>−${formatVND(snapshot.discount)}</span>
      </div>`;
  }

  return `
    <div class="payment-order-summary">
      <h4 class="payment-order-title">📋 Tóm tắt đơn hàng</h4>
      <div class="payment-order-list">${rows}</div>
      <div class="payment-order-subtotal">
        <span>Tạm tính</span>
        <span>${formatVND(snapshot.subtotal)}</span>
      </div>
      ${discountHTML}
      <div class="payment-order-total">
        <span>TỔNG CỘNG</span>
        <span>${formatVND(snapshot.total)}</span>
      </div>
    </div>`;
}

/** ============================================
 *  RENDER THANH TOÁN MOMO QR
 *  ============================================ */
function renderMoMoPayment(container, total, summaryHTML) {
  // Tạo dữ liệu QR MoMo
  const momoQRData = `2|99|${PAYMENT_CONFIG.momo.phone}|||0|0|${total}|${currentOrderId}|transfer_myqr`;
  const qrImgUrl = `${PAYMENT_CONFIG.qrApiUrl}?size=220x220&data=${encodeURIComponent(momoQRData)}&bgcolor=ffffff&color=a50064`;

  // MoMo deeplink (mở app trên điện thoại)
  const deeplink = `https://nhantien.momo.vn/${PAYMENT_CONFIG.momo.phone}/${total}/${encodeURIComponent(currentOrderId)}`;

  container.innerHTML = `
    <div class="payment-card payment-momo">
      <div class="payment-card-header momo-header">
        <div class="payment-logo-wrap momo-logo-wrap">
          <span class="payment-logo-icon momo-icon">M</span>
          <div>
            <div class="payment-logo-name">MoMo</div>
            <div class="payment-logo-sub">Thanh toán bằng Ví MoMo</div>
          </div>
        </div>
      </div>

      <div class="payment-card-body">
        ${summaryHTML}

        <div class="payment-qr-section">
          <div class="payment-qr-wrap" id="payment-qr-wrap">
            <img
              id="momo-qr-img"
              class="payment-qr-img"
              src="${escapeHTML(qrImgUrl)}"
              alt="Mã QR MoMo – Thanh toán ${formatVND(total)}"
              width="220" height="220"
              loading="eager"
            />
            <div class="payment-qr-fallback" id="qr-fallback" style="display:none">
              <div class="qr-fallback-icon">📱</div>
              <p>Không tải được QR.<br>Dùng nút <strong>Mở MoMo</strong> bên dưới.</p>
            </div>
          </div>
          <p class="payment-qr-hint">Mở app <strong>MoMo</strong> → Quét mã QR</p>
        </div>

        <div class="payment-details">
          <div class="payment-detail-row">
            <span class="payment-detail-label">Mã đơn hàng</span>
            <span class="payment-detail-value"><strong>${escapeHTML(currentOrderId)}</strong></span>
          </div>
          <div class="payment-detail-row">
            <span class="payment-detail-label">SĐT nhận tiền</span>
            <span class="payment-detail-value">${escapeHTML(PAYMENT_CONFIG.momo.phone)}</span>
          </div>
          <div class="payment-detail-row payment-amount-row">
            <span class="payment-detail-label">Số tiền thanh toán</span>
            <span class="payment-detail-value payment-amount-value">${formatVND(total)}</span>
          </div>
        </div>

        <div class="payment-countdown" id="payment-countdown"></div>

        <div class="payment-actions">
          <a href="${escapeHTML(deeplink)}" class="btn btn-primary payment-btn momo-deeplink-btn" target="_blank" rel="noopener">
            📱 Mở MoMo
          </a>
          <button type="button" class="btn btn-primary payment-btn payment-confirm-btn" id="btn-confirm-payment">
            ✅ Đã thanh toán
          </button>
        </div>

        <p class="payment-note">⚠️ Dự án học tập – Không thanh toán tiền thật.</p>
      </div>
    </div>
  `;

  // Xử lý ảnh QR lỗi → hiện fallback
  const qrImg = document.getElementById('momo-qr-img');
  const fallback = document.getElementById('qr-fallback');
  if (qrImg && fallback) {
    qrImg.addEventListener('error', () => {
      qrImg.style.display = 'none';
      fallback.style.display = 'flex';
    });
  }

  setupConfirmButton();
}

/** ============================================
 *  RENDER THANH TOÁN CHUYỂN KHOẢN ATM
 *  ============================================ */
function renderATMPayment(container, total, summaryHTML) {
  const transferContent = `KFC ${currentOrderId}`;

  // QR VietQR (chuẩn NAPAS cho chuyển khoản)
  const vietQRData = `${PAYMENT_CONFIG.bank.bankCode}|${PAYMENT_CONFIG.bank.accountNumber}|${total}|${transferContent}`;
  const qrImgUrl = `${PAYMENT_CONFIG.qrApiUrl}?size=220x220&data=${encodeURIComponent(vietQRData)}&bgcolor=ffffff&color=1a1a1a`;

  container.innerHTML = `
    <div class="payment-card payment-atm">
      <div class="payment-card-header atm-header">
        <div class="payment-logo-wrap atm-logo-wrap">
          <span class="payment-logo-icon atm-icon">🏦</span>
          <div>
            <div class="payment-logo-name">Chuyển khoản</div>
            <div class="payment-logo-sub">Ngân hàng / Internet Banking / ATM</div>
          </div>
        </div>
      </div>

      <div class="payment-card-body">
        ${summaryHTML}

        <div class="payment-qr-section">
          <div class="payment-qr-wrap" id="payment-qr-wrap">
            <img
              id="atm-qr-img"
              class="payment-qr-img"
              src="${escapeHTML(qrImgUrl)}"
              alt="Mã QR chuyển khoản – ${formatVND(total)}"
              width="220" height="220"
              loading="eager"
            />
            <div class="payment-qr-fallback" id="qr-fallback" style="display:none">
              <div class="qr-fallback-icon">🏦</div>
              <p>Không tải được QR.<br>Chuyển khoản thủ công bên dưới.</p>
            </div>
          </div>
          <p class="payment-qr-hint">Quét mã bằng app ngân hàng hoặc chuyển khoản thủ công</p>
        </div>

        <div class="payment-details atm-details">
          <div class="payment-detail-row">
            <span class="payment-detail-label">Ngân hàng</span>
            <span class="payment-detail-value">${escapeHTML(PAYMENT_CONFIG.bank.bankName)}</span>
          </div>
          <div class="payment-detail-row">
            <span class="payment-detail-label">Chi nhánh</span>
            <span class="payment-detail-value">${escapeHTML(PAYMENT_CONFIG.bank.branch)}</span>
          </div>
          <div class="payment-detail-row copyable" data-copy="${escapeHTML(PAYMENT_CONFIG.bank.accountNumber)}">
            <span class="payment-detail-label">Số tài khoản</span>
            <span class="payment-detail-value">
              <strong>${escapeHTML(PAYMENT_CONFIG.bank.accountNumber)}</strong>
              <button type="button" class="copy-btn" aria-label="Sao chép số tài khoản">📋</button>
            </span>
          </div>
          <div class="payment-detail-row">
            <span class="payment-detail-label">Chủ tài khoản</span>
            <span class="payment-detail-value"><strong>${escapeHTML(PAYMENT_CONFIG.bank.accountName)}</strong></span>
          </div>
          <div class="payment-detail-row payment-amount-row copyable" data-copy="${total}">
            <span class="payment-detail-label">Số tiền</span>
            <span class="payment-detail-value payment-amount-value">
              <strong>${formatVND(total)}</strong>
              <button type="button" class="copy-btn" aria-label="Sao chép số tiền">📋</button>
            </span>
          </div>
          <div class="payment-detail-row payment-transfer-row copyable" data-copy="${escapeHTML(transferContent)}">
            <span class="payment-detail-label">Nội dung CK</span>
            <span class="payment-detail-value">
              <strong>${escapeHTML(transferContent)}</strong>
              <button type="button" class="copy-btn" aria-label="Sao chép nội dung chuyển khoản">📋</button>
            </span>
          </div>
        </div>

        <div class="payment-countdown" id="payment-countdown"></div>

        <div class="payment-actions">
          <button type="button" class="btn btn-primary payment-btn payment-confirm-btn" id="btn-confirm-payment">
            ✅ Đã chuyển khoản
          </button>
        </div>

        <p class="payment-note">⚠️ Dự án học tập – Không chuyển tiền thật. Bấm "Đã chuyển khoản" để mô phỏng.</p>
      </div>
    </div>
  `;

  // Ảnh QR lỗi → fallback
  const qrImg = document.getElementById('atm-qr-img');
  const fallback = document.getElementById('qr-fallback');
  if (qrImg && fallback) {
    qrImg.addEventListener('error', () => {
      qrImg.style.display = 'none';
      fallback.style.display = 'flex';
    });
  }

  setupCopyButtons();
  setupConfirmButton();
}

/** Cài đặt các nút sao chép (📋) */
function setupCopyButtons() {
  document.querySelectorAll('.payment-detail-row.copyable').forEach(row => {
    const copyBtn = row.querySelector('.copy-btn');
    if (!copyBtn) return;
    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = String(row.dataset.copy || '');
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = '✅';
        showToast('Đã sao chép!', 'success');
        setTimeout(() => { copyBtn.textContent = '📋'; }, 2000);
      } catch {
        // Fallback cho trình duyệt không hỗ trợ Clipboard API
        fallbackCopy(text);
        copyBtn.textContent = '✅';
        setTimeout(() => { copyBtn.textContent = '📋'; }, 2000);
      }
    });
  });
}

/** Sao chép fallback bằng textarea tạm */
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch { /* bỏ qua */ }
  document.body.removeChild(ta);
}

/** Cài đặt nút xác nhận thanh toán */
function setupConfirmButton() {
  const btn = document.getElementById('btn-confirm-payment');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    confirmPayment();
  });
}

/** Xử lý xác nhận thanh toán (mô phỏng) */
function confirmPayment() {
  stopCountdown();
  const methodLabel = currentMethod === 'momo' ? 'MoMo' : 'Chuyển khoản ngân hàng';
  const snapshot = getCartSnapshot();

  // Hiện màn hình thành công
  const content = document.getElementById('payment-content');
  if (content) {
    content.innerHTML = `
      <div class="payment-success">
        <div class="payment-success-icon">🎉</div>
        <h3 class="payment-success-title">Thanh toán thành công!</h3>
        <div class="payment-success-info">
          <p>Mã đơn hàng: <strong>${escapeHTML(currentOrderId)}</strong></p>
          <p>Phương thức: <strong>${escapeHTML(methodLabel)}</strong></p>
          <p>Số tiền: <strong>${formatVND(snapshot.total)}</strong></p>
        </div>
        <p class="payment-success-note">
          Đơn hàng đã được ghi nhận. Chúng tôi sẽ liên hệ xác nhận
          qua số điện thoại bạn đã cung cấp.
        </p>
        <button type="button" class="btn btn-primary payment-btn" id="btn-close-success">
          Đóng
        </button>
      </div>
    `;
    document.getElementById('btn-close-success')?.addEventListener('click', (e) => {
      e.preventDefault();
      closePaymentModal();
    });
  }

  showToast(`Thanh toán ${methodLabel} thành công! Mã: ${currentOrderId}`, 'success');
}

/** Bắt đầu đếm ngược thời gian thanh toán */
function startCountdown() {
  stopCountdown();
  let remaining = PAYMENT_CONFIG.expirationMinutes * 60; // giây

  function render() {
    const el = document.getElementById('payment-countdown');
    if (!el) { stopCountdown(); return; }
    if (remaining <= 0) {
      el.innerHTML = '<span class="countdown-expired">⏰ Hết thời gian thanh toán. Vui lòng đóng và thử lại.</span>';
      stopCountdown();
      return;
    }
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    el.innerHTML = `⏱️ Thời gian còn lại: <strong>${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</strong>`;
    remaining--;
  }

  render();
  countdownTimer = setInterval(render, 1000);
}

/** Cài đặt sự kiện modal: đóng, chuyển tab */
function setupModalEvents() {
  // Nút đóng modal (X)
  document.getElementById('payment-modal-close')?.addEventListener('click', (e) => {
    e.preventDefault();
    closePaymentModal();
  });

  // Đóng khi bấm vào overlay (vùng tối)
  document.getElementById('payment-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'payment-modal') {
      closePaymentModal();
    }
  });

  // Đóng khi bấm phím Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('payment-modal');
      if (modal && modal.classList.contains('is-open')) {
        closePaymentModal();
      }
    }
  });

  // Chuyển tab MoMo / ATM
  document.querySelectorAll('.payment-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const method = tab.dataset.method;
      if (method && method !== currentMethod) {
        currentMethod = method;
        renderPaymentModal();
        startCountdown(); // Reset countdown
      }
    });
  });

  // Lắng nghe cart:change để cập nhật tổng tiền nếu modal đang mở
  document.addEventListener('cart:change', () => {
    const modal = document.getElementById('payment-modal');
    if (modal && modal.classList.contains('is-open')) {
      renderPaymentModal();
    }
  });
}
