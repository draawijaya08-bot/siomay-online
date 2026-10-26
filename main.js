/**
 * SIOMAY ONLINE — MAIN APPLICATION SCRIPT & ORDER FLOW
 * 
 * Architecture:
 * 1. CONFIG: Centralized store configuration & WhatsApp number.
 * 2. PRODUCTS: Single source of truth for all menu items.
 * 3. CART: State management, localStorage persistence, integer calculations.
 * 4. UI RENDERERS: Menu cards, Cart Drawer, Badges, Mobile Sticky Order Bar.
 * 5. VALIDATION & ORDER: Form checking, friendly errors, WhatsApp message builder.
 * 6. SITE INTERACTION: Navbar scroll, mobile nav, scroll reveals, active spy.
 */

// =============================================================================
// 1. BRAND CONFIGURATION
// =============================================================================
export const CONFIG = {
  brandName: "Siomay Online",
  
  /**
   * Nomor WhatsApp resmi untuk menerima pesanan pelanggan.
   * Format: Nomor internasional tanpa tanda plus (+), diawali 62.
   * Ganti "628XXXXXXXXXX" dengan nomor WhatsApp bisnismu yang sebenarnya.
   */
  whatsappNumber: "628XXXXXXXXXX",
  
  whatsappBaseUrl: "https://wa.me/",
  
  defaultOrderMessage: "Halo Siomay Online, saya ingin pesan siomay fresh untuk diantar."
};

// =============================================================================
// 2. PRODUCT DATA (Single Source of Truth)
// =============================================================================
export const PRODUCTS = [
  {
    id: "siomay-original",
    name: "Siomay Original",
    price: 15000,
    desc: "Siomay lembut dengan siraman bumbu kacang khas dan kecap manis gurih.",
    image: "/images/menu-original.jpg",
    badge: "Paling Populer",
    portion: "Porsi Mantap",
    rating: 4.9
  },
  {
    id: "siomay-komplit",
    name: "Siomay Komplit",
    price: 25000,
    desc: "Siomay, tahu, kentang, telur, dan bumbu kacang khas yang melimpah.",
    image: "/images/menu-komplit.jpg",
    badge: "BEST SELLER",
    isBestSeller: true,
    portion: "Paling Lengkap",
    rating: 4.9
  },
  {
    id: "batagor",
    name: "Batagor",
    price: 15000,
    desc: "Batagor renyah keemasan dengan adonan gurih dan bumbu kacang kental.",
    image: "/images/menu-batagor.jpg",
    portion: "Crispy & Gurih",
    rating: 4.8
  },
  {
    id: "tahu",
    name: "Tahu",
    price: 12000,
    desc: "Tahu lembut isi adonan ikan tenggiri gurih kukus hangat kaya rasa.",
    image: "/images/menu-tahu.jpg",
    portion: "Kukus Hangat",
    rating: 4.8
  },
  {
    id: "kentang",
    name: "Kentang",
    price: 12000,
    desc: "Kentang kukus pulen empuk disiram bumbu kacang gurih dan jeruk limau.",
    image: "/images/menu-kentang.jpg",
    portion: "Pulen & Empuk",
    rating: 4.7
  },
  {
    id: "paket-hemat",
    name: "Paket Hemat",
    price: 35000,
    desc: "Kombinasi siomay, batagor, tahu & telur untuk santap puas bersama teman atau keluarga.",
    image: "/images/menu-paket-hemat.jpg",
    badge: "Paling Hemat",
    portion: "Porsi Kenyang",
    rating: 4.9
  }
];

// Helper: Format Rupiah integer
export function formatRupiah(amount) {
  const cleanInt = Math.round(Number(amount) || 0);
  return "Rp" + cleanInt.toLocaleString("id-ID");
}

// Dynamic Active Products (initialized from static PRODUCTS fallback)
export let activeProducts = [...PRODUCTS];

// Helper: Get product by ID (searches active dynamic products then fallback)
export function getProductById(id) {
  return activeProducts.find(p => p.id === id || p.dbId === id) || PRODUCTS.find(p => p.id === id) || null;
}

// =============================================================================
// 3. CART STATE & LOCALSTORAGE PERSISTENCE
// =============================================================================
const CART_STORAGE_KEY = "siomay-cart";

/**
 * Cart Item Structure: { id: string, quantity: number }
 * Only store ID and quantity; prices always reference PRODUCTS to avoid tampering.
 */
let cart = loadCartFromStorage();

function loadCartFromStorage() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => {
        return item && 
               typeof item.id === "string" && 
               typeof item.quantity === "number" && 
               item.quantity > 0 &&
               getProductById(item.id);
      });
    }
  } catch (err) {
    console.warn("Gagal memuat keranjang dari localStorage:", err);
  }
  return [];
}

