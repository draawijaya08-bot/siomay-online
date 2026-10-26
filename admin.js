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
  testSupabaseMenuWriteAccess
} from "./cmsService.js";
import { formatReviewDate, renderStarsHtml, getLocalReviews, saveLocalReviews } from "./reviews.js";

// Global CMS State
let currentOwner = null;
let menuItems = [];
let isSavingMenuItem = false;
let siteSettings = null;
let allReviews = [];
let currentReviewFilter = "all";
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
  initReviewHandlers();
  initOrdersHandlers();

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

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = emailInput ? emailInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";

      if (!email || !password) {
        showAuthError("Email dan kata sandi wajib diisi.");
        return;
      }

      if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.textContent = "Memverifikasi...";
      }

      hideAuthError();
      const res = await loginOwner(email, password);

      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = "Masuk ke Dashboard →";
      }

      if (!res.success) {
        showAuthError(res.error || "Gagal masuk. Periksa kembali email dan password.");
        return;
      }

      currentOwner = res.user;
      await checkAuthSession();
      showToast("Selamat datang kembali di Admin CMS Siomay Online!", "success");
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      if (confirm("Apakah Anda yakin ingin keluar dari Admin CMS?")) {
        await logoutOwner();
        currentOwner = null;
        await checkAuthSession();
        showToast("Anda telah keluar dari CMS.", "info");
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
    viewContent: "Banner & Video Promosi",
    viewOperations: "Pengaturan Jam Operasional & Lokasi",
    viewWhatsApp: "Pengaturan WhatsApp & Pesanan",
    viewReviews: "Moderasi Ulasan Pelanggan"
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
  const btnQuickBanner = document.getElementById("btnQuickEditBanner");
  const btnRefreshOverview = document.getElementById("btnRefreshOverview");

  if (btnQuickAdd) {
    btnQuickAdd.addEventListener("click", () => {
      switchView("viewMenu");
      openMenuModal();
    });
  }

  if (btnQuickBanner) {
    btnQuickBanner.addEventListener("click", () => {
      switchView("viewContent");
    });
  }

  const btnQuickOps = document.getElementById("btnQuickEditOperations");
  if (btnQuickOps) {
    btnQuickOps.addEventListener("click", () => {
      switchView("viewOperations");
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
    loadReviewsForAdmin(),
    loadCustomerOrders()
  ]);
  updateOverviewMetrics();
}

function updateOverviewMetrics() {
  const metricMenu = document.getElementById("metricTotalMenu");
  const metricWa = document.getElementById("metricWhatsApp");
  const metricPending = document.getElementById("metricPendingReviews");
  const metricApproved = document.getElementById("metricApprovedReviews");
  const metricOrders = document.getElementById("metricTotalOrders");
  const metricOperational = document.getElementById("metricOperationalHours");
  const sidebarBadge = document.getElementById("sidebarPendingReviewsBadge");
  const sidebarOrdersBadge = document.getElementById("sidebarPendingOrdersBadge");

  if (metricMenu) metricMenu.textContent = menuItems.length;
  if (metricWa && siteSettings) {
    metricWa.textContent = siteSettings.whatsapp_number || "628XXXXXXXXXX";
  }
  if (metricOperational && siteSettings) {
    const area = siteSettings.delivery_area ? ` (${siteSettings.delivery_area})` : "";
    metricOperational.textContent = (siteSettings.operational_hours || "10.00 — 21.00 WIB") + area;
  }

  const pendingCount = allReviews.filter(r => r.status === "pending").length;
  const approvedCount = allReviews.filter(r => r.status === "approved").length;
  const totalOrdersCount = allOrders.length;
  const newOrdersCount = allOrders.filter(o => o.status === "baru").length;

  if (metricPending) metricPending.textContent = pendingCount;
  if (metricApproved) metricApproved.textContent = approvedCount;
  if (metricOrders) metricOrders.textContent = totalOrdersCount;

  if (sidebarBadge) {
    if (pendingCount > 0) {
      sidebarBadge.textContent = pendingCount;
      sidebarBadge.style.display = "inline-flex";
    } else {
      sidebarBadge.style.display = "none";
    }
  }

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
  }

  const msg = msgInput ? msgInput.value.trim() : "";
  const fullUrl = `https://wa.me/${rawNumber}?text=${encodeURIComponent(msg)}`;

  if (previewEl) previewEl.textContent = fullUrl;
  if (testBtn) testBtn.href = fullUrl;
}

