/**
 * promo-slider.js – Slider khuyến mãi + đồng hồ đếm ngược
 */

import { escapeHTML, showSectionError } from '../utils/dom.js';
import { formatVND, isActiveToday, secondsUntilEnd } from '../utils/format.js';

let slides = [];        // Danh sách khuyến mãi còn hiệu lực
let currentIndex = 0;   // Slide đang hiển thị
let autoTimer = null;   // Timer tự chuyển slide
let countdownTimer = null; // Timer đồng hồ đếm ngược
let isPaused = false;   // Tạm dừng khi hover

const SLIDE_INTERVAL = 5000; // ms

/** Khởi chạy slider với dữ liệu promotions */
export function init(promotions) {
  const container = document.getElementById('promo-slider');
  const controls = document.getElementById('slider-controls');
  if (!container) return;

  // Lọc khuyến mãi còn hiệu lực
  slides = promotions.filter(p => p.active == 1 && isActiveToday(p.start_date, p.end_date));

  if (slides.length === 0) {
    showSectionError(container, 'Hiện không có khuyến mãi nào đang diễn ra.');
    if (controls) controls.style.display = 'none';
    return;
  }

  renderSlides(container);
  renderDots();
  setupControls();
  startAuto();
  setupHoverPause(container);
}

/** Vẽ tất cả slide vào DOM */
function renderSlides(container) {
  const track = document.createElement('div');
  track.className = 'slider-track';
  track.id = 'slider-track';

  slides.forEach((p, i) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.setAttribute('aria-hidden', i !== 0 ? 'true' : 'false');

    // Ảnh
    const imgWrap = document.createElement('div');
    imgWrap.className = 'slide-img-wrap';
    const img = document.createElement('img');
    img.src = p.image || 'assets/images/placeholder.jpg';
    img.alt = escapeHTML(p.title);
    img.className = 'slide-img';
    img.loading = 'lazy';
    img.onerror = () => { img.src = 'assets/images/placeholder.jpg'; };
    imgWrap.appendChild(img);

    // Nội dung
    const content = document.createElement('div');
    content.className = 'slide-content';

    let pricesHTML = '';
    if (p.original_price) {
      pricesHTML += `<span class="slide-original-price">${formatVND(p.original_price)}</span>`;
    }
    if (p.promo_price) {
      pricesHTML += `<span class="slide-promo-price">${formatVND(p.promo_price)}</span>`;
    }

    let codeHTML = '';
    if (p.code) {
      codeHTML = `<span class="slide-code-badge">Mã: ${escapeHTML(p.code)}</span>`;
    }

    content.innerHTML = `
      <h2 class="slide-title">${escapeHTML(p.title)}</h2>
      <p class="slide-desc">${escapeHTML(p.description || '')}</p>
      ${pricesHTML ? `<div class="slide-prices">${pricesHTML}</div>` : ''}
      ${codeHTML}
      <div class="countdown" id="countdown-${i}"></div>
      <a href="#order" class="btn btn-primary">Đặt ngay</a>
    `;

    slide.appendChild(imgWrap);
    slide.appendChild(content);
    track.appendChild(slide);
  });

  container.innerHTML = '';
  container.appendChild(track);
  updateCountdown(0);
}

/** Vẽ chấm chỉ vị trí slide */
function renderDots() {
  const dotsEl = document.getElementById('slider-dots');
  if (!dotsEl) return;
  dotsEl.innerHTML = '';
  slides.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = `slider-dot${i === 0 ? ' active' : ''}`;
    btn.setAttribute('aria-label', `Đến slide ${i + 1}`);
    btn.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(btn);
  });
}

/** Cài đặt nút ‹ và › */
function setupControls() {
  const prev = document.getElementById('slider-prev');
  const next = document.getElementById('slider-next');
  if (prev) prev.addEventListener('click', () => { goTo(currentIndex - 1); resetAuto(); });
  if (next) next.addEventListener('click', () => { goTo(currentIndex + 1); resetAuto(); });
}

/** Dừng slider khi di chuột vào, chạy lại khi rời chuột */
function setupHoverPause(container) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  container.addEventListener('mouseenter', () => {
    isPaused = true;
    clearInterval(autoTimer);
  });
  container.addEventListener('mouseleave', () => {
    isPaused = false;
    startAuto();
  });
}

/** Chuyển đến slide thứ i (vòng tròn) */
function goTo(i) {
  const total = slides.length;
  currentIndex = ((i % total) + total) % total;

  // Di chuyển track
  const track = document.getElementById('slider-track');
  if (track) track.style.transform = `translateX(-${currentIndex * 100}%)`;

  // Cập nhật aria-hidden các slide
  const slideEls = track ? track.querySelectorAll('.slide') : [];
  slideEls.forEach((el, idx) => el.setAttribute('aria-hidden', idx !== currentIndex ? 'true' : 'false'));

  // Cập nhật chấm
  document.querySelectorAll('.slider-dot').forEach((dot, idx) => {
    dot.classList.toggle('active', idx === currentIndex);
  });

  // Cập nhật đồng hồ đếm ngược
  updateCountdown(currentIndex);
}

/** Bắt đầu tự chuyển slide sau SLIDE_INTERVAL ms */
function startAuto() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || slides.length <= 1) return;
  clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    if (!isPaused) goTo(currentIndex + 1);
  }, SLIDE_INTERVAL);
}

/** Reset auto timer khi người dùng tự chuyển */
function resetAuto() {
  clearInterval(autoTimer);
  startAuto();
}

/** Cập nhật đồng hồ đếm ngược cho slide đang hiện */
function updateCountdown(idx) {
  clearInterval(countdownTimer);
  const slide = slides[idx];
  if (!slide) return;

  const el = document.getElementById(`countdown-${idx}`);
  if (!el) return;

  function render() {
    const total = secondsUntilEnd(slide.end_date);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    el.innerHTML = `
      <div class="countdown-unit"><span class="countdown-num">${pad(days)}</span><span class="countdown-label">Ngày</span></div>
      <span class="countdown-sep">:</span>
      <div class="countdown-unit"><span class="countdown-num">${pad(hours)}</span><span class="countdown-label">Giờ</span></div>
      <span class="countdown-sep">:</span>
      <div class="countdown-unit"><span class="countdown-num">${pad(mins)}</span><span class="countdown-label">Phút</span></div>
      <span class="countdown-sep">:</span>
      <div class="countdown-unit"><span class="countdown-num">${pad(secs)}</span><span class="countdown-label">Giây</span></div>
    `;
  }

  render();
  countdownTimer = setInterval(render, 1000);
}

/** Pad số thành 2 chữ số */
function pad(n) { return String(n).padStart(2, '0'); }