function saveCartToStorage() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (err) {
    console.warn("Gagal menyimpan keranjang ke localStorage:", err);
  }
}

/**
 * Hitung total item dan subtotal harga keranjang
 */
export function getCartSummary() {
  let itemCount = 0;
  let subtotal = 0;
  const detailedItems = [];

  cart.forEach(item => {
    const product = getProductById(item.id);
    if (product) {
      const itemSubtotal = product.price * item.quantity;
      itemCount += item.quantity;
      subtotal += itemSubtotal;
      detailedItems.push({
        id: product.id,
        product,
        quantity: item.quantity,
        subtotal: itemSubtotal
      });
    }
  });

  return {
    items: detailedItems,
    itemCount,
    subtotal,
    total: subtotal // Delivery fee dikonfirmasi via WA
  };
}

/**
 * Tambah produk ke keranjang
 */
export function addToCart(productId, quantity = 1) {
  const product = getProductById(productId);
  if (!product) return;

  const existingIndex = cart.findIndex(item => item.id === productId);
  if (existingIndex >= 0) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({ id: productId, quantity: Math.max(1, quantity) });
  }

  saveCartToStorage();
  updateCartUI();
  triggerCartButtonFeedback(productId);
}

/**
 * Ubah quantity (+1 atau -1)
 */
export function updateCartQuantity(productId, delta) {
  const index = cart.findIndex(item => item.id === productId);
  if (index === -1) return;

  const newQty = cart[index].quantity + delta;
  if (newQty <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].quantity = newQty;
  }

  saveCartToStorage();
  updateCartUI();
}

/**
 * Hapus produk dari keranjang
 */
export function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCartToStorage();
  updateCartUI();
}

/**
 * Kosongkan keranjang
 */
export function clearCart() {
  cart = [];
  saveCartToStorage();
  updateCartUI();
}

// =============================================================================
// 4. WHATSAPP LINK & MESSAGE GENERATION
// =============================================================================
export function getCleanWhatsAppNumber() {
  return CONFIG.whatsappNumber.replace(/[^0-9A-Za-z]/g, "");
}

export function getWhatsAppBaseUrl() {
  const cleanNumber = getCleanWhatsAppNumber();
  return `${CONFIG.whatsappBaseUrl}${cleanNumber}`;
}

/**
 * Generate formatted WhatsApp message as specified:
 * 
 * Halo Siomay Online 👋
 * 
 * Saya ingin melakukan pemesanan:
 * 
 * 1. Siomay Komplit
 *    2 x Rp25.000 = Rp50.000
 * 
 * ----------------
 * Total: Rp50.000
 * 
 * Nama: ...
 * No. WhatsApp: ...
 * Alamat: ...
 * Catatan: ...
 */
export function buildWhatsAppOrderMessage(cartSummary, customer) {
  let message = `Halo ${CONFIG.brandName} 👋\n\n`;
  message += `Saya ingin melakukan pemesanan:\n\n`;

  cartSummary.items.forEach((item, index) => {
    message += `${index + 1}. ${item.product.name}\n`;
    message += `   ${item.quantity} x ${formatRupiah(item.product.price)} = ${formatRupiah(item.subtotal)}\n\n`;
  });

  message += `----------------\n\n`;
  message += `Total: ${formatRupiah(cartSummary.total)}\n\n`;
  message += `Nama:\n${customer.name}\n\n`;
  message += `No. WhatsApp:\n${customer.phone}\n\n`;
  message += `Alamat:\n${customer.address}\n\n`;

  if (customer.note && customer.note.trim()) {
    message += `Catatan:\n${customer.note.trim()}\n\n`;
  }

  message += `Terima kasih.`;
  return message;
}

export function buildWhatsAppOrderUrl(cartSummary, customer) {
  const text = buildWhatsAppOrderMessage(cartSummary, customer);
  const cleanNumber = getCleanWhatsAppNumber();
  return `${CONFIG.whatsappBaseUrl}${cleanNumber}?text=${encodeURIComponent(text)}`;
}

import { initReviewsSection, openReviewModal } from "./reviews.js";
import { fetchAllMenuItems, fetchSiteSettings } from "./cmsService.js";

let isSyncingBackend = false;
let syncBackendTimer = null;

function debouncedSyncPublicWebsiteFromBackend() {
  if (syncBackendTimer) clearTimeout(syncBackendTimer);
  syncBackendTimer = setTimeout(() => {
    syncPublicWebsiteFromBackend();
  }, 250);
}

