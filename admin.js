/**
 * SIOMAY ONLINE — COMPLETE ADMIN CMS JAVASCRIPT CONTROLLER
 * 
 * Manages:
 * 1. Owner Authentication (Supabase Auth + Database Owner check)
 * 2. Food Menu CRUD with image upload & availability toggle
 * 3. Homepage Banner & Promotional Video settings
 * 4. WhatsApp Ordering link settings & normalization
 * 5. Customer Reviews Moderation
 * 6. Responsive Sidebar & View Routing
 */

import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import { 
  loginOwner, 
  logoutOwner, 
  getCurrentOwner, 
  fetchAllMenuItems, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem, 
  fetchSiteSettings, 
  updateSiteSettings, 
  uploadMediaFile,
  testSupabaseMenuWriteAccess,
  fetchCustomerOrders,
  updateCustomerOrderStatus,
  deleteCustomerOrder,
  uploadDataUrlToStorage
} from "./cmsService.js";
import { formatReviewDate } from "./reviews.js";

// Global CMS State
let currentOwner = null;
let menuItems = [];
let isSavingMenuItem = false;
let siteSettings = null;
let allOrders = [];
let currentOrderFilter = "all";

// =============================================================================
// INITIALIZATION
// =============================================================================
document.addEventListener("DOMContentLoaded", async () => {
  initAuthHandlers();
  initSidebarNavigation();
  initMenuHandlers();
  initContentHandlers();
  initOperationsHandlers();
  initWhatsAppHandlers();
  initOrdersHandlers();
  initBrandingHandlers();

  // Check existing session
  await checkAuthSession();
});

// =============================================================================
// 1. OWNER AUTHENTICATION LIFECYCLE
// =============================================================================
async function checkAuthSession() {
  const authScreen = document.getElementById("authView");
  const dashboard = document.getElementById("cmsDashboardLayout");
  const emailDisplay = document.getElementById("sidebarUserEmail");
  const dbStatus = document.getElementById("cmsDbStatusIndicator");

  currentOwner = await getCurrentOwner();

  if (currentOwner) {
    if (authScreen) authScreen.style.display = "none";
    if (dashboard) dashboard.style.display = "flex";
    if (emailDisplay) emailDisplay.textContent = currentOwner.email;
    if (dbStatus) {
      if (isSupabaseConfigured && supabase) {
        dbStatus.innerHTML = `<span class="status-dot"></span> Supabase Terhubung`;
        dbStatus.className = "cms-db-status status-connected";
      } else {
        dbStatus.innerHTML = `<span class="status-dot"></span> Mode Buffer Lokal (Offline)`;
        dbStatus.className = "cms-db-status status-offline";
      }
    }
    // Load initial data for all sections
    await loadAllCmsData();
  } else {
    if (authScreen) authScreen.style.display = "flex";
    if (dashboard) dashboard.style.display = "none";
    if (!isSupabaseConfigured || !supabase) {
      showAuthError("Konfigurasi database Supabase belum terhubung. Pastikan environment telah disetup dengan benar.");
    }
  }
}

function initAuthHandlers() {
  const loginForm = document.getElementById("ownerLoginForm");
  const btnLogout = document.getElementById("btnOwnerLogout");
  const emailInput = document.getElementById("ownerEmail");
  const passwordInput = document.getElementById("ownerPassword");
  const btnLogin = document.getElementById("btnOwnerLogin");
  const btnTogglePassword = document.getElementById("btnTogglePassword");
  const rememberMeCheckbox = document.getElementById("rememberMe");
  const linkLostPassword = document.getElementById("linkLostPassword");

  // 1. Password Visibility Eye Toggle
  if (btnTogglePassword && passwordInput) {
    btnTogglePassword.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";

      const iconEye = btnTogglePassword.querySelector(".icon-eye");
      const iconEyeOff = btnTogglePassword.querySelector(".icon-eye-off");

      if (iconEye && iconEyeOff) {
        iconEye.style.display = isPassword ? "none" : "block";
        iconEyeOff.style.display = isPassword ? "block" : "none";
      }

      btnTogglePassword.setAttribute("aria-label", isPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi");
    });
  }

  // 2. Lost Password Handler
  if (linkLostPassword) {
    linkLostPassword.addEventListener("click", (e) => {
      e.preventDefault();
      alert(
        "Lupa Kata Sandi:\n\n" +
        "Akun Admin terdaftar:\n" +
        "• admin / admin@siomayonline.com\n\n" +
        "Kata sandi default: admin123\n\n" +
        "Jika Anda ingin mengubah kata sandi pemilik permanen, silakan kelola langsung melalui Dashboard Supabase Authentication."
      );
    });
  }

  // 3. Form Login Submission
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const identifier = emailInput ? emailInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";

      if (!identifier || !password) {
        showAuthError("Username/Email dan kata sandi wajib diisi.");
        return;
      }

      if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.textContent = "Logging In...";
      }

      hideAuthError();
      const res = await loginOwner(identifier, password);

      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = "Log In";
      }

      if (!res.success) {
        showAuthError(res.error || "Gagal masuk. Periksa kembali username/email dan kata sandi Anda.");
        return;
      }

      currentOwner = res.user;

      // Handle Remember Me persistence
      if (rememberMeCheckbox && rememberMeCheckbox.checked && typeof localStorage !== "undefined") {
        try {
          localStorage.setItem("siomay_persistent_owner", JSON.stringify(currentOwner));
        } catch {}
      }

      await checkAuthSession();
      showToast("Selamat datang di Siomay Admin!", "success");
    });
  }

  // 4. Logout Handler
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      if (confirm("Apakah Anda yakin ingin keluar dari Siomay Admin?")) {
        await logoutOwner();
        currentOwner = null;
        await checkAuthSession();
        showToast("Anda telah keluar dari Siomay Admin.", "info");
      }
    });
  }
}

function showAuthError(msg) {
  const alertEl = document.getElementById("authErrorAlert");
  if (!alertEl) return;
  alertEl.textContent = msg;
  alertEl.style.display = "block";
}

function hideAuthError() {
  const alertEl = document.getElementById("authErrorAlert");
  if (alertEl) alertEl.style.display = "none";
}

// =============================================================================
// 2. SIDEBAR & VIEW ROUTING
// =============================================================================
function initSidebarNavigation() {
  const navItems = document.querySelectorAll(".cms-nav-item");
  const views = document.querySelectorAll(".cms-view");
  const pageTitle = document.getElementById("topbarPageTitle");
  const hamburgerBtn = document.getElementById("btnSidebarOpen");
  const closeSidebarBtn = document.getElementById("btnSidebarClose");
  const sidebar = document.getElementById("cmsSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");

  const viewTitles = {
    viewOverview: "Ringkasan Dashboard",
    viewMenu: "Kelola Menu Makanan",
    viewOrders: "Daftar Pesanan Masuk (Order Inbox)",
    viewWhatsApp: "Pengaturan WhatsApp Toko",
    viewBranding: "Kelola Branding, Logo & Favicon",
    viewContent: "Banner & Video Promosi",
    viewOperations: "Pengaturan Jam Operasional & Lokasi Toko"
  };

  const switchView = (targetViewId) => {
    views.forEach(v => {
      v.style.display = "none";
      v.classList.remove("active");
    });

    const targetView = document.getElementById(targetViewId);
    if (targetView) {
      targetView.style.display = "block";
      targetView.classList.add("active");
    }

    navItems.forEach(item => {
      if (item.getAttribute("data-target-view") === targetViewId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    if (pageTitle && viewTitles[targetViewId]) {
      pageTitle.textContent = viewTitles[targetViewId];
    }

    // Close mobile sidebar
    if (sidebar) sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
  };

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-target-view");
      if (target) switchView(target);
    });
  });

  // Mobile sidebar drawer
  if (hamburgerBtn && sidebar && backdrop) {
    hamburgerBtn.addEventListener("click", () => {
      sidebar.classList.add("open");
      backdrop.classList.add("open");
    });
  }

  if (closeSidebarBtn && sidebar && backdrop) {
    closeSidebarBtn.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("open");
    });
  }

  if (backdrop && sidebar) {
    backdrop.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("open");
    });
  }

  // Quick Shortcuts on Overview
  const btnQuickAdd = document.getElementById("btnQuickAddMenu");
  const btnQuickOrders = document.getElementById("btnQuickViewOrders");
  const btnQuickBranding = document.getElementById("btnQuickBranding");
  const btnQuickWa = document.getElementById("btnQuickWhatsApp");
  const btnRefreshOverview = document.getElementById("btnRefreshOverview");

  if (btnQuickAdd) {
    btnQuickAdd.addEventListener("click", () => {
      switchView("viewMenu");
      openMenuModal();
    });
  }

  if (btnQuickOrders) {
    btnQuickOrders.addEventListener("click", () => {
      switchView("viewOrders");
    });
  }

  if (btnQuickBranding) {
    btnQuickBranding.addEventListener("click", () => {
      switchView("viewBranding");
    });
  }

  if (btnQuickWa) {
    btnQuickWa.addEventListener("click", () => {
      switchView("viewWhatsApp");
      const waInput = document.getElementById("settingWhatsAppNumber");
      if (waInput) {
        setTimeout(() => {
          waInput.focus();
          waInput.select();
        }, 120);
      }
    });
  }

  const cardMetricWa = document.getElementById("cardMetricWhatsApp");
  if (cardMetricWa) {
    cardMetricWa.addEventListener("click", () => {
      switchView("viewWhatsApp");
      const waInput = document.getElementById("settingWhatsAppNumber");
      if (waInput) {
        setTimeout(() => {
          waInput.focus();
          waInput.select();
        }, 120);
      }
    });
  }

  if (btnRefreshOverview) {
    btnRefreshOverview.addEventListener("click", async () => {
      await loadAllCmsData();
      showToast("Data ringkasan berhasil disegarkan.", "info");
    });
  }
}

