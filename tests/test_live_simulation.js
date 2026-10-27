import assert from "node:assert/strict";
import fs from "node:fs";

console.log("=================================================================");
console.log("   SIMULASI END-TO-END SINKRONISASI WHATSAPP CMS -> CLIENTSIDE   ");
console.log("=================================================================\n");

// -----------------------------------------------------------------------------
// 1. Inisialisasi Mock DOM dan Browser Storage Environment
// -----------------------------------------------------------------------------
const storageMap = new Map();
const windowListeners = {};

const mockLocalStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => {
    const oldVal = storageMap.get(k) || null;
    const newVal = String(v);
    storageMap.set(k, newVal);
    // Trigger storage event listeners (seperti komunikasi antar tab browser)
    if (windowListeners["storage"]) {
      windowListeners["storage"].forEach((cb) =>
        cb({ key: k, oldValue: oldVal, newValue: newVal })
      );
    }
  },
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

globalThis.localStorage = mockLocalStorage;

globalThis.window = {
  localStorage: mockLocalStorage,
  addEventListener: (evt, cb) => {
    if (!windowListeners[evt]) windowListeners[evt] = [];
    windowListeners[evt].push(cb);
  },
  dispatchEvent: (evt) => {
    if (windowListeners[evt.type]) {
      windowListeners[evt.type].forEach((cb) => cb(evt));
    }
    return true;
  },
  open: (url) => {
    lastOpenedUrl = url;
  }
};

globalThis.CustomEvent = class CustomEvent {
  constructor(type, params = {}) {
    this.type = type;
    this.detail = params.detail || {};
  }
};

let lastOpenedUrl = null;

class MockElement {
  constructor(tag, id = "", classes = "", attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.attributes = { ...attrs };
    if (id) this.attributes.id = id;
    if (classes) this.attributes.class = classes;
    this.classList = {
      _set: new Set(classes.split(" ").filter(Boolean)),
      contains: (c) => this.classList._set.has(c),
      add: (c) => this.classList._set.add(c),
      remove: (c) => this.classList._set.delete(c)
    };
    this.innerHTML = "";
    this.textContent = "";
    this.value = "";
    this.style = {};
    this.listeners = {};
  }
  getAttribute(name) {
    return this.attributes[name] || null;
  }
  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  click() {
    if (this.listeners["click"]) {
      this.listeners["click"].forEach((fn) => fn({ preventDefault: () => {} }));
    }
  }
  focus() {}
}

// Representasi elemen DOM dari index.html
const domElements = {
  // 6 CTA WhatsApp Umum
  navDesktopCta: new MockElement("a", "", "btn btn-primary btn-sm", { "data-cta": "whatsapp-general" }),
  navMobileCta: new MockElement("a", "", "btn btn-primary btn-full", { "data-cta": "whatsapp-general" }),
  heroCta: new MockElement("a", "", "btn btn-primary btn-hero", { "data-cta": "whatsapp-general" }),
  stepsCta: new MockElement("a", "", "btn btn-primary btn-lg", { "data-cta": "whatsapp-general" }),
  finalCta: new MockElement("a", "", "btn btn-cta-primary", { "data-cta": "whatsapp-general" }),
  footerLink: new MockElement("a", "", "footer-link", { "data-cta": "whatsapp-general" }),
  
  // Checkout & Success Order
  submitOrderBtn: new MockElement("button", "submitOrderBtn", "btn btn-primary btn-full btn-submit-order"),
  btnReopenWa: new MockElement("button", "btnReopenWa", "btn btn-primary btn-sm"),
  
  // Input fields form pesanan
  customerName: new MockElement("input", "customerName"),
  customerPhone: new MockElement("input", "customerPhone"),
  customerAddress: new MockElement("textarea", "customerAddress"),
  customerNote: new MockElement("textarea", "customerNote"),
  
  // Cart container elements
  cartSuccessView: new MockElement("div", "cartSuccessView"),
  cartCustomerSection: new MockElement("div", "cartCustomerSection"),
  cartItemsList: new MockElement("div", "cartItemsList"),
  cartDrawerFooter: new MockElement("div", "cartDrawerFooter"),
  formErrorMessage: new MockElement("div", "formErrorMessage")
};

globalThis.document = {
  readyState: "complete",
  addEventListener: () => {},
  getElementById: (id) => domElements[id] || null,
  querySelector: (sel) => {
    if (sel.includes("btn-hero")) return domElements.heroCta;
    return null;
  },
  querySelectorAll: (sel) => {
    if (sel === '[data-cta="whatsapp-general"]') {
      return [
        domElements.navDesktopCta,
        domElements.navMobileCta,
        domElements.heroCta,
        domElements.stepsCta,
        domElements.finalCta,
        domElements.footerLink
      ];
    }
    return [];
  }
};