// =============================================================================
// 5. DOM INITIALIZATION & DYNAMIC CMS SYNC
// =============================================================================
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    // 1. Instant render from local defaults (Zero layout shift / offline resilience)
    renderMenuCards();
    initCartDrawer();
    updateCartUI();
    initReviewsSection();
    initWhatsAppLinks();
    initNavbarScroll();
    initMobileMenu();
    initScrollSpy();
    initScrollReveal();

    // 2. Fetch live updates from Supabase CMS (Menu, Banner, Promo Video, WhatsApp)
    syncPublicWebsiteFromBackend();

    // 3. Auto-sync on Admin changes (cross-tab storage and local custom events)
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === "siomay_menu_items_v2" || e.key === "siomay_site_settings_v1") {
          debouncedSyncPublicWebsiteFromBackend();
        }
      });
      window.addEventListener("siomay_menu_updated", () => {
        debouncedSyncPublicWebsiteFromBackend();
      });
      window.addEventListener("siomay_settings_updated", () => {
        debouncedSyncPublicWebsiteFromBackend();
      });
    }
  });
}

/**
 * Synchronize live content from Supabase backend
 */
async function syncPublicWebsiteFromBackend() {
  if (isSyncingBackend) return;
  isSyncingBackend = true;
  try {
    const [menuRes, settingsRes] = await Promise.all([
      fetchAllMenuItems(),
      fetchSiteSettings()
    ]);

    // A. Sync Food Menu
    if (menuRes.success && menuRes.items && menuRes.items.length > 0) {
      activeProducts = menuRes.items.map(item => ({
        id: item.slug || item.id,
        dbId: item.id,
        name: item.name,
        price: item.price,
        desc: item.description,
        image: item.image_url || "/images/menu-original.jpg",
        badge: item.badge,
        portion: item.portion || "Porsi Mantap",
        rating: Number(item.rating) || 4.9,
        isBestSeller: Boolean(item.is_best_seller),
        isAvailable: item.is_available !== false
      }));
      renderMenuCards();
      updateCartUI();
    }

    // B. Sync Site Settings (WhatsApp, Banner, Promo Video)
    if (settingsRes.success && settingsRes.settings) {
      const s = settingsRes.settings;

      if (s.whatsapp_number) {
        CONFIG.whatsappNumber = s.whatsapp_number;
      }
      if (s.default_order_message) {
        CONFIG.defaultOrderMessage = s.default_order_message;
      }
      initWhatsAppLinks();

      // Hero Headline
      const heroHeadline = document.querySelector(".hero-headline");
      if (heroHeadline && s.hero_title) {
        heroHeadline.innerHTML = `<span class="headline-main">${s.hero_title}</span>`;
      }

      // Hero Description
      const heroDesc = document.querySelector(".hero-description");
      if (heroDesc && s.hero_subtitle) {
        heroDesc.textContent = s.hero_subtitle;
      }

      // Hero Badge
      const heroBadge = document.querySelector(".hero-label-badge");
      if (heroBadge && s.hero_badge) {
        heroBadge.textContent = s.hero_badge;
      }

      // Hero CTA Button
      const heroCtaSpan = document.querySelector(".btn-hero[data-cta='whatsapp-general'] span");
      if (heroCtaSpan && s.hero_cta_text) {
        heroCtaSpan.textContent = s.hero_cta_text;
      }

      // Hero Image
      const heroImg = document.querySelector(".hero-image");
      if (heroImg && s.hero_image_url) {
        heroImg.src = s.hero_image_url;
      }

      // Promotional Video
      if (s.promo_video_url) {
        renderPromoVideoOnPublicSite(s.promo_video_url, s.promo_video_poster_url);
      }

      // C. Operational Hours, Store Location & Announcement Strip
      const stripStatusLabel = document.getElementById("stripStatusLabel");
      const stripHoursVal = document.getElementById("stripHoursVal");
      const stripLocationVal = document.getElementById("stripLocationVal");
      const stripAnnouncementVal = document.getElementById("stripAnnouncementVal");
      const stripStatusDot = document.getElementById("stripStatusDot");
      const footerHoursVal = document.getElementById("footerHoursVal");
      const footerAreaVal = document.getElementById("footerAreaVal");

      if (stripStatusLabel && s.operational_status_label) {
        stripStatusLabel.textContent = s.operational_status_label;
      }
      if (stripHoursVal && s.operational_hours) {
        stripHoursVal.textContent = s.operational_hours;
      }
      if (stripLocationVal && s.delivery_area) {
        stripLocationVal.textContent = s.delivery_area;
      }
      if (stripAnnouncementVal && s.strip_announcement) {
        stripAnnouncementVal.textContent = s.strip_announcement;
      }
      if (stripStatusDot && s.operational_status) {
        stripStatusDot.classList.remove("status-closed", "status-paused");
        if (s.operational_status === "tutup") {
          stripStatusDot.classList.add("status-closed");
        } else if (s.operational_status === "istirahat") {
          stripStatusDot.classList.add("status-paused");
        }
      }
      if (footerHoursVal && (s.operational_hours || s.operational_days)) {
        const prefix = s.operational_days ? `${s.operational_days}, ` : "";
        footerHoursVal.textContent = `${prefix}${s.operational_hours || "10.00 — 21.00 WIB"}`;
      }
      if (footerAreaVal && s.delivery_area) {
        footerAreaVal.textContent = s.delivery_area;
      }

      // D. Branding (Website Logo & Browser Favicon)
      if (s.logo_url) {
        document.querySelectorAll(".brand-logo-img").forEach(img => {
          img.src = s.logo_url;
        });
      }
      if (s.favicon_url) {
        document.querySelectorAll("link[rel*='icon']").forEach(link => {
          link.href = s.favicon_url;
        });
      }
    }
  } catch (err) {
    console.info("[Siomay Online] Menggunakan konten default:", err);
  } finally {
    isSyncingBackend = false;
  }
}

