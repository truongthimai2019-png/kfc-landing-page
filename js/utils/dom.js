/**
 * dom.js – Hàm tạo phần tử, escape HTML, toast thông báo
 */

/**
 * Chống XSS khi hiển thị dữ liệu từ CSV
 * @param {string} s
 * @returns {string}
 */
export function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Hiện thông báo toast góc dưới phải màn hình, tự ẩn sau 3 giây
 * @param {string} msg   – Nội dung thông báo
 * @param {'info'|'success'|'error'} type
 */
export function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);

  // Tự ẩn sau 3 giây
  setTimeout(() => {
    toast.classList.add('toast-hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3000);
}

/**
 * Tạo element HTML với thuộc tính và nội dung
 * @param {string} tag
 * @param {Object} attrs
 * @param {string|Node} [content]
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, content = '') {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else el.setAttribute(k, v);
  }
  if (typeof content === 'string') {
    el.innerHTML = content;
  } else if (content instanceof Node) {
    el.appendChild(content);
  }
  return el;
}

/**
 * Hiện trạng thái lỗi thân thiện bên trong một container
 * @param {HTMLElement} container
 * @param {string} message
 */
export function showSectionError(container, message) {
  container.innerHTML = `
    <div class="section-error">
      <div class="section-error-icon">⚠️</div>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}
