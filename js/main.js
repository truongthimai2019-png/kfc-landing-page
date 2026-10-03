/**
 * main.js – Điểm khởi chạy: cấu hình, tải CSV song song, gọi init từng module
 */

import { loadCSV } from './utils/csv-parser.js';
import { showToast } from './utils/dom.js';
import * as header from './modules/header.js';
import * as promoSlider from './modules/promo-slider.js';
import * as menu from './modules/menu.js';
import * as stores from './modules/stores.js';
import * as reviews from './modules/reviews.js';
import * as orderForm from './modules/order-form.js';
import * as payment from './modules/payment.js';
import { setPromotions } from './modules/cart.js';

/** Cấu hình toàn cục – sửa tại đây thay vì viết rải rác */
export const CONFIG = {
  zaloPhone: '0900000000',           // SĐT Zalo nhận đơn
  orderEmail: 'example@email.com',   // Email nhận đơn
  dataPath: 'data/',
  slideInterval: 5000,               // ms
};

/** Hàm khởi động chính */
async function main() {
  // Khởi header không cần dữ liệu CSV
  header.init();

  // Tải 4 file CSV song song; dùng allSettled để 1 file lỗi không làm sập trang
  const [menuResult, promoResult, storesResult, reviewsResult] = await Promise.allSettled([
    loadCSV(CONFIG.dataPath + 'menu.csv'),
    loadCSV(CONFIG.dataPath + 'promotions.csv'),
    loadCSV(CONFIG.dataPath + 'stores.csv'),
    loadCSV(CONFIG.dataPath + 'reviews.csv'),
  ]);

  // Lấy dữ liệu (hoặc mảng rỗng nếu lỗi)
  const menuData      = getValue(menuResult,    'menu.csv');
  const promotions    = getValue(promoResult,   'promotions.csv');
  const storesData    = getValue(storesResult,  'stores.csv');
  const reviewsData   = getValue(reviewsResult, 'reviews.csv');

  // Debug: in ra console để kiểm tra
  console.table(menuData,   ['id', 'name', 'category', 'price', 'available']);
  console.table(promotions, ['id', 'title', 'code', 'start_date', 'end_date', 'active']);
  console.table(storesData, ['id', 'name', 'city', 'district']);
  console.table(reviewsData,['id', 'customer_name', 'rating', 'approved']);

  // Cấp dữ liệu promotions cho cart.js để kiểm tra mã
  setPromotions(promotions);

  // Khởi chạy từng module
  promoSlider.init(promotions);
  menu.init(menuData);
  stores.init(storesData);
  reviews.init(reviewsData, menuData);
  orderForm.init(storesData, promotions);
  payment.init();

  // Hiệu ứng scroll reveal
  setupScrollReveal();
}

/**
 * Lấy giá trị từ Promise.allSettled result
 * Nếu lỗi → ghi console.warn và trả về mảng rỗng
 */
function getValue(result, filename) {
  if (result.status === 'fulfilled') return result.value;
  console.warn(`⚠️ Không tải được ${filename}:`, result.reason);
  return [];
}

/** Hiệu ứng fade-up khi cuộn đến section (IntersectionObserver) */
function setupScrollReveal() {
  // Tôn trọng prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  // Observe tất cả section và các phần tử có class reveal
  document.querySelectorAll('.section, .reveal').forEach(el => observer.observe(el));
}

// Bắt đầu chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  main().catch(err => {
    console.error('Lỗi khởi động trang:', err);
    showToast('Trang gặp sự cố khi tải. Vui lòng tải lại.', 'error');
  });
});