/**
 * Embed dynamic promo video into the Story / Visual section
 */
function renderPromoVideoOnPublicSite(videoUrl, posterUrl = null) {
  const storyWrap = document.querySelector(".story-image-wrap");
  if (!storyWrap || !videoUrl) return;

  const existingVideo = storyWrap.querySelector(".story-promo-video");
  if (existingVideo) {
    existingVideo.src = videoUrl;
    if (posterUrl) existingVideo.poster = posterUrl;
    return;
  }

  // Hide static image and append responsive video player
  const staticImg = storyWrap.querySelector(".story-image");
  if (staticImg) staticImg.style.display = "none";

  const videoEl = document.createElement("video");
  videoEl.className = "story-image story-promo-video";
  videoEl.controls = true;
  videoEl.playsInline = true;
  videoEl.preload = "metadata";
  if (posterUrl) videoEl.poster = posterUrl;
  videoEl.src = videoUrl;

  storyWrap.appendChild(videoEl);
}

// =============================================================================
// 6. RENDER MENU CARDS FROM PRODUCTS
// =============================================================================
let lastRenderedMenuHash = "";
let menuGridListenerInitialized = false;

function initMenuGridClickDelegation() {
  const grid = document.getElementById("menuGrid");
  if (!grid || menuGridListenerInitialized) return;
  menuGridListenerInitialized = true;

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-to-cart]");
    if (!btn || btn.disabled) return;
    e.preventDefault();
    e.stopPropagation();

    const productId = btn.getAttribute("data-add-to-cart");
    if (productId) {
      addToCart(productId, 1);
    }
  });
}

function renderMenuCards() {
  const grid = document.getElementById("menuGrid");
  if (!grid) return;

  initMenuGridClickDelegation();

  const currentHash = activeProducts.map(p => `${p.id}:${p.name}:${p.price}:${p.isAvailable}:${p.image}`).join("|");
  if (currentHash === lastRenderedMenuHash && grid.children.length > 0) {
    return;
  }
  lastRenderedMenuHash = currentHash;

  grid.innerHTML = activeProducts.map((product, idx) => {
    const isHighlight = product.isBestSeller ? "menu-card-highlight" : "";
    const delayClass = idx % 3 === 1 ? "delay-1" : idx % 3 === 2 ? "delay-2" : "";
    const isAvailable = product.isAvailable !== false;

    let badgeHtml = "";
    if (!isAvailable) {
      badgeHtml = `<span class="menu-badge badge-out-of-stock" style="background:#DC2626;color:#FFF;">Stok Habis</span>`;
    } else if (product.badge) {
      let badgeClass = "badge-clean";
      if (product.isBestSeller) badgeClass = "badge-bestseller";
      else if (product.badge.toLowerCase().includes("hemat")) badgeClass = "badge-savings";
      badgeHtml = `<span class="menu-badge ${badgeClass}">${product.badge}</span>`;
    }

    const imgUrl = product.image || product.image_url || "/images/menu-original.jpg";

    return `
      <article class="menu-card ${isHighlight} revealed ${delayClass} ${!isAvailable ? 'item-out-of-stock' : ''}" data-product-card-id="${product.id}">
        <div class="menu-card-image-wrap">
          ${badgeHtml}
          <img 
            src="${imgUrl}" 
            alt="${product.name} — ${product.desc}" 
            class="menu-card-image"
            loading="lazy"
            width="400" 
            height="300"
            onerror="this.onerror=null;this.src='/images/menu-original.jpg';"
          >
        </div>
        <div class="menu-card-body">
          <div class="menu-card-meta">
            <span class="menu-rating">★ ${product.rating || "4.9"}</span>
            <span class="menu-meta-sep">•</span>
            <span class="menu-portion">${product.portion || "Porsi Mantap"}</span>
          </div>
          <h3 class="menu-card-title">${product.name}</h3>
          <p class="menu-card-desc">${product.desc}</p>
          <div class="menu-card-footer">
            <div class="menu-card-price">
              <span class="price-label">Harga</span>
              <span class="price-amount">${formatRupiah(product.price)}</span>
            </div>
            ${isAvailable ? `
              <button 
                type="button"
                class="btn-order-item btn-order-primary" 
                data-add-to-cart="${product.id}"
                aria-label="Tambah ${product.name} seharga ${formatRupiah(product.price)}"
              >
                <span class="btn-order-icon" aria-hidden="true">+</span>
                <span class="btn-order-text">Tambah</span>
              </button>
            ` : `
              <button 
                type="button"
                class="btn-order-item" 
                disabled
                style="opacity:0.55;cursor:not-allowed;"
              >
                <span>Stok Habis</span>
              </button>
            `}
          </div>
        </div>
      </article>
    `;
  }).join("");

  // Re-observe scroll reveal
  initScrollReveal();
}

