/**
 * header.js – Menu mobile (hamburger), cuộn mượt, tô sáng mục đang xem
 */

/** Khởi chạy logic header */
export function init() {
  setupHamburger();
  setupScrollHighlight();
  setupSmoothScroll();
  setupCartIcon();
}

/** Xử lý nút hamburger mở/đóng menu mobile */
function setupHamburger() {
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('main-nav');
  if (!hamburger || !nav) return;

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('is-open');
    nav.classList.toggle('is-open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  // Đóng menu khi bấm vào một nav-link
  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('is-open');
      nav.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Đóng khi bấm bên ngoài
  document.addEventListener('click', e => {
    if (!hamburger.contains(e.target) && !nav.contains(e.target)) {
      hamburger.classList.remove('is-open');
      nav.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

/** Tô sáng mục nav tương ứng với section đang nhìn thấy */
function setupScrollHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            link.classList.toggle('active', href === `#${id}`);
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
  );

  sections.forEach(s => observer.observe(s));
}

/** Cuộn mượt khi bấm link anchor (phòng trừ trình duyệt cũ) */
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const id = anchor.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/** Cài đặt icon giỏ hàng trong header: click cuộn xuống, cập nhật badge */
function setupCartIcon() {
  const cartIconBtn = document.getElementById('cart-icon');
  const badge = document.getElementById('cart-badge');
  if (!cartIconBtn || !badge) return;

  // Ẩn badge ban đầu (giỏ trống)
  badge.classList.add('hidden');

  // Click icon → cuộn xuống phần đặt hàng
  cartIconBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const orderSection = document.getElementById('order');
    if (orderSection) {
      orderSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Lắng nghe sự kiện cart:change để cập nhật badge số lượng
  document.addEventListener('cart:change', (e) => {
    const items = e.detail?.items || [];
    const totalQty = items.reduce((sum, ci) => sum + ci.quantity, 0);

    if (totalQty > 0) {
      badge.textContent = totalQty > 99 ? '99+' : totalQty;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    // Hiệu ứng bounce khi thay đổi
    cartIconBtn.classList.remove('bounce');
    // Force reflow để animation chạy lại
    void cartIconBtn.offsetWidth;
    cartIconBtn.classList.add('bounce');
  });
}