// =============================================================================
// 3. DATA LOAD ORCHESTRATION
// =============================================================================
async function loadAllCmsData() {
  await Promise.all([
    loadMenuItems(),
    loadSiteSettings(),
    loadCustomerOrders()
  ]);
  updateOverviewMetrics();
}

function updateOverviewMetrics() {
  const metricMenu = document.getElementById("metricTotalMenu");
  const metricWa = document.getElementById("metricWhatsApp");
  const metricOrders = document.getElementById("metricTotalOrders");
  const metricOperational = document.getElementById("metricOperationalHours");
  const sidebarOrdersBadge = document.getElementById("sidebarPendingOrdersBadge");

  if (metricMenu) metricMenu.textContent = menuItems.length;
  if (metricWa && siteSettings) {
    const rawWa = (siteSettings.whatsapp_number || "").replace(/[^0-9]/g, "");
    if (rawWa && rawWa.length >= 10) {
      metricWa.textContent = rawWa.startsWith("62") ? "+" + rawWa : rawWa;
    } else {
      metricWa.textContent = "+62 812-3456-7890";
    }
  }
  if (metricOperational && siteSettings) {
    const area = siteSettings.delivery_area ? ` (${siteSettings.delivery_area})` : "";
    metricOperational.textContent = (siteSettings.operational_hours || "10.00 — 21.00 WIB") + area;
  }

  const totalOrdersCount = allOrders.length;
  const newOrdersCount = allOrders.filter(o => o.status === "baru").length;

  if (metricOrders) metricOrders.textContent = totalOrdersCount;

  if (sidebarOrdersBadge) {
    if (newOrdersCount > 0) {
      sidebarOrdersBadge.textContent = newOrdersCount;
      sidebarOrdersBadge.style.display = "inline-flex";
    } else {
      sidebarOrdersBadge.style.display = "none";
    }
  }
}

// =============================================================================
// 4. FOOD MENU CRUD
// =============================================================================
function initMenuHandlers() {
  const btnAdd = document.getElementById("btnAddNewMenuItem");
  const btnCloseModal = document.getElementById("btnCloseMenuModal");
  const btnCancelModal = document.getElementById("btnCancelMenuModal");
  const overlay = document.getElementById("menuModalOverlay");
  const modal = document.getElementById("menuModal");
  const form = document.getElementById("menuItemForm");

  // Image Upload Controls in Modal
  const fileInput = document.getElementById("menuItemFileInput");
  const btnUpload = document.getElementById("btnUploadMenuImage");
  const urlInput = document.getElementById("menuItemImageUrl");
  const previewImg = document.getElementById("menuItemImagePreview");

  if (btnAdd) btnAdd.addEventListener("click", () => openMenuModal());
  if (btnCloseModal) btnCloseModal.addEventListener("click", () => closeMenuModal());
  if (btnCancelModal) btnCancelModal.addEventListener("click", () => closeMenuModal());
  if (overlay) overlay.addEventListener("click", () => closeMenuModal());

  // Copy Supabase SQL Helper Button
  const btnCopySql = document.getElementById("btnCopySupabaseSql");
  if (btnCopySql) {
    btnCopySql.addEventListener("click", () => {
      const sqlText = `-- SIOMAY ONLINE — ENABLE FULL CMS ACCESS
-- Jalankan skrip ini di Supabase SQL Editor:
DROP POLICY IF EXISTS "Owner can manage menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Public can manage menu items" ON public.menu_items;
CREATE POLICY "Public can manage menu items"
  ON public.menu_items FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owner can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update media" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete media" ON storage.objects;
DROP POLICY IF EXISTS "Allow all access to media" ON storage.objects;
CREATE POLICY "Allow all access to media"
  ON storage.objects FOR ALL
  TO public
  USING (bucket_id = 'media')
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "Owner can update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public can update site settings" ON public.site_settings;
CREATE POLICY "Public can update site settings"
  ON public.site_settings FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.customer_orders (
  id TEXT PRIMARY KEY,
  customer JSONB NOT NULL,
  items JSONB NOT NULL,
  total INTEGER NOT NULL,
  item_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'baru',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage orders" ON public.customer_orders;
CREATE POLICY "Public can manage orders"
  ON public.customer_orders FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);`;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(sqlText).then(() => {
          showToast("Skrip SQL berhasil disalin! Silakan jalankan di Supabase SQL Editor.", "success");
        }).catch(() => {
          prompt("Salin skrip SQL Supabase berikut:", sqlText);
        });
      } else {
        prompt("Salin skrip SQL Supabase berikut:", sqlText);
      }
    });
  }

  // Detect Supabase DB write status dynamically
  testSupabaseMenuWriteAccess().then(hasWriteAccess => {
    const badge = document.getElementById("cmsDbBadge");
    const dbStatus = document.getElementById("cmsDbStatusIndicator");
    if (hasWriteAccess) {
      if (badge) {
        badge.textContent = "Supabase Cloud Database Terhubung";
        badge.style.backgroundColor = "#D1FAE5";
        badge.style.color = "#065F46";
      }
      if (dbStatus) {
        dbStatus.innerHTML = `<span class="status-dot"></span> Supabase Cloud Aktif`;
        dbStatus.className = "cms-db-status status-connected";
      }
    }
  });

  // Upload trigger
  if (btnUpload && fileInput) {
    btnUpload.addEventListener("click", () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (btnUpload) {
        btnUpload.disabled = true;
        btnUpload.innerHTML = `<span>Mengunggah...</span>`;
      }

      const res = await uploadMediaFile(file, "menu");

      if (btnUpload) {
        btnUpload.disabled = false;
        btnUpload.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Pilih Foto Baru</span>
        `;
      }

      if (!res.success) {
        showMenuModalAlert(res.error || "Gagal mengunggah foto.");
        return;
      }

      if (urlInput) urlInput.value = res.url;
      if (previewImg) previewImg.src = res.url;
      showToast(res.isLocal ? "Foto menu berhasil disimpan ke buffer lokal!" : "Foto menu berhasil diunggah ke Storage!", "success");
    });
  }

  if (urlInput && previewImg) {
    urlInput.addEventListener("input", () => {
      if (urlInput.value.trim()) {
        previewImg.src = urlInput.value.trim();
      }
    });
  }

  // Form Save (single event listener on form submit with preventDefault)
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleSaveMenuItem();
    });
  }
}

async function loadMenuItems() {
  const loading = document.getElementById("menuListLoading");
  const empty = document.getElementById("menuListEmpty");
  const grid = document.getElementById("cmsMenuGrid");

  if (loading) loading.style.display = "flex";
  if (empty) empty.style.display = "none";
  if (grid) grid.innerHTML = "";

  const res = await fetchAllMenuItems();

  if (loading) loading.style.display = "none";

  if (!res.success) {
    showToast(`Gagal memuat menu: ${res.error}`, "error");
    return;
  }

  menuItems = res.items || [];

  if (menuItems.length === 0) {
    if (empty) empty.style.display = "block";
    return;
  }

  renderMenuGrid(menuItems);
}

function renderMenuGrid(items) {
  const grid = document.getElementById("cmsMenuGrid");
  if (!grid) return;

  grid.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "cms-menu-card";
    if (!item.is_available) card.classList.add("item-unavailable");

    const priceFormatted = "Rp" + Math.round(item.price).toLocaleString("id-ID");

    card.innerHTML = `
      <div class="menu-card-img-wrap">
        <img src="${item.image_url}" alt="${item.name}" class="menu-thumb" loading="lazy">
        <div class="menu-status-badge ${item.is_available ? 'badge-available' : 'badge-out-of-stock'}">
          ${item.is_available ? 'Tersedia' : 'Stok Habis'}
        </div>
        ${item.is_best_seller ? '<span class="menu-bestseller-tag">Best Seller</span>' : ''}
      </div>
      <div class="menu-card-details">
        <div class="menu-top-row">
          <h3 class="menu-item-title">${item.name}</h3>
          <strong class="menu-item-price">${priceFormatted}</strong>
        </div>
        <p class="menu-item-desc">${item.description}</p>
        <div class="menu-meta-row">
          <span class="meta-portion">${item.portion || "Porsi Mantap"}</span>
          <span class="meta-rating">★ ${item.rating || "4.9"}</span>
          ${item.badge ? `<span class="meta-badge">${item.badge}</span>` : ''}
        </div>
        <div class="menu-actions-row">
          <button type="button" class="btn btn-sm btn-secondary btn-toggle-stock" data-id="${item.id}" data-current="${item.is_available}">
            ${item.is_available ? 'Tandai Habis' : 'Tandai Tersedia'}
          </button>
          <div class="action-buttons-group">
            <button type="button" class="btn btn-sm btn-secondary btn-edit-menu" data-id="${item.id}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Edit</span>
            </button>
            <button type="button" class="btn btn-sm btn-danger btn-delete-menu" data-id="${item.id}" data-name="${item.name}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>Hapus</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind stock toggle
    const toggleBtn = card.querySelector(".btn-toggle-stock");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", async () => {
        const newStatus = !item.is_available;
        const res = await updateMenuItem(item.id, { ...item, is_available: newStatus });
        if (res.success) {
          showToast(`Status menu "${item.name}" berhasil diubah.`, "success");
          await loadMenuItems();
        } else {
          showToast(`Gagal mengubah status: ${res.error}`, "error");
        }
      });
    }

    // Bind edit
    const editBtn = card.querySelector(".btn-edit-menu");
    if (editBtn) {
      editBtn.addEventListener("click", () => openMenuModal(item));
    }

    // Bind delete
    const deleteBtn = card.querySelector(".btn-delete-menu");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (confirm(`Yakin ingin menghapus menu "${item.name}" secara permanen?`)) {
          const res = await deleteMenuItem(item.id);
          if (res.success) {
            showToast(`Menu "${item.name}" berhasil dihapus.`, "success");
            await loadMenuItems();
            updateOverviewMetrics();
          } else {
            showToast(`Gagal menghapus menu: ${res.error}`, "error");
          }
        }
      });
    }

    grid.appendChild(card);
  });
}