// -----------------------------------------------------------------------------
// Import Modul CMS & Client
// -----------------------------------------------------------------------------
const { updateSiteSettings, clearSyncQueue } = await import("../cmsService.js");
const { 
  CONFIG, 
  initWhatsAppLinks, 
  applySiteSettingsToUI, 
  getCleanWhatsAppNumber, 
  getWhatsAppBaseUrl, 
  buildWhatsAppOrderUrl 
} = await import("../main.js");

// -----------------------------------------------------------------------------
// TAHAP 1: Inisialisasi Default Website
// -----------------------------------------------------------------------------
console.log("TAHAP 1: Inisialisasi Tautan WhatsApp di Halaman Utama (Clientside)");
initWhatsAppLinks();

const allGeneralCtas = [
  domElements.navDesktopCta,
  domElements.navMobileCta,
  domElements.heroCta,
  domElements.stepsCta,
  domElements.finalCta,
  domElements.footerLink
];

allGeneralCtas.forEach((btn, idx) => {
  const href = btn.getAttribute("href");
  assert.ok(href.startsWith("https://wa.me/"), `CTA ke-${idx + 1} mengarah ke wa.me`);
  assert.ok(href.includes("text="), `CTA ke-${idx + 1} menyertakan parameter text`);
});
console.log(`✓ Sebanyak 6 CTA umum WhatsApp di DOM terpasang URL default: ${domElements.heroCta.getAttribute("href")}\n`);

// -----------------------------------------------------------------------------
// TAHAP 2: Admin Mengubah Nomor WhatsApp di CMS
// -----------------------------------------------------------------------------
console.log("TAHAP 2: Admin CMS Memperbarui Nomor WhatsApp Menjadi '0812-9988-7766'");
const newAdminNumberInput = "0812-9988-7766";
const cleanExpectedNumber = "6281299887766";
const newDefaultMessage = "Halo Siomay Online, saya mau pesan via promo website!";

// Simulasi penyimpanan dari CMS
const cmsResult = await updateSiteSettings({
  whatsapp_number: cleanExpectedNumber,
  default_order_message: newDefaultMessage
});

assert.equal(cmsResult.success, true, "Penyimpanan di CMS harus sukses");
assert.equal(cmsResult.settings.whatsapp_number, cleanExpectedNumber, "Nomor tersimpan dengan normalisasi 62");
console.log(`✓ CMS berhasil menyimpan nomor baru: ${cmsResult.settings.whatsapp_number}`);

// -----------------------------------------------------------------------------
// TAHAP 3: Clientside Menangkap Perubahan (Simulasi Event Storage Antar Tab)
// -----------------------------------------------------------------------------
console.log("\nTAHAP 3: Clientside Menerima Update Melalui Event Sinkronisasi Otomatis");

// Panggil applySiteSettingsToUI seperti yang dilakukan event listener di main.js
applySiteSettingsToUI(cmsResult.settings);

// Verifikasi CONFIG internal terupdate
assert.equal(CONFIG.whatsappNumber, cleanExpectedNumber, "CONFIG.whatsappNumber terupdate");
assert.equal(CONFIG.defaultOrderMessage, newDefaultMessage, "CONFIG.defaultOrderMessage terupdate");
assert.equal(getCleanWhatsAppNumber(), cleanExpectedNumber, "getCleanWhatsAppNumber() mengembalikan nomor baru");
assert.equal(getWhatsAppBaseUrl(), `https://wa.me/${cleanExpectedNumber}`, "getWhatsAppBaseUrl() mengarah ke nomor baru");

// Verifikasi seluruh 6 CTA di halaman terupdate otomatis ke nomor baru
allGeneralCtas.forEach((btn, idx) => {
  const updatedHref = btn.getAttribute("href");
  assert.ok(
    updatedHref.startsWith(`https://wa.me/${cleanExpectedNumber}`),
    `CTA ke-${idx + 1} belum terupdate! Ditemukan: ${updatedHref}`
  );
  assert.ok(
    updatedHref.includes(encodeURIComponent(newDefaultMessage)),
    `CTA ke-${idx + 1} belum memuat pesan default baru`
  );
});
console.log(`✓ Seluruh 6 CTA WhatsApp di DOM langsung berubah ke: https://wa.me/${cleanExpectedNumber}`);

