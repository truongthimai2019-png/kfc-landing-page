/**
 * cart.js – Trạng thái giỏ món: thêm/bớt/xoá, tính tiền, áp mã khuyến mãi
 * Phát sự kiện 'cart:change' để order-form.js lắng nghe và vẽ lại
 */

import { formatVND, isActiveToday, removeAccents } from '../utils/format.js';

// Trạng thái giỏ hàng nội bộ
let cartItems = [];       // [{ item, quantity }]
let promotions = [];      // Dữ liệu promotions để kiểm tra mã
let appliedPromo = null;  // Khuyến mãi đang áp dụng

/** Cung cấp dữ liệu promotions cho module này */
export function setPromotions(data) {
  promotions = data;
}

/** Thêm món vào giỏ (hoặc tăng số lượng nếu đã có) */
export function addToCart(item) {
  const existing = cartItems.find(ci => ci.item.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cartItems.push({ item, quantity: 1 });
  }
  dispatchChange();
}

/** Tăng số lượng món */
export function increaseQty(itemId) {
  const found = cartItems.find(ci => ci.item.id === itemId);
  if (found) { found.quantity += 1; dispatchChange(); }
}

/** Giảm số lượng (xoá nếu về 0) */
export function decreaseQty(itemId) {
  const found = cartItems.find(ci => ci.item.id === itemId);
  if (!found) return;
  found.quantity -= 1;
  if (found.quantity <= 0) cartItems = cartItems.filter(ci => ci.item.id !== itemId);
  dispatchChange();
}

/** Xoá hẳn một món khỏi giỏ */
export function removeFromCart(itemId) {
  cartItems = cartItems.filter(ci => ci.item.id !== itemId);
  dispatchChange();
}

/** Lấy tổng tạm tính (trước giảm giá) */
export function getSubtotal() {
  return cartItems.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);
}

/** Tính số tiền được giảm dựa trên mã khuyến mãi */
export function getDiscount() {
  if (!appliedPromo) return 0;
  const sub = getSubtotal();
  if (appliedPromo.discount_type === 'percent') {
    return Math.min(Math.floor(sub * appliedPromo.discount_value / 100), sub);
  }
  if (appliedPromo.discount_type === 'amount') {
    return Math.min(appliedPromo.discount_value, sub);
  }
  return 0;
}

/** Tổng cộng sau giảm giá */
export function getTotal() {
  return Math.max(0, getSubtotal() - getDiscount());
}

/** Áp dụng mã khuyến mãi – trả về object kết quả */
export function applyPromoCode(code) {
  const normalizedCode = removeAccents(code).toUpperCase();
  const promo = promotions.find(p => {
    return (
      p.active == 1 &&
      isActiveToday(p.start_date, p.end_date) &&
      p.code &&
      removeAccents(p.code).toUpperCase() === normalizedCode
    );
  });

  if (!promo) {
    return { success: false, message: 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn.' };
  }

  const sub = getSubtotal();
  if (sub < promo.min_order) {
    return {
      success: false,
      message: `Đơn hàng tối thiểu ${formatVND(promo.min_order)} để dùng mã này.`
    };
  }

  appliedPromo = promo;
  dispatchChange();
  return { success: true, message: `Áp dụng thành công! Giảm ${formatVND(getDiscount())}.` };
}

/** Xoá mã đã áp dụng */
export function clearPromo() {
  appliedPromo = null;
  dispatchChange();
}

/** Lấy snapshot giỏ để xuất đơn */
export function getCartSnapshot() {
  return {
    items: cartItems.map(ci => ({ ...ci })),
    promo: appliedPromo,
    subtotal: getSubtotal(),
    discount: getDiscount(),
    total: getTotal(),
  };
}

/** Lấy danh sách items */
export function getCartItems() { return cartItems; }

/** Phát sự kiện để order-form.js vẽ lại giỏ */
function dispatchChange() {
  document.dispatchEvent(new CustomEvent('cart:change', {
    detail: {
      items: cartItems,
      subtotal: getSubtotal(),
      discount: getDiscount(),
      total: getTotal(),
      promo: appliedPromo,
    }
  }));
}