function openMenuModal(itemToEdit = null) {
  const modal = document.getElementById("menuModal");
  const overlay = document.getElementById("menuModalOverlay");
  const modalTitle = document.getElementById("menuModalTitle");
  const alertEl = document.getElementById("menuModalAlert");

  const idInput = document.getElementById("editMenuItemId");
  const nameInput = document.getElementById("menuItemName");
  const priceInput = document.getElementById("menuItemPrice");
  const portionInput = document.getElementById("menuItemPortion");
  const descInput = document.getElementById("menuItemDesc");
  const badgeInput = document.getElementById("menuItemBadge");
  const ratingInput = document.getElementById("menuItemRating");
  const urlInput = document.getElementById("menuItemImageUrl");
  const previewImg = document.getElementById("menuItemImagePreview");
  const availableCheck = document.getElementById("menuItemIsAvailable");
  const bestSellerCheck = document.getElementById("menuItemIsBestSeller");

  if (alertEl) alertEl.style.display = "none";

  if (itemToEdit) {
    if (modalTitle) modalTitle.textContent = `Edit Menu: ${itemToEdit.name}`;
    if (idInput) idInput.value = itemToEdit.id;
    if (nameInput) nameInput.value = itemToEdit.name;
    if (priceInput) priceInput.value = itemToEdit.price;
    if (portionInput) portionInput.value = itemToEdit.portion || "Porsi Mantap";
    if (descInput) descInput.value = itemToEdit.description;
    if (badgeInput) badgeInput.value = itemToEdit.badge || "";
    if (ratingInput) ratingInput.value = itemToEdit.rating || 4.9;
    if (urlInput) urlInput.value = itemToEdit.image_url;
    if (previewImg) previewImg.src = itemToEdit.image_url;
    if (availableCheck) availableCheck.checked = itemToEdit.is_available !== false;
    if (bestSellerCheck) bestSellerCheck.checked = Boolean(itemToEdit.is_best_seller);
  } else {
    if (modalTitle) modalTitle.textContent = "Tambah Menu Baru";
    if (idInput) idInput.value = "";
    if (nameInput) nameInput.value = "";
    if (priceInput) priceInput.value = "";
    if (portionInput) portionInput.value = "Porsi Mantap";
    if (descInput) descInput.value = "";
    if (badgeInput) badgeInput.value = "";
    if (ratingInput) ratingInput.value = "4.9";
    if (urlInput) urlInput.value = "/images/menu-original.jpg";
    if (previewImg) previewImg.src = "/images/menu-original.jpg";
    if (availableCheck) availableCheck.checked = true;
    if (bestSellerCheck) bestSellerCheck.checked = false;
  }

  if (modal) modal.classList.add("open");
  if (overlay) overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeMenuModal() {
  const modal = document.getElementById("menuModal");
  const overlay = document.getElementById("menuModalOverlay");
  if (modal) modal.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
  document.body.style.overflow = "";
}

async function handleSaveMenuItem() {
  if (isSavingMenuItem) return;

  const idInput = document.getElementById("editMenuItemId");
  const nameInput = document.getElementById("menuItemName");
  const priceInput = document.getElementById("menuItemPrice");
  const portionInput = document.getElementById("menuItemPortion");
  const descInput = document.getElementById("menuItemDesc");
  const badgeInput = document.getElementById("menuItemBadge");
  const ratingInput = document.getElementById("menuItemRating");
  const urlInput = document.getElementById("menuItemImageUrl");
  const availableCheck = document.getElementById("menuItemIsAvailable");
  const bestSellerCheck = document.getElementById("menuItemIsBestSeller");
  const btnSave = document.getElementById("btnSaveMenuItem");

  const id = idInput ? idInput.value : "";
  const name = nameInput ? nameInput.value.trim() : "";
  const rawPriceText = String(priceInput ? priceInput.value : "").replace(/[^0-9]/g, "");
  const price = parseInt(rawPriceText, 10);
  const description = descInput ? descInput.value.trim() : "";
  const image_url = urlInput ? (urlInput.value.trim() || "/images/menu-original.jpg") : "/images/menu-original.jpg";

  if (!name) {
    showMenuModalAlert("Nama menu tidak boleh kosong.");
    return;
  }
  if (isNaN(price) || price < 0 || rawPriceText === "") {
    showMenuModalAlert("Harga menu harus angka positif (contoh: 25000 atau 25.000).");
    return;
  }
  if (!description) {
    showMenuModalAlert("Deskripsi menu wajib diisi.");
    return;
  }

  isSavingMenuItem = true;
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = "Menyimpan...";
  }

  try {
    const payload = {
      name,
      price,
      description,
      image_url,
      portion: portionInput ? (portionInput.value.trim() || "Porsi Mantap") : "Porsi Mantap",
      badge: badgeInput ? (badgeInput.value.trim() || null) : null,
      rating: ratingInput ? Math.min(5.0, Math.max(1.0, parseFloat(ratingInput.value) || 4.9)) : 4.9,
      is_available: availableCheck ? availableCheck.checked : true,
      is_best_seller: bestSellerCheck ? bestSellerCheck.checked : false
    };

    let res;
    if (id) {
      res = await updateMenuItem(id, payload);
    } else {
      res = await createMenuItem(payload);
    }

    if (!res.success) {
      showMenuModalAlert(res.error || "Gagal menyimpan menu.");
      return;
    }

    closeMenuModal();
    const successMsg = id 
      ? `Menu "${name}" berhasil diperbarui!`
      : (res.isLive 
          ? `Menu "${name}" berhasil ditambahkan ke database Supabase!` 
          : `Menu "${name}" berhasil ditambahkan ke daftar menu!`);
    showToast(successMsg, "success");

    await loadMenuItems();
    updateOverviewMetrics();
  } catch (err) {
    console.error("[CMS Save Menu] Error:", err);
    showMenuModalAlert("Terjadi kendala saat menyimpan: " + (err.message || "Unknown error"));
  } finally {
    isSavingMenuItem = false;
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = "Simpan Menu";
    }
  }
}

function showMenuModalAlert(msg) {
  const alertEl = document.getElementById("menuModalAlert");
  if (!alertEl) return;
  alertEl.textContent = msg;
  alertEl.style.display = "block";
  try {
    alertEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch {}
}

// =============================================================================
// 5. BANNER & PROMOTIONAL CONTENT
// =============================================================================
function initContentHandlers() {
  const form = document.getElementById("heroContentForm");
  const btnUploadImg = document.getElementById("btnUploadHeroImage");
  const fileInputImg = document.getElementById("heroImageFileInput");
  const heroUrlInput = document.getElementById("settingHeroImageUrl");
  const heroPreviewImg = document.getElementById("heroImagePreview");

  const btnUploadVideo = document.getElementById("btnUploadPromoVideo");
  const fileInputVideo = document.getElementById("promoVideoFileInput");
  const videoUrlInput = document.getElementById("settingPromoVideoUrl");
  const videoPreview = document.getElementById("promoVideoPreview");
  const videoContainer = document.getElementById("promoVideoPreviewContainer");
  const btnRemoveVideo = document.getElementById("btnRemovePromoVideo");

  // Hero Image Upload
  if (btnUploadImg && fileInputImg) {
    btnUploadImg.addEventListener("click", () => fileInputImg.click());
  }

  if (fileInputImg) {
    fileInputImg.addEventListener("change", async () => {
      const file = fileInputImg.files?.[0];
      if (!file) return;

      if (btnUploadImg) {
        btnUploadImg.disabled = true;
        btnUploadImg.innerHTML = `<span>Mengunggah...</span>`;
      }

      const res = await uploadMediaFile(file, "banners");

      if (btnUploadImg) {
        btnUploadImg.disabled = false;
        btnUploadImg.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Unggah Foto Baru</span>
        `;
      }

      if (!res.success) {
        showToast(res.error || "Gagal mengunggah foto banner.", "error");
        return;
      }

      if (heroUrlInput) heroUrlInput.value = res.url;
      if (heroPreviewImg) heroPreviewImg.src = res.url;
      showToast(res.isLocal ? "Foto banner berhasil disimpan ke buffer lokal!" : "Foto banner berhasil diunggah ke Storage!", "success");
    });
  }

  if (heroUrlInput && heroPreviewImg) {
    heroUrlInput.addEventListener("input", () => {
      if (heroUrlInput.value.trim()) {
        heroPreviewImg.src = heroUrlInput.value.trim();
      }
    });
  }

  // Promo Video Upload
  if (btnUploadVideo && fileInputVideo) {
    btnUploadVideo.addEventListener("click", () => fileInputVideo.click());
  }

  if (fileInputVideo) {
    fileInputVideo.addEventListener("change", async () => {
      const file = fileInputVideo.files?.[0];
      if (!file) return;

      if (btnUploadVideo) {
        btnUploadVideo.disabled = true;
        btnUploadVideo.innerHTML = `<span>Mengunggah Video...</span>`;
      }

      const res = await uploadMediaFile(file, "videos");

      if (btnUploadVideo) {
        btnUploadVideo.disabled = false;
        btnUploadVideo.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          <span>Unggah Video</span>
        `;
      }

      if (!res.success) {
        showToast(res.error || "Gagal mengunggah video.", "error");
        return;
      }

      if (videoUrlInput) videoUrlInput.value = res.url;
      updateVideoPreview(res.url);
      showToast(res.isLocal ? "Video promosi berhasil disimpan ke buffer lokal!" : "Video promosi berhasil diunggah!", "success");
    });
  }

  if (videoUrlInput) {
    videoUrlInput.addEventListener("input", () => {
      updateVideoPreview(videoUrlInput.value.trim());
    });
  }

  if (btnRemoveVideo) {
    btnRemoveVideo.addEventListener("click", () => {
      if (videoUrlInput) videoUrlInput.value = "";
      updateVideoPreview("");
      showToast("Video promosi dihapus dari form.", "info");
    });
  }

  // Save Settings
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleSaveHeroContent();
    });
  }

  const btnSaveHero = document.getElementById("btnSaveHeroContent");
  if (btnSaveHero) {
    btnSaveHero.addEventListener("click", async (e) => {
      e.preventDefault();
      await handleSaveHeroContent();
    });
  }
}