async function handleSaveWhatsApp() {
  const waInput = document.getElementById("settingWhatsAppNumber");
  const msgInput = document.getElementById("settingDefaultOrderMessage");
  const btnSave = document.getElementById("btnSaveWhatsApp");

  let rawNumber = waInput ? waInput.value.replace(/[^0-9]/g, "") : "";
  if (rawNumber.startsWith("0")) {
    rawNumber = "62" + rawNumber.substring(1);
  }

  if (!rawNumber || rawNumber.length < 8) {
    showToast("Nomor WhatsApp belum valid (minimal 8 angka).", "error");
    return;
  }

  const payload = {
    ...(siteSettings || {}),
    whatsapp_number: rawNumber,
    default_order_message: msgInput ? msgInput.value.trim() : ""
  };

  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = "Menyimpan...";
  }

  const res = await updateSiteSettings(payload);

  if (btnSave) {
    btnSave.disabled = false;
    btnSave.textContent = "Simpan Nomor WhatsApp";
  }

  if (!res.success) {
    showToast(`Gagal menyimpan: ${res.error}`, "error");
    return;
  }

  siteSettings = res.settings;
  showToast("Nomor WhatsApp toko berhasil diperbarui!", "success");
  updateOverviewMetrics();
}

// =============================================================================
// 7. CUSTOMER REVIEWS MODERATION
// =============================================================================
function initReviewHandlers() {
  const btnRefresh = document.getElementById("btnRefreshReviews");
  const btnClean = document.getElementById("btnCleanTestData");
  const tabs = document.querySelectorAll("[data-review-filter]");

  if (btnRefresh) {
    btnRefresh.addEventListener("click", async () => {
      await loadReviewsForAdmin();
      showToast("Data ulasan pelanggan disegarkan.", "info");
    });
  }

  if (btnClean) {
    btnClean.addEventListener("click", async () => {
      await handleCleanTestData();
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentReviewFilter = tab.getAttribute("data-review-filter") || "all";
      renderReviewsForAdmin();
    });
  });
}

async function handleCleanTestData() {
  const testReviews = allReviews.filter(r => 
    (r.display_name && r.display_name.toLowerCase().includes("test data")) ||
    (r.display_name && r.display_name.toLowerCase().includes("(test data)"))
  );

  if (testReviews.length === 0) {
    alert("Tidak ditemukan ulasan data tes. Semua ulasan di database adalah ulasan pelanggan asli.");
    return;
  }

  if (!confirm(`Ditemukan ${testReviews.length} ulasan bertanda '(Test Data)'.\n\nApakah Anda ingin menghapus semua data tes ini agar dashboard hanya menampilkan ulasan asli dari pelanggan yang memesan?`)) {
    return;
  }

  for (const r of testReviews) {
    await deleteReviewFromDb(r.id, true);
  }

  showToast(`${testReviews.length} ulasan data tes berhasil dibersihkan!`, "success");
  await loadReviewsForAdmin();
}

