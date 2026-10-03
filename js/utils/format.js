/**
 * format.js – Định dạng tiền VNĐ, ngày, bỏ dấu tiếng Việt
 */

/**
 * Định dạng số thành tiền VNĐ (VD: 89000 → "89.000đ")
 * @param {number} n
 * @returns {string}
 */
export function formatVND(n) {
  if (isNaN(n) || n === '' || n === null) return '0đ';
  return new Intl.NumberFormat('vi-VN').format(Number(n)) + 'đ';
}

/**
 * Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu
 * VD: "Gà rán" → "ga ran"
 * @param {string} s
 * @returns {string}
 */
export function removeAccents(s) {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Kiểm tra hôm nay có nằm trong khoảng [start, end] không
 * @param {string} start – Dạng YYYY-MM-DD
 * @param {string} end   – Dạng YYYY-MM-DD
 * @returns {boolean}
 */
export function isActiveToday(start, end) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(start);
  const e = new Date(end);
  e.setHours(23, 59, 59, 999);
  return today >= s && today <= e;
}

/**
 * Định dạng ngày từ chuỗi YYYY-MM-DD sang DD/MM/YYYY
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Tính số giây còn lại đến cuối ngày end_date
 * @param {string} endDate – YYYY-MM-DD
 * @returns {number} – Số giây (>= 0)
 */
export function secondsUntilEnd(endDate) {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const diff = end - Date.now();
  return Math.max(0, Math.floor(diff / 1000));
}