function updateVideoPreview(url) {
  const videoPreview = document.getElementById("promoVideoPreview");
  const videoContainer = document.getElementById("promoVideoPreviewContainer");
  if (!videoContainer || !videoPreview) return;

  if (url && url.length > 5) {
    videoPreview.src = url;
    videoContainer.style.display = "block";
  } else {
    videoPreview.removeAttribute("src");
    videoContainer.style.display = "none";
  }
}

async function loadSiteSettings() {
  const res = await fetchSiteSettings();
  if (!res.success || !res.settings) return;

  siteSettings = res.settings;

  // Populate Hero Form
  const badgeInput = document.getElementById("settingHeroBadge");
  const ctaTextInput = document.getElementById("settingHeroCtaText");
  const titleInput = document.getElementById("settingHeroTitle");
  const subtitleInput = document.getElementById("settingHeroSubtitle");
  const heroUrlInput = document.getElementById("settingHeroImageUrl");
  const heroPreview = document.getElementById("heroImagePreview");
  const videoUrlInput = document.getElementById("settingPromoVideoUrl");

  if (badgeInput) badgeInput.value = siteSettings.hero_badge || "SIOMAY ONLINE";
  if (ctaTextInput) ctaTextInput.value = siteSettings.hero_cta_text || "Pesan via WhatsApp";
  if (titleInput) titleInput.value = siteSettings.hero_title || "";
  if (subtitleInput) subtitleInput.value = siteSettings.hero_subtitle || "";
  if (heroUrlInput) heroUrlInput.value = siteSettings.hero_image_url || "/images/hero.jpg";
  if (heroPreview) heroPreview.src = siteSettings.hero_image_url || "/images/hero.jpg";

  if (videoUrlInput) videoUrlInput.value = siteSettings.promo_video_url || "";
  updateVideoPreview(siteSettings.promo_video_url);

  // Populate WhatsApp Form
  const waInput = document.getElementById("settingWhatsAppNumber");
  const defaultMsgInput = document.getElementById("settingDefaultOrderMessage");
  if (waInput) waInput.value = siteSettings.whatsapp_number || "628XXXXXXXXXX";
  if (defaultMsgInput) defaultMsgInput.value = siteSettings.default_order_message || "";
  updateWhatsAppLinkPreview();

  // Populate Operations Form (Jam & Lokasi Toko)
  const statusSelect = document.getElementById("settingOperationalStatus");
  const statusLabelInput = document.getElementById("settingStatusLabel");
  const openTimeInput = document.getElementById("settingOpenTime");
  const closeTimeInput = document.getElementById("settingCloseTime");
  const timezoneSelect = document.getElementById("settingTimezone");
  const daysInput = document.getElementById("settingOperationalDays");
  const hoursTextInput = document.getElementById("settingOperationalHoursText");
  const deliveryAreaInput = document.getElementById("settingDeliveryArea");
  const announcementInput = document.getElementById("settingStripAnnouncement");

  if (statusSelect) statusSelect.value = siteSettings.operational_status || "buka";
  if (statusLabelInput) statusLabelInput.value = siteSettings.operational_status_label || "Buka Hari Ini:";
  if (openTimeInput) openTimeInput.value = siteSettings.operational_open_time || "10:00";
  if (closeTimeInput) closeTimeInput.value = siteSettings.operational_close_time || "21:00";
  if (timezoneSelect) timezoneSelect.value = siteSettings.operational_timezone || "WIB";
  if (daysInput) daysInput.value = siteSettings.operational_days || "Setiap Hari";
  if (hoursTextInput) hoursTextInput.value = siteSettings.operational_hours || "10.00 — 21.00 WIB";
  if (deliveryAreaInput) deliveryAreaInput.value = siteSettings.delivery_area || "Klaten & Sekitarnya";
  if (announcementInput) announcementInput.value = siteSettings.strip_announcement || "100% Ikan Tenggiri • Fresh Setiap Hari";

  updateOperationsPreview();

  // Populate Branding Form (Logo & Favicon)
  const logoInput = document.getElementById("settingLogoUrl");
  const faviconInput = document.getElementById("settingFaviconUrl");
  const logoPreview = document.getElementById("currentLogoPreview");
  const faviconPreview = document.getElementById("currentFaviconPreview");
  const sidebarBrandImg = document.querySelector(".cms-sidebar-brand img");

  if (logoInput) logoInput.value = siteSettings.logo_url || "/images/logo.png";
  if (logoPreview) logoPreview.src = siteSettings.logo_url || "/images/logo.png";
  if (sidebarBrandImg && siteSettings.logo_url) sidebarBrandImg.src = siteSettings.logo_url;

  if (faviconInput) faviconInput.value = siteSettings.favicon_url || "/favicon.png";
  if (faviconPreview) faviconPreview.src = siteSettings.favicon_url || "/favicon.png";

  const adminFavicon = document.querySelector("link[rel*='icon']");
  if (adminFavicon && siteSettings.favicon_url) adminFavicon.href = siteSettings.favicon_url;
}

async function handleSaveHeroContent() {
  const badgeInput = document.getElementById("settingHeroBadge");
  const ctaTextInput = document.getElementById("settingHeroCtaText");
  const titleInput = document.getElementById("settingHeroTitle");
  const subtitleInput = document.getElementById("settingHeroSubtitle");
  const heroUrlInput = document.getElementById("settingHeroImageUrl");
  const videoUrlInput = document.getElementById("settingPromoVideoUrl");
  const btnSave = document.getElementById("btnSaveHeroContent");

  const title = titleInput ? titleInput.value.trim() : "";
  if (!title) {
    showToast("Headline hero banner wajib diisi.", "error");
    return;
  }

  const payload = {
    ...(siteSettings || {}),
    hero_badge: badgeInput ? badgeInput.value.trim() : "SIOMAY ONLINE",
    hero_cta_text: ctaTextInput ? ctaTextInput.value.trim() : "Pesan via WhatsApp",
    hero_title: title,
    hero_subtitle: subtitleInput ? subtitleInput.value.trim() : "",
    hero_image_url: heroUrlInput ? heroUrlInput.value.trim() : "/images/hero.jpg",
    promo_video_url: videoUrlInput ? videoUrlInput.value.trim() : null
  };

  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = "Menyimpan...";
  }

  const res = await updateSiteSettings(payload);

  if (btnSave) {
    btnSave.disabled = false;
    btnSave.textContent = "Simpan Pengaturan Konten";
  }

  if (!res.success) {
    showToast(`Gagal menyimpan: ${res.error}`, "error");
    return;
  }

  siteSettings = res.settings;
  showToast("Pengaturan banner & video berhasil disimpan!", "success");
}

// =============================================================================
// 6. OPERATIONAL HOURS & STORE LOCATION SETTINGS
// =============================================================================
function initOperationsHandlers() {
  const form = document.getElementById("operationsSettingsForm");
  const btnSave = document.getElementById("btnSaveOperations");
  const btnAutoHours = document.getElementById("btnAutoGenerateHours");

  const statusSelect = document.getElementById("settingOperationalStatus");
  const statusLabelInput = document.getElementById("settingStatusLabel");
  const openTimeInput = document.getElementById("settingOpenTime");
  const closeTimeInput = document.getElementById("settingCloseTime");
  const timezoneSelect = document.getElementById("settingTimezone");
  const daysInput = document.getElementById("settingOperationalDays");
  const hoursTextInput = document.getElementById("settingOperationalHoursText");
  const deliveryAreaInput = document.getElementById("settingDeliveryArea");
  const announcementInput = document.getElementById("settingStripAnnouncement");

  // Real-time preview update on any input change
  const inputsToListen = [
    statusSelect, statusLabelInput, openTimeInput, closeTimeInput, 
    timezoneSelect, daysInput, hoursTextInput, deliveryAreaInput, announcementInput
  ];
  inputsToListen.forEach(input => {
    if (input) {
      input.addEventListener("input", updateOperationsPreview);
      input.addEventListener("change", updateOperationsPreview);
    }
  });

  // Auto-generate hours text from open & close time
  if (btnAutoHours) {
    btnAutoHours.addEventListener("click", () => {
      const open = (openTimeInput?.value || "10:00").replace(":", ".");
      const close = (closeTimeInput?.value || "21:00").replace(":", ".");
      const tz = timezoneSelect?.value || "WIB";
      const generated = `${open} — ${close} ${tz}`;
      if (hoursTextInput) {
        hoursTextInput.value = generated;
        updateOperationsPreview();
        showToast(`Teks jam operasional dibuat: "${generated}"`, "info");
      }
    });
  }

  // Handle status select auto-updating label if default
  if (statusSelect) {
    statusSelect.addEventListener("change", () => {
      if (statusSelect.value === "tutup") {
        if (statusLabelInput && (statusLabelInput.value === "Buka Hari Ini:" || statusLabelInput.value === "Buka Sekarang:")) {
          statusLabelInput.value = "Tutup Sementara:";
        }
      } else if (statusSelect.value === "istirahat") {
        if (statusLabelInput && (statusLabelInput.value === "Buka Hari Ini:" || statusLabelInput.value === "Tutup Sementara:")) {
          statusLabelInput.value = "Istirahat:";
        }
      } else if (statusSelect.value === "buka") {
        if (statusLabelInput && (statusLabelInput.value === "Tutup Sementara:" || statusLabelInput.value === "Istirahat:")) {
          statusLabelInput.value = "Buka Hari Ini:";
        }
      }
      updateOperationsPreview();
    });
  }

  // Save Operations Settings
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleSaveOperations();
    });
  }

  if (btnSave) {
    btnSave.addEventListener("click", async (e) => {
      e.preventDefault();
      await handleSaveOperations();
    });
  }
}