async function loadReviewsForAdmin() {
  const loading = document.getElementById("reviewsListLoading");
  const empty = document.getElementById("reviewsListEmpty");
  const list = document.getElementById("cmsReviewsList");

  if (loading) loading.style.display = "flex";
  if (empty) empty.style.display = "none";
  if (list) list.innerHTML = "";

  if (!isSupabaseConfigured || !supabase) {
    if (loading) loading.style.display = "none";
    allReviews = getLocalReviews();
    updateReviewCountBadges();
    renderReviewsForAdmin();
    updateOverviewMetrics();
    return;
  }

  try {
    const { data, error } = await supabase
      .from("customer_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (loading) loading.style.display = "none";
    if (error) throw error;

    allReviews = data || [];
    updateReviewCountBadges();
    renderReviewsForAdmin();
    updateOverviewMetrics();
  } catch (err) {
    if (loading) loading.style.display = "none";
    console.warn("[Reviews CMS] Supabase query offline, falling back to local buffer:", err);
    allReviews = getLocalReviews();
    updateReviewCountBadges();
    renderReviewsForAdmin();
    updateOverviewMetrics();
  }
}

function updateReviewCountBadges() {
  const badgeAll = document.getElementById("badgeAllReviewsCount");
  const badgePending = document.getElementById("badgePendingReviewsCount");
  const badgeApproved = document.getElementById("badgeApprovedReviewsCount");
  const badgeRejected = document.getElementById("badgeRejectedReviewsCount");

  const pendingCount = allReviews.filter(r => r.status === "pending").length;
  const approvedCount = allReviews.filter(r => r.status === "approved").length;
  const rejectedCount = allReviews.filter(r => r.status === "rejected").length;

  if (badgeAll) badgeAll.textContent = allReviews.length;
  if (badgePending) badgePending.textContent = pendingCount;
  if (badgeApproved) badgeApproved.textContent = approvedCount;
  if (badgeRejected) badgeRejected.textContent = rejectedCount;
}

function renderReviewsForAdmin() {
  const list = document.getElementById("cmsReviewsList");
  const empty = document.getElementById("reviewsListEmpty");
  if (!list) return;

  list.innerHTML = "";

  const filtered = allReviews.filter(r => {
    if (currentReviewFilter === "all") return true;
    return r.status === currentReviewFilter;
  });

  if (filtered.length === 0) {
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";

  filtered.forEach(review => {
    const card = document.createElement("div");
    card.className = `admin-review-card status-${review.status}`;

    const dateStr = formatReviewDate(review.created_at);
    const statusLabels = {
      pending: "Menunggu Tinjauan",
      approved: "Disetujui (Aktif di Web)",
      rejected: "Ditolak"
    };

    const firstLetter = (review.display_name || "P").trim().charAt(0).toUpperCase();

    card.innerHTML = `
      <div class="admin-review-header">
        <div class="admin-customer-meta">
          <div class="customer-avatar" aria-hidden="true">${firstLetter}</div>
          <div>
            <strong class="admin-customer-name">${escapeSafe(review.display_name)}</strong>
            <span class="admin-review-date">• ${dateStr}</span>
          </div>
        </div>
        <span class="status-pill pill-${review.status}">
          ${review.status === 'pending' ? '⏳ ' : review.status === 'approved' ? '✓ ' : '✕ '}
          ${statusLabels[review.status] || review.status}
        </span>
      </div>
      <div class="admin-rating-row">
        <div>${renderStarsHtml(review.rating)}</div>
        ${review.menu_item_name ? `<span class="admin-menu-tag">${escapeSafe(review.menu_item_name)}</span>` : ''}
      </div>
      <p class="admin-comment-text">${escapeSafe(review.comment)}</p>
      <div class="admin-actions-row">
        ${review.status !== 'approved' ? `<button type="button" class="btn btn-sm btn-approve" data-act="approve" data-id="${review.id}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> <span>Setujui</span></button>` : ''}
        ${review.status !== 'rejected' ? `<button type="button" class="btn btn-sm btn-reject" data-act="reject" data-id="${review.id}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> <span>Tolak</span></button>` : ''}
        <button type="button" class="btn btn-sm btn-delete" data-act="delete" data-id="${review.id}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> <span>Hapus</span></button>
      </div>
    `;

    // Bind action buttons
    const btnApprove = card.querySelector('[data-act="approve"]');
    const btnReject = card.querySelector('[data-act="reject"]');
    const btnDelete = card.querySelector('[data-act="delete"]');

    if (btnApprove) {
      btnApprove.addEventListener("click", async () => {
        await updateReviewModerationStatus(review.id, "approved");
      });
    }

    if (btnReject) {
      btnReject.addEventListener("click", async () => {
        await updateReviewModerationStatus(review.id, "rejected");
      });
    }

    if (btnDelete) {
      btnDelete.addEventListener("click", async () => {
        if (confirm("Hapus ulasan ini secara permanen dari database?")) {
          await deleteReviewFromDb(review.id);
        }
      });
    }

    list.appendChild(card);
  });
}

async function updateReviewModerationStatus(id, newStatus) {
  // Always update in local reviews buffer
  const localList = getLocalReviews();
  const idx = localList.findIndex(r => r.id === id);
  if (idx !== -1) {
    localList[idx].status = newStatus;
    saveLocalReviews(localList);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("customer_reviews")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) console.warn("[Reviews CMS] Supabase update warning:", error);
    } catch (err) {
      console.warn("[Reviews CMS] Supabase update error:", err);
    }
  }

  showToast(`Status ulasan berhasil diubah menjadi '${newStatus}'.`, "success");
  await loadReviewsForAdmin();
}

async function deleteReviewFromDb(id, silent = false) {
  // Always delete from local reviews buffer
  let localList = getLocalReviews();
  localList = localList.filter(r => r.id !== id);
  saveLocalReviews(localList);

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("customer_reviews")
        .delete()
        .eq("id", id);

      if (error) console.warn("[Reviews CMS] Supabase delete warning:", error);
    } catch (err) {
      console.warn("[Reviews CMS] Supabase delete error:", err);
    }
  }

  if (!silent) {
    showToast("Ulasan berhasil dihapus.", "success");
    await loadReviewsForAdmin();
  }
}

// =============================================================================
// 8. TOAST NOTIFICATION & HELPER
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
// 9. CUSTOMER ORDERS MANAGEMENT (ORDER INBOX)
// =============================================================================
const DEFAULT_SAMPLE_ORDERS = [
  {
    id: "ORD-948201",
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    customer: {
      name: "Budi Santoso",
      phone: "6281288991122",
      address: "Jl. Dago Asri No. 12, Bandung (Dekat Alfamart)",
      note: "Bumbu kacangnya dipisah ya, banyakin sambalnya."
    },
    items: [
      { id: "siomay-komplit", name: "Siomay Komplit", price: 25000, quantity: 2, subtotal: 50000, portion: "Paling Lengkap" },
      { id: "batagor", name: "Batagor", price: 15000, quantity: 1, subtotal: 15000, portion: "Crispy & Gurih" }
    ],
    total: 65000,
    itemCount: 3,
    status: "baru"
  },
  {
    id: "ORD-948180",
    created_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    customer: {
      name: "Siti Rahma",
      phone: "6285712345678",
      address: "Komplek Graha Indah Blok C3 No. 5",
      note: "Kecap manis sedikit saja."
    },
    items: [
      { id: "paket-hemat", name: "Paket Hemat", price: 35000, quantity: 1, subtotal: 35000, portion: "Porsi Kenyang" }
    ],
    total: 35000,
    itemCount: 1,
    status: "diproses"
  },
  {
    id: "ORD-947990",
    created_at: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    customer: {
      name: "Agus Pratama",
      phone: "6281399887766",
      address: "Kantor BCA Dago Lt. 2",
      note: "Titip di satpam kalau belum turun."
    },
    items: [
      { id: "siomay-original", name: "Siomay Original", price: 15000, quantity: 4, subtotal: 60000, portion: "Porsi Mantap" }
    ],
    total: 60000,
    itemCount: 4,
    status: "selesai"
  }
];

function initOrdersHandlers() {
  const btnRefresh = document.getElementById("btnRefreshOrders");
  const filterTabs = document.querySelectorAll("[data-order-filter]");

  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      loadCustomerOrders();
      showToast("Daftar pesanan berhasil disegarkan.", "info");
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
}

function loadCustomerOrders() {
  const loading = document.getElementById("ordersListLoading");
  if (loading) loading.style.display = "flex";

  try {
    const raw = localStorage.getItem("siomay_customer_orders");
    if (!raw) {
      allOrders = [...DEFAULT_SAMPLE_ORDERS];
      localStorage.setItem("siomay_customer_orders", JSON.stringify(allOrders));
    } else {
      allOrders = JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Gagal membaca riwayat pesanan:", err);
    allOrders = [...DEFAULT_SAMPLE_ORDERS];
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

function updateOrderStatus(orderId, newStatus) {
  const idx = allOrders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    allOrders[idx].status = newStatus;
    localStorage.setItem("siomay_customer_orders", JSON.stringify(allOrders));
    showToast(`Status pesanan ${orderId} diubah ke '${newStatus}'.`, "success");
    renderCustomerOrders();
    updateOverviewMetrics();
  }
}

function deleteOrder(orderId) {
  allOrders = allOrders.filter(o => o.id !== orderId);
  localStorage.setItem("siomay_customer_orders", JSON.stringify(allOrders));
  showToast(`Pesanan ${orderId} berhasil dihapus.`, "info");
  renderCustomerOrders();
  updateOverviewMetrics();
}

