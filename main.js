/**
 * SIOMAY ONLINE — MAIN APPLICATION SCRIPT
 * Handles WhatsApp link generation, sticky navbar, mobile menu,
 * scroll reveals, and active nav highlights.
 */

// =============================================================================
// 1. BRAND CONFIGURATION (Placeholder mudah diganti)
// =============================================================================
export const CONFIG = {
  brandName: "Siomay Online",
  
  /**
   * Nomor WhatsApp resmi untuk menerima pesanan pelanggan.
   * Ganti "XXXXXXXXXXX" dengan format nomor internasional tanpa tanda plus (+),
   * misalnya: "6281234567890"
   */
  whatsappNumber: "XXXXXXXXXXX",
  
  whatsappBaseUrl: "https://wa.me/",
  
  defaultOrderMessage: "Halo Siomay Online, saya ingin pesan siomay fresh untuk diantar.",
  
  /**
   * Template pesan saat memesan produk spesifik
   */
  createProductMessage: (productName, price) => {
    return `Halo Siomay Online, saya mau pesan:\n• Produk: ${productName}\n• Harga: ${price}\n\nMohon info ketersediaan dan estimasi pengirimannya ya. Terima kasih!`;
  }
};

/**
 * Menghasilkan link WhatsApp lengkap dengan pesan yang di-encode
 */
export function getWhatsAppUrl(message = CONFIG.defaultOrderMessage) {
  const cleanNumber = CONFIG.whatsappNumber.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  return `${CONFIG.whatsappBaseUrl}${cleanNumber}?text=${encodedText}`;
}

// =============================================================================
// 2. DOM CONTENT LOADED & INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initWhatsAppLinks();
  initNavbarScroll();
  initMobileMenu();
  initScrollSpy();
  initScrollReveal();
  initProductOrderButtons();
});

// =============================================================================
// 3. WHATSAPP LINK BINDING
// =============================================================================
function initWhatsAppLinks() {
  const genericWhatsAppBtns = document.querySelectorAll('[data-cta="whatsapp-general"]');
  const genericUrl = getWhatsAppUrl(CONFIG.defaultOrderMessage);

  genericWhatsAppBtns.forEach((btn) => {
    btn.setAttribute('href', genericUrl);
    btn.setAttribute('target', '_blank');
    btn.setAttribute('rel', 'noopener noreferrer');
  });
}

function initProductOrderButtons() {
  const productOrderBtns = document.querySelectorAll('[data-product-order]');

  productOrderBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const productName = btn.getAttribute('data-product-name') || 'Siomay';
      const productPrice = btn.getAttribute('data-product-price') || '';
      
      const message = CONFIG.createProductMessage(productName, productPrice);
      const url = getWhatsAppUrl(message);
      
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  });
}

// =============================================================================
// 4. NAVBAR STICKY & SCROLL EFFECT
// =============================================================================
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  let ticking = false;

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 30) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial check
}

// =============================================================================
// 5. MOBILE HAMBURGER MENU & DRAWER
// =============================================================================
function initMobileMenu() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileNav = document.getElementById('mobileNav');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (!hamburgerBtn || !mobileNav) return;

  const toggleMenu = () => {
    const isOpen = hamburgerBtn.classList.toggle('active');
    mobileNav.classList.toggle('open');
    hamburgerBtn.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  hamburgerBtn.addEventListener('click', toggleMenu);

  mobileLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (mobileNav.classList.contains('open')) {
        toggleMenu();
      }
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
      toggleMenu();
    }
  });
}

// =============================================================================
// 6. SCROLL REVEAL ANIMATIONS (INTERSECTION OBSERVER)
// =============================================================================
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  
  if (!('IntersectionObserver' in window)) {
    // Fallback if IntersectionObserver not supported
    revealElements.forEach(el => el.classList.add('revealed'));
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.12
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => revealObserver.observe(el));
}

// =============================================================================
// 7. SCROLL SPY (ACTIVE NAV LINK HIGHLIGHT)
// =============================================================================
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-menu .nav-link');

  if (!sections.length || !navLinks.length) return;

  const onScroll = () => {
    const scrollPos = window.scrollY + 120;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}