function updateOperationsPreview() {
  const statusSelect = document.getElementById("settingOperationalStatus");
  const statusLabelInput = document.getElementById("settingStatusLabel");
  const hoursTextInput = document.getElementById("settingOperationalHoursText");
  const deliveryAreaInput = document.getElementById("settingDeliveryArea");
  const announcementInput = document.getElementById("settingStripAnnouncement");

  const previewDot = document.getElementById("previewStripDot");
  const previewLabel = document.getElementById("previewStripStatusLabel");
  const previewHours = document.getElementById("previewStripHours");
  const previewLocation = document.getElementById("previewStripLocation");
  const previewAnnouncement = document.getElementById("previewStripAnnouncement");

  const status = statusSelect ? statusSelect.value : "buka";
  const label = statusLabelInput ? (statusLabelInput.value.trim() || "Buka Hari Ini:") : "Buka Hari Ini:";
  const hours = hoursTextInput ? (hoursTextInput.value.trim() || "10.00 — 21.00 WIB") : "10.00 — 21.00 WIB";
  const location = deliveryAreaInput ? (deliveryAreaInput.value.trim() || "Klaten & Sekitarnya") : "Klaten & Sekitarnya";
  const announcement = announcementInput ? (announcementInput.value.trim() || "100% Ikan Tenggiri • Fresh Setiap Hari") : "100% Ikan Tenggiri • Fresh Setiap Hari";

  if (previewDot) {
    previewDot.classList.remove("status-closed", "status-paused");
    if (status === "tutup") previewDot.classList.add("status-closed");
    else if (status === "istirahat") previewDot.classList.add("status-paused");
  }

  if (previewLabel) previewLabel.textContent = label;
  if (previewHours) previewHours.textContent = hours;
  if (previewLocation) previewLocation.textContent = location;
  if (previewAnnouncement) previewAnnouncement.textContent = announcement;
}

async function handleSaveOperations() {
  const btnSave = document.getElementById("btnSaveOperations");
  const statusSelect = document.getElementById("settingOperationalStatus");
  const statusLabelInput = document.getElementById("settingStatusLabel");
  const openTimeInput = document.getElementById("settingOpenTime");
  const closeTimeInput = document.getElementById("settingCloseTime");
  const timezoneSelect = document.getElementById("settingTimezone");
  const daysInput = document.getElementById("settingOperationalDays");
  const hoursTextInput = document.getElementById("settingOperationalHoursText");
  const deliveryAreaInput = document.getElementById("settingDeliveryArea");
  const announcementInput = document.getElementById("settingStripAnnouncement");

  const operational_status = statusSelect ? statusSelect.value : "buka";
  const operational_status_label = statusLabelInput ? statusLabelInput.value.trim() : "Buka Hari Ini:";
  const operational_open_time = openTimeInput ? openTimeInput.value : "10:00";
  const operational_close_time = closeTimeInput ? closeTimeInput.value : "21:00";
  const operational_timezone = timezoneSelect ? timezoneSelect.value : "WIB";
  const operational_days = daysInput ? daysInput.value.trim() : "Setiap Hari";
  const operational_hours = hoursTextInput ? hoursTextInput.value.trim() : "10.00 — 21.00 WIB";
  const delivery_area = deliveryAreaInput ? deliveryAreaInput.value.trim() : "Klaten & Sekitarnya";
  const strip_announcement = announcementInput ? announcementInput.value.trim() : "100% Ikan Tenggiri • Fresh Setiap Hari";

  if (!delivery_area) {
    showToast("Wilayah jangkauan pengiriman (delivery area) wajib diisi.", "error");
    return;
  }
  if (!operational_hours) {
    showToast("Teks jam operasional wajib diisi.", "error");
    return;
  }

  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = "Menyimpan Peraturan...";
  }

  try {
    const res = await updateSiteSettings({
      operational_status,
      operational_status_label,
      operational_open_time,
      operational_close_time,
      operational_timezone,
      operational_days,
      operational_hours,
      delivery_area,
      strip_announcement
    });

    if (res.success) {
      siteSettings = res.settings;
      updateOverviewMetrics();
      showToast("Pengaturan jam operasional dan lokasi toko berhasil diperbarui!", "success");
    } else {
      showToast("Gagal menyimpan pengaturan: " + (res.error || "Terjadi kesalahan"), "error");
    }
  } catch (err) {
    showToast("Terjadi kendala saat menyimpan: " + err.message, "error");
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = "Simpan Pengaturan Jam & Lokasi";
    }
  }
}

// =============================================================================
// 7. WHATSAPP SETTINGS
// =============================================================================
let isSavingWhatsApp = false;

function initWhatsAppHandlers() {
  const form = document.getElementById("whatsAppSettingsForm");
  const waInput = document.getElementById("settingWhatsAppNumber");
  const msgInput = document.getElementById("settingDefaultOrderMessage");

  if (waInput) {
    waInput.addEventListener("input", () => updateWhatsAppLinkPreview());
  }

  if (msgInput) {
    msgInput.addEventListener("input", () => updateWhatsAppLinkPreview());
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleSaveWhatsApp();
    });
  }

  const btnSaveWa = document.getElementById("btnSaveWhatsApp");
  if (btnSaveWa) {
    btnSaveWa.addEventListener("click", async (e) => {
      e.preventDefault();
      await handleSaveWhatsApp();
    });
  }
}

function updateWhatsAppLinkPreview() {
  const waInput = document.getElementById("settingWhatsAppNumber");
  const msgInput = document.getElementById("settingDefaultOrderMessage");
  const previewEl = document.getElementById("previewWaLinkDisplay");
  const testBtn = document.getElementById("btnTestWaLink");

  let rawNumber = waInput ? waInput.value.replace(/[^0-9]/g, "") : "";
  if (rawNumber.startsWith("0")) {
    rawNumber = "62" + rawNumber.substring(1);
  } else if (rawNumber.startsWith("8")) {
    rawNumber = "62" + rawNumber;
  }

  const msg = msgInput ? msgInput.value.trim() : "";
  const fullUrl = `https://wa.me/${rawNumber}?text=${encodeURIComponent(msg)}`;

  if (previewEl) previewEl.textContent = fullUrl;
  if (testBtn) testBtn.href = fullUrl;
}

function showWaAlert(message, type = "success") {
  const alertEl = document.getElementById("waSettingsAlert");
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = `cms-alert cms-alert-${type}`;
  alertEl.style.display = "block";
  setTimeout(() => {
    alertEl.style.display = "none";
  }, 5000);
}

async function handleSaveWhatsApp() {
  if (isSavingWhatsApp) return;

  const waInput = document.getElementById("settingWhatsAppNumber");
  const msgInput = document.getElementById("settingDefaultOrderMessage");
  const btnSave = document.getElementById("btnSaveWhatsApp");

  let rawNumber = waInput ? waInput.value.replace(/[^0-9]/g, "") : "";
  if (rawNumber.startsWith("0")) {
    rawNumber = "62" + rawNumber.substring(1);
  } else if (rawNumber.startsWith("8")) {
    rawNumber = "62" + rawNumber;
  }

  if (!rawNumber || rawNumber.length < 8) {
    showWaAlert("Nomor WhatsApp belum valid (minimal 8 angka).", "error");
    showToast("Nomor WhatsApp belum valid (minimal 8 angka).", "error");
    if (waInput) waInput.focus();
    return;
  }

  isSavingWhatsApp = true;

  const payload = {
    ...(siteSettings || {}),
    whatsapp_number: rawNumber,
    default_order_message: msgInput ? msgInput.value.trim() : ""
  };

  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = "Menyimpan...";
  }

  try {
    const res = await updateSiteSettings(payload);

    if (!res.success) {
      showWaAlert(`Gagal menyimpan: ${res.error || "Terjadi kendala"}`, "error");
      showToast(`Gagal menyimpan: ${res.error || "Terjadi kendala"}`, "error");
      return;
    }

    siteSettings = res.settings;
    if (waInput) waInput.value = siteSettings.whatsapp_number;
    updateWhatsAppLinkPreview();
    updateOverviewMetrics();
    showWaAlert("✓ Nomor WhatsApp toko berhasil disimpan dan diperbarui di seluruh website!", "success");
    showToast("Nomor WhatsApp toko berhasil diperbarui!", "success");
  } catch (err) {
    console.error("[CMS WhatsApp] Error saving WhatsApp:", err);
    showWaAlert("Terjadi kendala saat menyimpan: " + (err.message || err), "error");
    showToast("Terjadi kendala: " + (err.message || err), "error");
  } finally {
    isSavingWhatsApp = false;
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = "Simpan Nomor WhatsApp";
    }
  }
}

