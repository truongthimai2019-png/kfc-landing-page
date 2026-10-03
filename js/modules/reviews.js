/**
 * reviews.js – Điểm trung bình, carousel đánh giá khách hàng
 */

import { escapeHTML, showSectionError } from '../utils/dom.js';
import { formatDate } from '../utils/format.js';

let approvedReviews = []; // Chỉ các đánh giá approved = 1
let menuLookup = {};      // { [item_id]: name } để hiện tên món
let currentPage = 0;      // Trang hiện tại của carousel
const PER_PAGE = 3;       // Số thẻ mỗi lần hiện

/** Khởi chạy module đánh giá */
export function init(reviewsData, menuData) {
  const track = document.getElementById('reviews-track');
  const summary = document.getElementById('reviews-summary');
  if (!track || !summary) return;

  // Chỉ hiện đánh giá approved = 1
  approvedReviews = reviewsData.filter(r => r.approved == 1);

  // Tạo bảng tra cứu tên món
  menuData.forEach(m => { menuLookup[m.id] = m.name; });

  if (approvedReviews.length === 0) {
    showSectionError(track, 'Chưa có đánh giá nào được duyệt.');
    return;
  }

  renderSummary(summary);
  renderReviews(track);
  setupCarouselNav();
}

/** Vẽ điểm trung bình và tổng số đánh giá */
function renderSummary(summary) {
  const avg = approvedReviews.reduce((s, r) => s + Number(r.rating), 0) / approvedReviews.length;
  const avgFixed = avg.toFixed(1);
  const stars = renderStars(avg);

  summary.innerHTML = `
    <div class="reviews-avg">
      <div class="reviews-avg-num">${avgFixed}</div>
      <div class="reviews-avg-stars">${stars}</div>
      <div class="reviews-avg-count">${approvedReviews.length} đánh giá</div>
    </div>
  `;
}

/** Render sao (★ và ☆) */
function renderStars(rating) {
  return Array.from({ length: 5 }, (_, i) => i < Math.round(rating) ? '★' : '☆').join('');
}

/** Vẽ carousel đánh giá theo trang */
function renderReviews(track) {
  const start = currentPage * PER_PAGE;
  const slice = approvedReviews.slice(start, start + PER_PAGE);

  const row = document.createElement('div');
  row.className = 'reviews-row';

  slice.forEach((r, i) => {
    const card = buildReviewCard(r, i);
    row.appendChild(card);
  });

  track.innerHTML = '';
  track.appendChild(row);
}

/** Tạo thẻ một đánh giá */
function buildReviewCard(r, idx) {
  const card = document.createElement('div');
  card.className = 'review-card reveal';
  card.style.animationDelay = `${idx * 0.1}s`;

  // Avatar: ảnh hoặc chữ cái đầu
  const initial = (r.customer_name || 'K').charAt(0).toUpperCase();
  const avatarContent = r.avatar
    ? `<img src="${escapeHTML(r.avatar)}" alt="${escapeHTML(r.customer_name)}" loading="lazy" onerror="this.style.display='none'" />${escapeHTML(initial)}`
    : escapeHTML(initial);

  const stars = renderStars(Number(r.rating));
  const itemName = r.item_id && menuLookup[r.item_id] ? menuLookup[r.item_id] : '';

  card.innerHTML = `
    <div class="review-header">
      <div class="review-avatar">${avatarContent}</div>
      <div class="review-meta">
        <span class="review-name">${escapeHTML(r.customer_name)}</span>
        <span class="review-stars">${stars}</span>
        <span class="review-date">${formatDate(r.date)}</span>
      </div>
    </div>
    <p class="review-comment">"${escapeHTML(r.comment)}"</p>
    ${itemName ? `<p class="review-item">🍗 Đã thưởng thức: ${escapeHTML(itemName)}</p>` : ''}
  `;

  return card;
}

/** Cài đặt nút prev/next carousel */
function setupCarouselNav() {
  const track = document.getElementById('reviews-track');
  const prevBtn = document.getElementById('reviews-prev');
  const nextBtn = document.getElementById('reviews-next');

  const totalPages = Math.ceil(approvedReviews.length / PER_PAGE);

  function updateButtons() {
    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 0) { currentPage--; renderReviews(track); updateButtons(); }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages - 1) { currentPage++; renderReviews(track); updateButtons(); }
    });
  }

  updateButtons();
}