function triggerCartButtonFeedback(productId) {
  const btn = document.querySelector(`[data-add-to-cart="${productId}"]`);
  if (!btn) return;

  const textSpan = btn.querySelector(".btn-order-text");
  const iconSpan = btn.querySelector(".btn-order-icon");
  const originalText = textSpan ? textSpan.textContent : "Tambah";
  const originalIcon = iconSpan ? iconSpan.textContent : "+";

  if (textSpan) textSpan.textContent = "Ditambah";
  if (iconSpan) iconSpan.textContent = "✓";
  btn.classList.add("btn-added-feedback");

  // Subtle bounce on cart badge without layout thrashing
  const badges = document.querySelectorAll(".cart-badge");
  badges.forEach(b => {
    b.classList.remove("badge-bump");
    requestAnimationFrame(() => {
      b.classList.add("badge-bump");
    });
  });

  setTimeout(() => {
    if (textSpan) textSpan.textContent = originalText;
    if (iconSpan) iconSpan.textContent = originalIcon;
    btn.classList.remove("btn-added-feedback");
  }, 800);
}

// =============================================================================
// 7. CART DRAWER & UI UPDATES
// =============================================================================
export function openCartDrawer() {
  const cartDrawer = document.getElementById("cartDrawer");
  const cartOverlay = document.getElementById("cartOverlay");
  if (!cartDrawer) return;
  cartDrawer.classList.add("open");
  if (cartOverlay) cartOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
  cartDrawer.focus();
}