// =============================================================================
// 8. BRANDING, LOGO & FAVICON SETTINGS
// =============================================================================
function initBrandingHandlers() {
  const btnChooseLogo = document.getElementById("btnChooseBrandLogo");
  const inputLogo = document.getElementById("inputBrandLogo");
  const btnResetLogo = document.getElementById("btnResetBrandLogo");
  const logoUrlInput = document.getElementById("settingLogoUrl");
  const logoPreview = document.getElementById("currentLogoPreview");

  const btnChooseFavicon = document.getElementById("btnChooseBrandFavicon");
  const inputFavicon = document.getElementById("inputBrandFavicon");
  const btnResetFavicon = document.getElementById("btnResetBrandFavicon");
  const faviconUrlInput = document.getElementById("settingFaviconUrl");
  const faviconPreview = document.getElementById("currentFaviconPreview");

  const btnSaveTop = document.getElementById("btnSaveBranding");
  const btnSaveBottom = document.getElementById("btnSaveBrandingBottom");

  // Logo upload
  if (btnChooseLogo && inputLogo) {
    btnChooseLogo.addEventListener("click", () => inputLogo.click());
  }

  if (inputLogo) {
    inputLogo.addEventListener("change", async () => {
      const file = inputLogo.files?.[0];
      if (!file) return;

      if (btnChooseLogo) {
        btnChooseLogo.disabled = true;
        btnChooseLogo.innerHTML = "<span>Mengunggah Logo...</span>";
      }

      const res = await uploadMediaFile(file, "branding");

      if (btnChooseLogo) {
        btnChooseLogo.disabled = false;
        btnChooseLogo.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Pilih Logo Baru...</span>
        `;
      }

      if (!res.success) {
        showToast(res.error || "Gagal mengunggah logo.", "error");
        return;
      }

      if (logoUrlInput) logoUrlInput.value = res.url;
      if (logoPreview) logoPreview.src = res.url;
      showToast(res.isLocal ? "Logo baru disimpan ke buffer lokal!" : "Logo baru berhasil diunggah!", "success");
    });
  }

  if (btnResetLogo) {
    btnResetLogo.addEventListener("click", () => {
      if (logoUrlInput) logoUrlInput.value = "/images/logo.png";
      if (logoPreview) logoPreview.src = "/images/logo.png";
      showToast("Logo direset ke logo bawaan (klik Simpan untuk menerapkan).", "info");
    });
  }

  // Favicon upload
  if (btnChooseFavicon && inputFavicon) {
    btnChooseFavicon.addEventListener("click", () => inputFavicon.click());
  }

  if (inputFavicon) {
    inputFavicon.addEventListener("change", async () => {
      const file = inputFavicon.files?.[0];
      if (!file) return;

      if (btnChooseFavicon) {
        btnChooseFavicon.disabled = true;
        btnChooseFavicon.innerHTML = "<span>Mengunggah Favicon...</span>";
      }

      const res = await uploadMediaFile(file, "branding");

      if (btnChooseFavicon) {
        btnChooseFavicon.disabled = false;
        btnChooseFavicon.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Pilih Favicon Baru...</span>
        `;
      }

      if (!res.success) {
        showToast(res.error || "Gagal mengunggah favicon.", "error");
        return;
      }

      if (faviconUrlInput) faviconUrlInput.value = res.url;
      if (faviconPreview) faviconPreview.src = res.url;
      showToast(res.isLocal ? "Favicon disimpan ke buffer lokal!" : "Favicon berhasil diunggah!", "success");
    });
  }

  if (btnResetFavicon) {
    btnResetFavicon.addEventListener("click", () => {
      if (faviconUrlInput) faviconUrlInput.value = "/favicon.png";
      if (faviconPreview) faviconPreview.src = "/favicon.png";
      showToast("Favicon direset ke bawaan (klik Simpan untuk menerapkan).", "info");
    });
  }

  // Save branding action
  const handleSaveBranding = async () => {
    let logo_url = logoUrlInput?.value.trim() || "/images/logo.png";
    let favicon_url = faviconUrlInput?.value.trim() || "/favicon.png";

    const btns = [btnSaveTop, btnSaveBottom].filter(Boolean);
    btns.forEach(b => {
      b.disabled = true;
      b.textContent = "Menyimpan Branding...";
    });

    try {
      // If image is a generated Base64 Data URL, try uploading to Storage CDN
      if (logo_url.startsWith("data:image/")) {
        const up = await uploadDataUrlToStorage(logo_url, "branding", "ai-logo.png");
        if (up.success && up.url) {
          logo_url = up.url;
          if (logoUrlInput) logoUrlInput.value = logo_url;
        }
      }

      if (favicon_url.startsWith("data:image/")) {
        const up = await uploadDataUrlToStorage(favicon_url, "branding", "ai-favicon.png");
        if (up.success && up.url) {
          favicon_url = up.url;
          if (faviconUrlInput) faviconUrlInput.value = favicon_url;
        }
      }

      const res = await updateSiteSettings({
        logo_url,
        favicon_url
      });

      if (res.success) {
        siteSettings = res.settings;
        showToast("Pengaturan Logo & Favicon berhasil disimpan ke Supabase!", "success");
        // Also update sidebar logo if present
        const sidebarBrandImg = document.querySelector(".cms-sidebar-brand img");
        if (sidebarBrandImg) sidebarBrandImg.src = logo_url;
        const adminFavicon = document.querySelector("link[rel*='icon']");
        if (adminFavicon) adminFavicon.href = favicon_url;
      } else {
        showToast("Gagal menyimpan branding: " + (res.error || "Terjadi kesalahan"), "error");
      }
    } catch (err) {
      showToast("Terjadi kendala saat menyimpan: " + err.message, "error");
    } finally {
      btns.forEach(b => {
        b.disabled = false;
        b.textContent = "Simpan Perubahan Branding";
      });
    }
  };

  if (btnSaveTop) btnSaveTop.addEventListener("click", handleSaveBranding);
  if (btnSaveBottom) btnSaveBottom.addEventListener("click", handleSaveBranding);

  // Initialize AI Studio for Background Removal
  initAiStudioHandlers();
}

// =============================================================================
// 9. AI STUDIO — SMART BACKGROUND REMOVER (REMOVE BG)
// =============================================================================
let currentAiSourceImg = null;
let processedAiCanvas = null;
let processedAiDataUrl = null;
let aiDebounceTimer = null;