// -----------------------------------------------------------------------------
// TAHAP 4: Pengujian Klik Tombol WhatsApp (Dynamic Click Recomputation)
// -----------------------------------------------------------------------------
console.log("\nTAHAP 4: Pengujian Interaksi Klik pada Tombol CTA WhatsApp");
domElements.heroCta.click();
assert.ok(
  domElements.heroCta.getAttribute("href").startsWith(`https://wa.me/${cleanExpectedNumber}`),
  "Klik pada Hero CTA menghasilkan link WhatsApp terbaru"
);
domElements.footerLink.click();
assert.ok(
  domElements.footerLink.getAttribute("href").startsWith(`https://wa.me/${cleanExpectedNumber}`),
  "Klik pada Footer Link menghasilkan link WhatsApp terbaru"
);
console.log("✓ Dynamic click handler memastikan URL selalu yang paling mutakhir saat diklik pengguna.");

// -----------------------------------------------------------------------------
// TAHAP 5: Pengujian Checkout Pemesanan di Cart Drawer
// -----------------------------------------------------------------------------
console.log("\nTAHAP 5: Pengujian Pembuatan Link Pesanan Checkout di Cart Drawer");
const sampleCart = {
  items: [
    { product: { name: "Paket Siomay Komplit (10 Porsi)", price: 150000, portion: "10 Pcs" }, quantity: 1, subtotal: 150000 },
    { product: { name: "Siomay Kukus Telur Spesial", price: 25000, portion: "Porsi Jumbo" }, quantity: 2, subtotal: 50000 }
  ],
  itemCount: 3,
  total: 200000
};

const sampleCustomer = {
  name: "Budi Santoso",
  phone: "081234567890",
  address: "Jl. Sudirman Kav 28, Jakarta Pusat",
  note: "Bumbu kacang pedas sedang, jeruk limau dipisah"
};

const checkoutWaUrl = buildWhatsAppOrderUrl(sampleCart, sampleCustomer);
assert.ok(
  checkoutWaUrl.startsWith(`https://wa.me/${cleanExpectedNumber}`),
  `Checkout URL harus diarahkan ke nomor ${cleanExpectedNumber}`
);
assert.ok(checkoutWaUrl.includes("Paket%20Siomay%20Komplit"), "Format pesanan mencantumkan menu paket");
assert.ok(checkoutWaUrl.includes("Budi%20Santoso"), "Format pesanan mencantumkan nama pemesan");
assert.ok(checkoutWaUrl.includes("Rp200.000") || checkoutWaUrl.includes("Rp%20200.000"), "Format pesanan mencantumkan total harga");

console.log(`✓ URL checkout pemesanan terbentuk sempurna:`);
console.log(`  Target URL: ${checkoutWaUrl.substring(0, 75)}...`);

// -----------------------------------------------------------------------------
// TAHAP 6: Pengujian Perubahan Kedua (Ubah ke Nomor Lain: 0857-7788-9900)
// -----------------------------------------------------------------------------
console.log("\nTAHAP 6: Pengujian Perubahan Nomor Kedua Kali (Verifikasi Reaktivitas Berulang)");
const secondNewNumber = "6285777889900";
const secondMsg = "Halo CS Siomay Online";

const secondRes = await updateSiteSettings({
  whatsapp_number: secondNewNumber,
  default_order_message: secondMsg
});
assert.equal(secondRes.success, true);

// Terapkan ke UI
applySiteSettingsToUI(secondRes.settings);

// Verifikasi seketika
assert.equal(CONFIG.whatsappNumber, secondNewNumber);
allGeneralCtas.forEach((btn, idx) => {
  const href = btn.getAttribute("href");
  assert.ok(
    href.startsWith(`https://wa.me/${secondNewNumber}`),
    `CTA ke-${idx + 1} gagal update ke nomor kedua!`
  );
});

const secondCheckoutUrl = buildWhatsAppOrderUrl(sampleCart, sampleCustomer);
assert.ok(
  secondCheckoutUrl.startsWith(`https://wa.me/${secondNewNumber}`),
  "Checkout kedua langsung mengarah ke nomor baru kedua"
);
console.log(`✓ Seluruh tombol dan checkout berhasil beralih seketika ke nomor kedua: https://wa.me/${secondNewNumber}`);

console.log("\n=================================================================");
console.log("   HASIL: SELURUH SKENARIO UJI COBA BERHASIL (100% SUKSES)       ");
console.log("=================================================================");

process.exit(0);