export function closeCartDrawer() {
  const cartDrawer = document.getElementById("cartDrawer");
  const cartOverlay = document.getElementById("cartOverlay");
  if (!cartDrawer) return;
  cartDrawer.classList.remove("open");
  if (cartOverlay) cartOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

function initCartDrawer() {
  const openCartBtn = document.getElementById("openCartBtn");
  const mobileNavCartBtn = document.getElementById("mobileNavCartBtn");
  const stickyViewCartBtn = document.getElementById("stickyViewCartBtn");
  const closeCartBtn = document.getElementById("closeCartBtn");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartDrawer = document.getElementById("cartDrawer");
  const submitOrderBtn = document.getElementById("submitOrderBtn");
  const btnBackToOrder = document.getElementById("btnBackToOrder");
  const btnReopenWa = document.getElementById("btnReopenWa");

  if (openCartBtn) openCartBtn.addEventListener("click", openCartDrawer);
  if (mobileNavCartBtn) {
    mobileNavCartBtn.addEventListener("click", () => {
      const mobileNav = document.getElementById("mobileNav");
      if (mobileNav && mobileNav.classList.contains("open")) {
        const hamburgerBtn = document.getElementById("hamburgerBtn");
        if (hamburgerBtn) hamburgerBtn.click();
      }
      openCartDrawer();
    });
  }
  if (stickyViewCartBtn) stickyViewCartBtn.addEventListener("click", openCartDrawer);
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCartDrawer);

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cartDrawer && cartDrawer.classList.contains("open")) {
      closeCartDrawer();
    }
  });

  // Handle Order Submit via WhatsApp
  if (submitOrderBtn) {
    submitOrderBtn.addEventListener("click", handleOrderSubmit);
  }

  // Handle back to order from success view
  if (btnBackToOrder) {
    btnBackToOrder.addEventListener("click", () => {
      const successView = document.getElementById("cartSuccessView");
      const customerSection = document.getElementById("cartCustomerSection");
      const itemsList = document.getElementById("cartItemsList");
      const footer = document.getElementById("cartDrawerFooter");
      
      if (successView) successView.style.display = "none";
      if (customerSection) customerSection.style.display = "block";
      if (itemsList) itemsList.style.display = "flex";
      if (footer) footer.style.display = "block";
    });
  }

  // Handle reopen WhatsApp
  if (btnReopenWa) {
    btnReopenWa.addEventListener("click", () => {
      const lastUrl = btnReopenWa.getAttribute("data-last-wa-url");
      if (lastUrl) {
        window.open(lastUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  // Handle write review from order success state
  const btnWriteReviewFromOrder = document.getElementById("btnWriteReviewFromOrder");
  if (btnWriteReviewFromOrder) {
    btnWriteReviewFromOrder.addEventListener("click", () => {
      closeDrawer();
      const nameInput = document.getElementById("customerName");
      const customerName = nameInput ? nameInput.value.trim() : "";
      openReviewModal({ prefillName: customerName });
    });
  }

  // Clear validation errors when inputs change
  ["customerName", "customerPhone", "customerAddress"].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener("input", () => {
        hideFormError();
        input.classList.remove("input-error");
      });
    }
  });

  // Bind clear cart button in header
  const btnClearCart = document.getElementById("btnClearCart");
  if (btnClearCart) {
    btnClearCart.addEventListener("click", () => {
      clearCart();
    });
  }
}

/**
 * Event delegation for cart items (+, -, and remove)
 */
let cartItemsListenerInitialized = false;

function initCartItemsDelegation() {
  const itemsContainer = document.getElementById("cartItemsList");
  if (!itemsContainer || cartItemsListenerInitialized) return;
  cartItemsListenerInitialized = true;

  itemsContainer.addEventListener("click", (e) => {
    // 1. Remove button
    const removeBtn = e.target.closest("[data-remove-item]");
    if (removeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = removeBtn.getAttribute("data-remove-item");
      if (id) removeFromCart(id);
      return;
    }

    // 2. Quantity buttons (+ / -)
    const qtyBtn = e.target.closest("[data-qty-action]");
    if (qtyBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = qtyBtn.getAttribute("data-qty-id");
      const action = qtyBtn.getAttribute("data-qty-action");
      if (id && action === "increase") {
        updateCartQuantity(id, 1);
      } else if (id && action === "decrease") {
        updateCartQuantity(id, -1);
      }
      return;
    }
  });
}

/**
 * Re-render cart elements: badges, drawer list, totals, mobile sticky bar
 */
export function updateCartUI() {
  const summary = getCartSummary();

  // 1. Update badges (Navbar & Mobile)
  const cartBadges = document.querySelectorAll(".cart-badge");
  cartBadges.forEach(badge => {
    badge.textContent = summary.itemCount;
    if (summary.itemCount > 0) {
      badge.classList.add("has-items");
    } else {
      badge.classList.remove("has-items");
    }
  });

  // 2. Update Drawer Header Count & Clear Button
  const drawerCount = document.getElementById("drawerCartCount");
  if (drawerCount) {
    drawerCount.textContent = `${summary.itemCount} item`;
  }
  const btnClearCart = document.getElementById("btnClearCart");
  if (btnClearCart) {
    btnClearCart.style.display = summary.itemCount > 0 ? "inline-flex" : "none";
  }

  // 3. Update Summary Numbers
  const subtotalEl = document.getElementById("summarySubtotal");
  const totalEl = document.getElementById("summaryTotal");
  if (subtotalEl) subtotalEl.textContent = formatRupiah(summary.subtotal);
  if (totalEl) totalEl.textContent = formatRupiah(summary.total);

  // 4. Update Mobile Sticky Order Pill
  const stickyBar = document.getElementById("mobileStickyOrder");
  const stickyCount = document.getElementById("stickyCount");
  const stickyTotal = document.getElementById("stickyTotal");

  if (stickyBar && stickyCount && stickyTotal) {
    if (summary.itemCount > 0) {
      stickyBar.classList.add("visible");
      stickyCount.textContent = `${summary.itemCount} item`;
      stickyTotal.textContent = formatRupiah(summary.total);
    } else {
      stickyBar.classList.remove("visible");
    }
  }

  // 5. Render Drawer Item List
  renderCartDrawerItems(summary);
}

function renderCartDrawerItems(summary) {
  const itemsContainer = document.getElementById("cartItemsList");
  const customerSection = document.getElementById("cartCustomerSection");
  const footer = document.getElementById("cartDrawerFooter");
  const successView = document.getElementById("cartSuccessView");

  if (!itemsContainer) return;

  // Initialize delegated click handling on itemsContainer once
  initCartItemsDelegation();

  // If in success state, don't overwrite view unless empty
  if (successView && successView.style.display === "block" && summary.itemCount === 0) {
    successView.style.display = "none";
  }

  if (summary.itemCount === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty-state">
        <div class="empty-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </div>
        <h3 class="empty-title">Keranjang Belanja Masih Kosong</h3>
        <p class="empty-desc">Pilih menu favoritmu dan rasakan gurihnya siomay fresh bumbu kacang khas kami.</p>
        <button type="button" class="btn btn-secondary btn-sm" id="btnExploreMenu">Lihat Menu Favorit</button>
      </div>
    `;

    const btnExplore = document.getElementById("btnExploreMenu");
    if (btnExplore) {
      btnExplore.addEventListener("click", () => {
        const closeBtn = document.getElementById("closeCartBtn");
        if (closeBtn) closeBtn.click();
        const menuEl = document.getElementById("menu");
        if (menuEl) menuEl.scrollIntoView({ behavior: "smooth" });
      });
    }

    if (customerSection) customerSection.style.display = "none";
    if (footer) footer.style.display = "none";
    return;
  }

  // Show form & footer when cart has items
  if (customerSection && (!successView || successView.style.display !== "block")) {
    customerSection.style.display = "block";
  }
  if (footer && (!successView || successView.style.display !== "block")) {
    footer.style.display = "block";
  }

  itemsContainer.innerHTML = summary.items.map(item => {
    return `
      <div class="cart-item" data-cart-item-id="${item.id}">
        <img src="${item.product.image}" alt="${item.product.name}" class="cart-item-img" width="64" height="64">
        <div class="cart-item-details">
          <div class="cart-item-top">
            <h4 class="cart-item-name">${item.product.name}</h4>
            <button 
              type="button" 
              class="cart-item-remove" 
              data-remove-item="${item.id}"
              aria-label="Hapus ${item.product.name} dari keranjang"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="cart-item-unit-price">${formatRupiah(item.product.price)}</div>
          <div class="cart-item-bottom">
            <div class="cart-item-qty-control" role="group" aria-label="Kuantitas ${item.product.name}">
              <button 
                type="button" 
                class="qty-btn" 
                data-qty-action="decrease" 
                data-qty-id="${item.id}"
                aria-label="Kurangi 1 ${item.product.name}"
              >−</button>
              <span class="qty-count" aria-live="polite">${item.quantity}</span>
              <button 
                type="button" 
                class="qty-btn" 
                data-qty-action="increase" 
                data-qty-id="${item.id}"
                aria-label="Tambah 1 ${item.product.name}"
              >+</button>
            </div>
            <div class="cart-item-subtotal">${formatRupiah(item.subtotal)}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// =============================================================================
// 8. FORM VALIDATION & SUBMIT TO WHATSAPP
// =============================================================================
function handleOrderSubmit(e) {
  if (e) e.preventDefault();

  const summary = getCartSummary();
  if (summary.itemCount === 0) {
    showFormError("Keranjang belanja kamu masih kosong. Silakan pilih menu terlebih dahulu.");
    return;
  }

  const nameInput = document.getElementById("customerName");
  const phoneInput = document.getElementById("customerPhone");
  const addressInput = document.getElementById("customerAddress");
  const noteInput = document.getElementById("customerNote");

  const name = nameInput ? nameInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";
  const address = addressInput ? addressInput.value.trim() : "";
  const note = noteInput ? noteInput.value.trim() : "";

  // Validations
  if (!name) {
    showFormError("Nama kamu belum diisi.");
    if (nameInput) {
      nameInput.classList.add("input-error");
      nameInput.focus();
    }
    return;
  }

  if (!phone) {
    showFormError("Nomor WhatsApp kamu belum diisi.");
    if (phoneInput) {
      phoneInput.classList.add("input-error");
      phoneInput.focus();
    }
    return;
  }

  // Basic phone sanity check (minimum digits)
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length < 8) {
    showFormError("Format nomor WhatsApp belum lengkap (minimal 8 angka).");
    if (phoneInput) {
      phoneInput.classList.add("input-error");
      phoneInput.focus();
    }
    return;
  }

  if (!address) {
    showFormError("Alamat lengkap pengantaran belum diisi.");
    if (addressInput) {
      addressInput.classList.add("input-error");
      addressInput.focus();
    }
    return;
  }

  hideFormError();

  const customer = { name, phone, address, note };
  const waUrl = buildWhatsAppOrderUrl(summary, customer);

  // Record order in customer orders history for Admin CMS
  try {
    const newOrder = {
      id: "ORD-" + Date.now().toString().slice(-6),
      created_at: new Date().toISOString(),
      customer: {
        name,
        phone,
        address,
        note
      },
      items: summary.items.map(it => ({
        id: it.id,
        name: it.product ? it.product.name : it.id,
        price: it.product ? it.product.price : 0,
        quantity: it.quantity,
        subtotal: it.subtotal,
        portion: it.product?.portion || "Porsi Mantap"
      })),
      total: summary.total,
      itemCount: summary.itemCount,
      status: "baru"
    };

    const existingOrders = JSON.parse(localStorage.getItem("siomay_customer_orders") || "[]");
    existingOrders.unshift(newOrder);
    localStorage.setItem("siomay_customer_orders", JSON.stringify(existingOrders));
    window.dispatchEvent(new CustomEvent("siomay_order_created", { detail: { order: newOrder } }));
  } catch (err) {
    console.warn("Gagal menyimpan pesanan ke riwayat CMS:", err);
  }

  // Transition to Success State in Cart
  showOrderSuccessState(waUrl);

  // Open WhatsApp in new tab
  window.open(waUrl, "_blank", "noopener,noreferrer");
}

function showFormError(message) {
  const alertEl = document.getElementById("formErrorAlert");
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.style.display = "block";
  alertEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideFormError() {
  const alertEl = document.getElementById("formErrorAlert");
  if (alertEl) {
    alertEl.textContent = "";
    alertEl.style.display = "none";
  }
}

function showOrderSuccessState(waUrl) {
  const customerSection = document.getElementById("cartCustomerSection");
  const itemsList = document.getElementById("cartItemsList");
  const footer = document.getElementById("cartDrawerFooter");
  const successView = document.getElementById("cartSuccessView");
  const btnReopenWa = document.getElementById("btnReopenWa");

  if (customerSection) customerSection.style.display = "none";
  if (itemsList) itemsList.style.display = "none";
  if (footer) footer.style.display = "none";

  if (successView) {
    successView.style.display = "block";
    successView.scrollIntoView({ behavior: "smooth" });
  }

  if (btnReopenWa) {
    btnReopenWa.setAttribute("data-last-wa-url", waUrl);
  }
}

// =============================================================================
// 9. GENERIC WHATSAPP LINK BINDING (For Hero, Top Strip, Footer)
// =============================================================================
function initWhatsAppLinks() {
  const genericWhatsAppBtns = document.querySelectorAll('[data-cta="whatsapp-general"]');
  const genericUrl = `${getWhatsAppBaseUrl()}?text=${encodeURIComponent(CONFIG.defaultOrderMessage)}`;

  genericWhatsAppBtns.forEach((btn) => {
    btn.setAttribute("href", genericUrl);
    btn.setAttribute("target", "_blank");
    btn.setAttribute("rel", "noopener noreferrer");
  });
}

// =============================================================================
// 10. NAVBAR STICKY & SCROLL EFFECT
// =============================================================================
function initNavbarScroll() {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;

  let ticking = false;

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 20) {
          navbar.classList.add("scrolled");
        } else {
          navbar.classList.remove("scrolled");
        }
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// =============================================================================
// 11. MOBILE HAMBURGER MENU & DRAWER
// =============================================================================
function initMobileMenu() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileNav = document.getElementById("mobileNav");
  const mobileLinks = document.querySelectorAll(".mobile-nav-link");

  if (!hamburgerBtn || !mobileNav) return;

  const toggleMenu = () => {
    const isOpen = hamburgerBtn.classList.toggle("active");
    mobileNav.classList.toggle("open");
    hamburgerBtn.setAttribute("aria-expanded", isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
  };

  hamburgerBtn.addEventListener("click", toggleMenu);

  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (mobileNav.classList.contains("open")) {
        toggleMenu();
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileNav.classList.contains("open")) {
      toggleMenu();
    }
  });
}

// =============================================================================
// 12. SCROLL REVEAL ANIMATIONS (INTERSECTION OBSERVER)
// =============================================================================
function initScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal-on-scroll");
  
  if (!("IntersectionObserver" in window)) {
    revealElements.forEach(el => el.classList.add("revealed"));
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: "0px 0px -40px 0px",
    threshold: 0.1
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => revealObserver.observe(el));
}

// =============================================================================
// 13. SCROLL SPY (ACTIVE NAV LINK HIGHLIGHT)
// =============================================================================
function initScrollSpy() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-menu .nav-link");

  if (!sections.length || !navLinks.length) return;

  const onScroll = () => {
    const scrollPos = window.scrollY + 120;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute("id");

      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.remove("active");
          if (link.getAttribute("href") === `#${id}`) {
            link.classList.add("active");
          }
        });
      }
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
}