function initAiStudioHandlers() {
  const modal = document.getElementById("aiStudioModal");
  const overlay = document.getElementById("aiStudioModalOverlay");
  const btnClose = document.getElementById("btnCloseAiStudioModal");
  const btnCancel = document.getElementById("btnCancelAiStudio");

  // Open triggers
  const btnLaunchBanner = document.getElementById("btnLaunchAiStudioBanner");
  const btnOpenLogo = document.getElementById("btnOpenAiStudioLogo");
  const btnOpenFavicon = document.getElementById("btnOpenAiStudioFavicon");

  // File loading
  const fileInput = document.getElementById("aiStudioFileInput");
  const btnUpload = document.getElementById("btnAiStudioUploadNew");
  const btnLoadLogo = document.getElementById("btnAiStudioLoadLogo");
  const btnLoadFavicon = document.getElementById("btnAiStudioLoadFavicon");

  // Sliders & Controls
  const sensitivityRange = document.getElementById("aiSensitivityRange");
  const sensitivityVal = document.getElementById("aiSensitivityVal");
  const featherRange = document.getElementById("aiFeatherRange");
  const featherVal = document.getElementById("aiFeatherVal");
  const bgModeSelect = document.getElementById("aiBgModeSelect");

  // Approval buttons
  const btnApproveLogo = document.getElementById("btnApproveAiLogo");
  const btnApproveFavicon = document.getElementById("btnApproveAiFavicon");
  const btnDownloadPng = document.getElementById("btnDownloadAiResult");

  const openModal = (initialSourceUrl = null) => {
    if (modal) {
      modal.style.display = "flex";
      modal.classList.add("open");
    }
    if (overlay) {
      overlay.style.display = "block";
      overlay.classList.add("open");
    }
    document.body.style.overflow = "hidden";
    resetAiStudioState();

    const targetUrl = initialSourceUrl || document.getElementById("settingLogoUrl")?.value || "/images/logo.png";
    if (targetUrl) {
      loadSourceImage(targetUrl);
    }
  };

  const closeModal = () => {
    if (modal) {
      modal.classList.remove("open");
      modal.style.display = "none";
    }
    if (overlay) {
      overlay.classList.remove("open");
      overlay.style.display = "none";
    }
    document.body.style.overflow = "";
  };

  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);
  if (overlay) overlay.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.classList.contains("open")) {
      closeModal();
    }
  });

  if (btnLaunchBanner) {
    btnLaunchBanner.addEventListener("click", () => openModal(document.getElementById("settingLogoUrl")?.value));
  }
  if (btnOpenLogo) {
    btnOpenLogo.addEventListener("click", () => openModal(document.getElementById("settingLogoUrl")?.value));
  }
  if (btnOpenFavicon) {
    btnOpenFavicon.addEventListener("click", () => openModal(document.getElementById("settingFaviconUrl")?.value));
  }

  // Upload trigger
  if (btnUpload && fileInput) {
    btnUpload.addEventListener("click", () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => loadSourceImage(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  if (btnLoadLogo) {
    btnLoadLogo.addEventListener("click", () => {
      const url = document.getElementById("settingLogoUrl")?.value || "/images/logo.png";
      loadSourceImage(url);
    });
  }

  if (btnLoadFavicon) {
    btnLoadFavicon.addEventListener("click", () => {
      const url = document.getElementById("settingFaviconUrl")?.value || "/favicon.png";
      loadSourceImage(url);
    });
  }

  // Drag and drop image onto preview zones
  const dropZones = [document.getElementById("aiResultWrapper"), document.querySelector(".original-wrapper")].filter(Boolean);
  dropZones.forEach(zone => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.style.borderColor = "#de4a1d";
    });
    zone.addEventListener("dragleave", () => {
      zone.style.borderColor = "";
    });
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.style.borderColor = "";
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => loadSourceImage(ev.target.result);
        reader.readAsDataURL(file);
      }
    });
  });

  // Sliders with debounced execution
  if (sensitivityRange) {
    sensitivityRange.addEventListener("input", (e) => {
      if (sensitivityVal) sensitivityVal.textContent = e.target.value + "%";
      scheduleAiExecution();
    });
  }

  if (featherRange) {
    featherRange.addEventListener("input", (e) => {
      if (featherVal) featherVal.textContent = e.target.value + " px";
      scheduleAiExecution();
    });
  }

  if (bgModeSelect) {
    bgModeSelect.addEventListener("change", () => {
      scheduleAiExecution();
    });
  }

  function scheduleAiExecution() {
    clearTimeout(aiDebounceTimer);
    aiDebounceTimer = setTimeout(() => {
      if (currentAiSourceImg) executeAiBackgroundRemoval();
    }, 120);
  }

  function resetAiStudioState() {
    processedAiCanvas = null;
    processedAiDataUrl = null;
    const badge = document.getElementById("aiStudioApprovalBadge");
    if (badge) {
      badge.textContent = "Menunggu Persetujuan";
      badge.style.background = "#FEF3C7";
      badge.style.color = "#92400E";
    }
    if (btnApproveLogo) btnApproveLogo.disabled = true;
    if (btnApproveFavicon) btnApproveFavicon.disabled = true;
    if (btnDownloadPng) btnDownloadPng.disabled = true;
  }

  async function loadSourceImage(src) {
    const originalImg = document.getElementById("aiStudioOriginalPreview");
    const emptyOriginal = document.getElementById("aiStudioOriginalEmpty");
    const dimLabel = document.getElementById("aiOriginalDimensions");
    const processingEl = document.getElementById("aiStudioProcessing");

    if (processingEl) processingEl.style.display = "flex";

    try {
      let finalSrc = src;

      // If remote image (http/https), fetch as blob & convert to Data URL to avoid canvas CORS tainting
      if (src && (src.startsWith("http://") || src.startsWith("https://"))) {
        try {
          const resp = await fetch(src, { mode: "cors" });
          if (resp.ok) {
            const blob = await resp.blob();
            finalSrc = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          }
        } catch (fetchErr) {
          console.warn("[AI Studio] Fetch remote image fallback notice:", fetchErr);
        }
      }

      const img = new Image();
      if (finalSrc.startsWith("http://") || finalSrc.startsWith("https://")) {
        img.crossOrigin = "anonymous";
      }

      img.onload = () => {
        currentAiSourceImg = img;
        if (originalImg) {
          originalImg.src = finalSrc;
          originalImg.style.display = "block";
        }
        if (emptyOriginal) emptyOriginal.style.display = "none";
        if (dimLabel) dimLabel.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;

        resetAiStudioState();
        executeAiBackgroundRemoval();
      };

      img.onerror = () => {
        if (processingEl) processingEl.style.display = "none";
        showToast("Gagal memuat gambar. Silakan gunakan tombol 'Pilih Gambar dari Komputer' untuk mengunggah file langsung.", "error");
      };

      img.src = finalSrc;
    } catch (err) {
      if (processingEl) processingEl.style.display = "none";
      showToast("Kendala memuat gambar: " + err.message, "error");
    }
  }

  function executeAiBackgroundRemoval() {
    if (!currentAiSourceImg) return;

    const processingEl = document.getElementById("aiStudioProcessing");
    const resultCanvas = document.getElementById("aiStudioResultCanvas");
    const emptyResult = document.getElementById("aiStudioResultEmpty");
    const badge = document.getElementById("aiStudioApprovalBadge");

    if (processingEl) processingEl.style.display = "flex";

    // Small delay to allow UI spinner render
    setTimeout(() => {
      try {
        const tolerance = parseInt(sensitivityRange?.value || "32", 10);
        const feather = parseInt(featherRange?.value || "2", 10);
        const mode = bgModeSelect?.value || "auto";

        const canvas = document.createElement("canvas");
        const maxDim = 1000;
        let w = currentAiSourceImg.naturalWidth || currentAiSourceImg.width || 400;
        let h = currentAiSourceImg.naturalHeight || currentAiSourceImg.height || 400;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(currentAiSourceImg, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;

        // Background color samples
        let bgSamples = [];
        if (mode === "white") {
          bgSamples = [{ r: 255, g: 255, b: 255 }];
        } else if (mode === "black") {
          bgSamples = [{ r: 0, g: 0, b: 0 }];
        } else {
          // Auto sample corner & boundary pixels
          const coords = [
            [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
            [Math.floor(w / 2), 0], [0, Math.floor(h / 2)],
            [w - 1, Math.floor(h / 2)], [Math.floor(w / 2), h - 1],
            [Math.floor(w / 4), 0], [Math.floor((3 * w) / 4), 0]
          ];
          coords.forEach(([cx, cy]) => {
            const idx = (cy * w + cx) * 4;
            bgSamples.push({ r: d[idx], g: d[idx + 1], b: d[idx + 2] });
          });
        }

        const thresholdDist = (tolerance / 100) * 280;
        const featherDist = Math.max(8, thresholdDist * (feather * 0.18));

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const a = d[i + 3];

          if (a === 0) continue;

          let minDist = Infinity;
          for (let s = 0; s < bgSamples.length; s++) {
            const dr = r - bgSamples[s].r;
            const dg = g - bgSamples[s].g;
            const db = b - bgSamples[s].b;
            const dist = Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11);
            if (dist < minDist) minDist = dist;
          }

          if (minDist < thresholdDist - featherDist) {
            d[i + 3] = 0;
          } else if (minDist < thresholdDist) {
            const factor = (minDist - (thresholdDist - featherDist)) / featherDist;
            d[i + 3] = Math.round(a * Math.min(1, Math.max(0, factor)));
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Update preview canvas in DOM
        if (resultCanvas) {
          resultCanvas.width = w;
          resultCanvas.height = h;
          const rCtx = resultCanvas.getContext("2d");
          rCtx.clearRect(0, 0, w, h);
          rCtx.drawImage(canvas, 0, 0);
          resultCanvas.style.display = "block";
        }

        if (emptyResult) emptyResult.style.display = "none";

        processedAiCanvas = canvas;
        processedAiDataUrl = canvas.toDataURL("image/png");

        if (badge) {
          badge.textContent = "Siap Disetujui (Draft)";
          badge.style.background = "#DCFCE7";
          badge.style.color = "#15803D";
        }

        if (btnApproveLogo) btnApproveLogo.disabled = false;
        if (btnApproveFavicon) btnApproveFavicon.disabled = false;
        if (btnDownloadPng) btnDownloadPng.disabled = false;
      } catch (err) {
        console.error("[AI Studio] Error during processing:", err);
        showToast("Kendala pemrosesan AI: " + err.message, "error");
      } finally {
        if (processingEl) processingEl.style.display = "none";
      }
    }, 40);
  }

  // Persetujuan 1: Setujui & Pasang Sebagai Logo Website
  if (btnApproveLogo) {
    btnApproveLogo.addEventListener("click", () => {
      if (!processedAiDataUrl) return;

      const logoUrlInput = document.getElementById("settingLogoUrl");
      const logoPreview = document.getElementById("currentLogoPreview");

      if (logoUrlInput) logoUrlInput.value = processedAiDataUrl;
      if (logoPreview) logoPreview.src = processedAiDataUrl;

      closeModal();
      showToast("Hasil AI disetujui untuk Logo Website! Klik 'Simpan Perubahan Branding' untuk menerapkan ke web.", "success");
    });
  }

  // Persetujuan 2: Setujui & Pasang Sebagai Favicon
  if (btnApproveFavicon) {
    btnApproveFavicon.addEventListener("click", () => {
      if (!processedAiCanvas) return;

      // Crop and scale to square 1:1 favicon (e.g. 128x128)
      const sqCanvas = document.createElement("canvas");
      sqCanvas.width = 128;
      sqCanvas.height = 128;
      const sqCtx = sqCanvas.getContext("2d");

      const sw = processedAiCanvas.width;
      const sh = processedAiCanvas.height;
      const size = Math.min(sw, sh);
      const sx = (sw - size) / 2;
      const sy = (sh - size) / 2;

      sqCtx.clearRect(0, 0, 128, 128);
      sqCtx.drawImage(processedAiCanvas, sx, sy, size, size, 0, 0, 128, 128);

      const faviconDataUrl = sqCanvas.toDataURL("image/png");

      const faviconUrlInput = document.getElementById("settingFaviconUrl");
      const faviconPreview = document.getElementById("currentFaviconPreview");

      if (faviconUrlInput) faviconUrlInput.value = faviconDataUrl;
      if (faviconPreview) faviconPreview.src = faviconDataUrl;

      // Update admin browser tab favicon live
      const adminFavicon = document.querySelector("link[rel*='icon']");
      if (adminFavicon) adminFavicon.href = faviconDataUrl;

      closeModal();
      showToast("Hasil AI disetujui untuk Favicon Browser! Klik 'Simpan Perubahan Branding' untuk menerapkan.", "success");
    });
  }

  // Unduh PNG Transparan
  if (btnDownloadPng) {
    btnDownloadPng.addEventListener("click", () => {
      if (!processedAiDataUrl) return;
      const link = document.createElement("a");
      link.href = processedAiDataUrl;
      link.download = `logo-transparan-ai-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("File PNG transparan berhasil diunduh!", "info");
    });
  }
}

// =============================================================================
// 9. TOAST NOTIFICATION & HELPER
// =============================================================================
function showToast(message, type = "info") {
  const alertEl = document.getElementById("cmsGlobalAlert");
  if (!alertEl) return;

  alertEl.textContent = message;
  alertEl.className = `cms-alert cms-alert-${type}`;
  alertEl.style.display = "block";

  setTimeout(() => {
    alertEl.style.display = "none";
  }, 4000);
}

function escapeSafe(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =============================================================================
// 10. CUSTOMER ORDERS MANAGEMENT (ORDER INBOX) WITH 24-HOUR AUTO-RESET
// =============================================================================
const DEFAULT_SAMPLE_ORDERS = [];
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Filter out orders older than 24 hours (1x24 jam reset) & discard sample dummies
 */
function pruneExpiredOrders(orders) {
  if (!Array.isArray(orders)) return [];
  const now = Date.now();
  return orders.filter(order => {
    if (!order || !order.created_at) return false;
    // Discard any old sample dummy orders
    if (order.id === "ORD-948201" || order.id === "ORD-948180" || order.id === "ORD-947990") return false;
    const orderTime = new Date(order.created_at).getTime();
    if (isNaN(orderTime)) return false;
    // Strict 24-hour retention window
    return (now - orderTime) < TWENTY_FOUR_HOURS_MS;
  });
}

function initOrdersHandlers() {
  const btnRefresh = document.getElementById("btnRefreshOrders");
  const btnResetNow = document.getElementById("btnResetOrdersNow");
  const filterTabs = document.querySelectorAll("[data-order-filter]");

  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      loadCustomerOrders();
      showToast("Daftar pesanan berhasil disegarkan.", "info");
    });
  }

  // Manual Reset Button: Reset all orders to 0
  if (btnResetNow) {
    btnResetNow.addEventListener("click", () => {
      if (confirm("Apakah Anda yakin ingin mereset semua pesanan masuk menjadi 0 (nol)?")) {
        allOrders = [];
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("siomay_customer_orders", JSON.stringify([]));
          localStorage.setItem("siomay_last_order_reset", String(Date.now()));
        }
        renderCustomerOrders();
        updateOverviewMetrics();
        showToast("Semua pesanan masuk berhasil direset menjadi 0.", "success");
      }
    });
  }

  filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      filterTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentOrderFilter = tab.getAttribute("data-order-filter") || "all";
      renderCustomerOrders();
    });
  });

  // Realtime & cross-tab sync when an order is placed from website
  window.addEventListener("siomay_order_created", () => {
    loadCustomerOrders();
    updateOverviewMetrics();
    showToast("Ada pesanan baru masuk dari website publik!", "success");
  });

  window.addEventListener("storage", (e) => {
    if (e.key === "siomay_customer_orders") {
      loadCustomerOrders();
      updateOverviewMetrics();
    }
  });

  // Background 24-Hour Auto-Reset Timer (runs every 60s while dashboard is open)
  setInterval(() => {
    const prevCount = allOrders.length;
    allOrders = pruneExpiredOrders(allOrders);
    if (allOrders.length !== prevCount) {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("siomay_customer_orders", JSON.stringify(allOrders));
      }
      renderCustomerOrders();
      updateOverviewMetrics();
    }
  }, 60000);
}

async function loadCustomerOrders() {
  const loading = document.getElementById("ordersListLoading");
  if (loading) loading.style.display = "flex";

  try {
    const res = await fetchCustomerOrders();
    let rawOrders = [];
    if (res.success && Array.isArray(res.orders) && res.orders.length > 0) {
      rawOrders = res.orders;
    } else {
      const raw = localStorage.getItem("siomay_customer_orders");
      if (raw) {
        try {
          rawOrders = JSON.parse(raw);
        } catch {
          rawOrders = [];
        }
      }
    }

    // Auto-Reset: Prune all orders older than 24 hours & discard sample dummies
    allOrders = pruneExpiredOrders(rawOrders);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("siomay_customer_orders", JSON.stringify(allOrders));
    }
  } catch (err) {
    console.warn("Gagal membaca riwayat pesanan:", err);
    allOrders = [];
  }

  if (loading) loading.style.display = "none";
  renderCustomerOrders();
  updateOverviewMetrics();
}

function renderCustomerOrders() {
  const list = document.getElementById("cmsOrdersList");
  const empty = document.getElementById("ordersListEmpty");
  if (!list) return;

  list.innerHTML = "";

  const filtered = allOrders.filter(order => {
    if (currentOrderFilter === "all") return true;
    return order.status === currentOrderFilter;
  });

  if (filtered.length === 0) {
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";

  const statusLabels = {
    baru: "Pesanan Baru",
    diproses: "Sedang Diproses",
    diantar: "Sedang Diantar",
    selesai: "Selesai"
  };

  filtered.forEach(order => {
    const card = document.createElement("div");
    card.className = `admin-order-card status-${order.status}`;

    const dateStr = formatReviewDate(order.created_at);
    const totalFormatted = "Rp" + Math.round(order.total || 0).toLocaleString("id-ID");
    
    // Clean phone for direct WhatsApp action
    let cleanPhone = (order.customer?.phone || "").replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.substring(1);
    const chatMsg = encodeURIComponent(`Halo Kak ${order.customer?.name || ""}, kami dari Siomay Online ingin konfirmasi pesanan Anda (${order.id}).`);
    const waChatUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${chatMsg}` : "#";

    const itemsHtml = (order.items || []).map(item => `
      <div class="order-item-row">
        <span class="order-item-qty">${item.quantity}x</span>
        <span class="order-item-name">${escapeSafe(item.name)} <small>(${item.portion || ""})</small></span>
        <strong class="order-item-subtotal">Rp${Math.round(item.subtotal || (item.price * item.quantity)).toLocaleString("id-ID")}</strong>
      </div>
    `).join("");

    card.innerHTML = `
      <div class="admin-order-header">
        <div class="order-id-meta">
          <strong class="order-id-code">${order.id}</strong>
          <span class="order-time-text">• ${dateStr}</span>
        </div>
        <span class="order-status-badge badge-${order.status}">${statusLabels[order.status] || order.status}</span>
      </div>

      <div class="order-customer-box">
        <div class="customer-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <strong>${escapeSafe(order.customer?.name || "Pelanggan")}</strong>
          <span class="customer-phone">${escapeSafe(order.customer?.phone || "")}</span>
        </div>
        <div class="customer-row text-subtle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${escapeSafe(order.customer?.address || "-")}</span>
        </div>
        ${order.customer?.note ? `
          <div class="customer-note-box">
            <em>Catatan: "${escapeSafe(order.customer.note)}"</em>
          </div>
        ` : ''}
      </div>

      <div class="order-items-list-box">
        ${itemsHtml}
      </div>

      <div class="order-total-bar">
        <span>Total Pembayaran (${order.itemCount || 0} item):</span>
        <strong class="order-total-amount">${totalFormatted}</strong>
      </div>

      <div class="order-actions-bar">
        <div class="order-status-selector">
          <label class="status-select-label">Status Pesanan:</label>
          <select class="form-input form-select-sm select-order-status" data-order-id="${order.id}">
            <option value="baru" ${order.status === 'baru' ? 'selected' : ''}>Pesanan Baru</option>
            <option value="diproses" ${order.status === 'diproses' ? 'selected' : ''}>Sedang Diproses</option>
            <option value="diantar" ${order.status === 'diantar' ? 'selected' : ''}>Sedang Diantar</option>
            <option value="selesai" ${order.status === 'selesai' ? 'selected' : ''}>Selesai</option>
          </select>
        </div>

        <div class="order-btn-group">
          ${cleanPhone ? `
            <a href="${waChatUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary btn-chat-wa" title="Hubungi Pelanggan di WhatsApp">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span>Hubungi WA</span>
            </a>
          ` : ''}
          <button type="button" class="btn btn-sm btn-danger btn-delete-order" data-order-id="${order.id}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span>Hapus</span>
          </button>
        </div>
      </div>
    `;

    // Bind change status
    const selectStatus = card.querySelector(".select-order-status");
    if (selectStatus) {
      selectStatus.addEventListener("change", (e) => {
        updateOrderStatus(order.id, e.target.value);
      });
    }

    // Bind delete order
    const deleteBtn = card.querySelector(".btn-delete-order");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (confirm(`Hapus pesanan ${order.id} dari daftar?`)) {
          deleteOrder(order.id);
        }
      });
    }

    list.appendChild(card);
  });
}

async function updateOrderStatus(orderId, newStatus) {
  const idx = allOrders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    allOrders[idx].status = newStatus;
    localStorage.setItem("siomay_customer_orders", JSON.stringify(allOrders));
    await updateCustomerOrderStatus(orderId, newStatus);
    showToast(`Status pesanan ${orderId} diubah ke '${newStatus}'.`, "success");
    renderCustomerOrders();
    updateOverviewMetrics();
  }
}

async function deleteOrder(orderId) {
  allOrders = allOrders.filter(o => o.id !== orderId);
  localStorage.setItem("siomay_customer_orders", JSON.stringify(allOrders));
  await deleteCustomerOrder(orderId);
  showToast(`Pesanan ${orderId} berhasil dihapus.`, "info");
  renderCustomerOrders();
  updateOverviewMetrics();
}

