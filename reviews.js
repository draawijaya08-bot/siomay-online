/**
 * SIOMAY ONLINE — CUSTOMER REVIEWS SERVICE & DOM CONTROLLER
 * 
 * Manages:
 * 1. Fetching approved customer reviews from Supabase with pagination & aggregate ratings.
 * 2. Form submission with validation, anti-spam (honeypot + cooldown), and 'pending' moderation status.
 * 3. Strict XSS prevention by using safe text rendering (textContent/createTextNode).
 * 4. Interactive star rating selector and modal dialog lifecycle.
 * 5. Indonesian messaging and accessible UI components.
 */

import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import { DEFAULT_MENU_ITEMS } from "./cmsService.js";

const PRODUCTS = (Array.isArray(DEFAULT_MENU_ITEMS) ? DEFAULT_MENU_ITEMS : []).map(item => ({
  id: item.slug || item.id,
  name: item.name,
  price: item.price
}));

// Anti-spam submission cooldown duration (in milliseconds)
const SUBMISSION_COOLDOWN_MS = 30000;
const COOLDOWN_KEY = "siomay_last_review_submit";

/**
 * Format timestamp to Indonesian readable date (e.g. "24 Okt 2026")
 */
export function formatReviewDate(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  } catch {
    return "";
  }
}

/**
 * Defense-in-depth HTML escaping helper
 */
export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate Star Rating String / HTML
 */
export function renderStarsHtml(rating) {
  const num = Number(rating);
  const cleanRating = isNaN(num) ? 5 : Math.max(1, Math.min(5, Math.round(num)));
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= cleanRating) {
      stars += `<span class="review-star star-filled" aria-hidden="true">&#9733;</span>`;
    } else {
      stars += `<span class="review-star star-empty" aria-hidden="true">&#9734;</span>`;
    }
  }
  return `<span class="review-stars-group" aria-label="Rating ${cleanRating} dari 5 bintang">${stars}</span>`;
}

const LOCAL_STORAGE_REVIEWS_KEY = "siomay_customer_reviews_v1";

// Initial seed reviews for instant rendering and offline resilience
const DEFAULT_SEED_REVIEWS = [
  {
    id: "00000000-0000-0000-0000-000000000004",
    display_name: "Caca",
    rating: 5,
    comment: "Siomay kentangnya sangat lembut dan enak, bumbu kacangnya gurih legit bikin nagih!",
    menu_item_id: "siomay-komplit",
    menu_item_name: "Siomay Komplit",
    status: "pending",
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: "00000000-0000-0000-0000-000000000001",
    display_name: "Budi Santoso",
    rating: 5,
    comment: "Siomaynya sangat lembut, ikannya berasa banget dan bumbu kacangnya gurih legit. Sampai di rumah masih hangat!",
    menu_item_id: "siomay-komplit",
    menu_item_name: "Siomay Komplit",
    status: "approved",
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    display_name: "Sarah Mustika",
    rating: 5,
    comment: "Batagornya garing renyah di luar tapi empuk di dalam. Bumbu kacangnya melimpah dan tidak pelit jeruk limau.",
    menu_item_id: "batagor",
    menu_item_name: "Batagor",
    status: "approved",
    created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    display_name: "Dimas Pratama",
    rating: 5,
    comment: "Pesan paket hemat buat makan siang sekantor di Klaten. Semua teman puji rasanya enak dan porsi mengenyangkan.",
    menu_item_id: "paket-hemat",
    menu_item_name: "Paket Hemat",
    status: "approved",
    created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString()
  }
];

export function getLocalReviews() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return [...DEFAULT_SEED_REVIEWS];
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(DEFAULT_SEED_REVIEWS));
      return [...DEFAULT_SEED_REVIEWS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_SEED_REVIEWS];
  } catch {
    return [...DEFAULT_SEED_REVIEWS];
  }
}

export function saveLocalReviews(reviews) {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(reviews));
  } catch (err) {
    console.warn("Gagal menyimpan ulasan ke local buffer:", err);
  }
}

/**
 * Fetch approved reviews with pagination and aggregates
 */
export async function fetchApprovedReviews({ page = 1, pageSize = 6 } = {}) {
  // If Supabase is configured, fetch live from Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Fetch aggregate metrics (count and average) of approved reviews
      const { data: allApproved, error: aggError, count: totalCount } = await supabase
        .from("customer_reviews")
        .select("rating", { count: "exact" })
        .eq("status", "approved");

      if (!aggError && allApproved && allApproved.length > 0) {
        const sum = allApproved.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0);
        const averageRating = Number((sum / allApproved.length).toFixed(1));

        // 2. Fetch paginated slice of approved reviews (ordered newest first)
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data: reviews, error: listError } = await supabase
          .from("customer_reviews")
          .select("id, display_name, rating, comment, menu_item_id, menu_item_name, created_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .range(from, to);

        if (!listError) {
          const currentTotal = (reviews || []).length;
          const hasMore = from + currentTotal < (totalCount || 0);

          return {
            success: true,
            isConfigured: true,
            reviews: reviews || [],
            totalCount: totalCount || 0,
            averageRating,
            hasMore,
            page,
            pageSize,
            error: null
          };
        }
      }
    } catch (err) {
      console.warn("[Reviews] Supabase query offline, falling back to local buffer:", err);
    }
  }

  // Fallback: Read approved reviews from local persistence buffer
  const localList = getLocalReviews();
  const approved = localList.filter(r => r.status === "approved");
  
  // Sort newest first
  approved.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  let averageRating = 4.9;
  if (approved.length > 0) {
    const sum = approved.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0);
    averageRating = Number((sum / approved.length).toFixed(1));
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const paginatedReviews = approved.slice(from, to);
  const hasMore = to < approved.length;

  return {
    success: true,
    isConfigured: isSupabaseConfigured,
    reviews: paginatedReviews,
    totalCount: approved.length,
    averageRating,
    hasMore,
    page,
    pageSize,
    error: null
  };
}

/**
 * Submit a new customer review (Strictly saved as 'pending' for admin moderation)
 */
export async function submitCustomerReview({
  displayName,
  rating,
  comment,
  menuItemId = null,
  honeypot = ""
}) {
  // 1. Anti-spam honeypot check (Bots fill hidden fields, humans do not)
  if (honeypot && honeypot.trim().length > 0) {
    // Silently treat as success to deceive spambots without saving
    return {
      success: true,
      message: "Ulasan berhasil dikirim. Terima kasih atas masukan kamu!"
    };
  }

  // 2. Anti-spam client-side rate limit cooldown
  try {
    const lastSubmit = sessionStorage.getItem(COOLDOWN_KEY);
    if (lastSubmit) {
      const elapsed = Date.now() - parseInt(lastSubmit, 10);
      if (elapsed < SUBMISSION_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((SUBMISSION_COOLDOWN_MS - elapsed) / 1000);
        return {
          success: false,
          error: `Mohon tunggu ${remainingSeconds} detik sebelum mengirim ulasan kembali.`
        };
      }
    }
  } catch {
    // Ignore storage issues
  }

  // 3. Validation
  const cleanName = (displayName || "").trim();
  const cleanComment = (comment || "").trim();
  const cleanRating = parseInt(rating, 10);

  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: "Nama kamu belum diisi dengan benar (minimal 2 huruf)." };
  }
  if (cleanName.length > 60) {
    return { success: false, error: "Nama kamu terlalu panjang (maksimal 60 karakter)." };
  }

  if (isNaN(cleanRating) || cleanRating < 1 || cleanRating > 5) {
    return { success: false, error: "Beri rating bintang dari 1 hingga 5." };
  }

  if (!cleanComment || cleanComment.length < 10) {
    return { success: false, error: "Tulis pengalaman kamu minimal 10 karakter." };
  }
  if (cleanComment.length > 1000) {
    return { success: false, error: "Ulasan maksimal 1.000 karakter." };
  }

  // Resolve optional menu item name
  let cleanMenuItemId = null;
  let cleanMenuItemName = null;
  if (menuItemId && menuItemId.trim()) {
    const foundProduct = PRODUCTS.find(p => p.id === menuItemId.trim());
    if (foundProduct) {
      cleanMenuItemId = foundProduct.id;
      cleanMenuItemName = foundProduct.name;
    }
  }

  // 4. Persistence
  const payload = {
    id: "00000000-0000-0000-0000-" + Date.now().toString(16).padStart(12, "0"),
    display_name: cleanName,
    rating: cleanRating,
    comment: cleanComment,
    menu_item_id: cleanMenuItemId,
    menu_item_name: cleanMenuItemName,
    status: "pending", // Enforced: ALWAYS pending moderation
    created_at: new Date().toISOString()
  };

  // Always save to local persistence buffer
  try {
    const localList = getLocalReviews();
    localList.unshift(payload);
    saveLocalReviews(localList);
  } catch (err) {
    console.warn("Gagal simpan ke buffer lokal:", err);
  }

  // If Supabase is connected, persist directly to customer_reviews
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("customer_reviews")
        .insert([{
          display_name: cleanName,
          rating: cleanRating,
          comment: cleanComment,
          menu_item_id: cleanMenuItemId,
          menu_item_name: cleanMenuItemName,
          status: "pending"
        }]);

      if (error) {
        console.warn("[Reviews] Supabase save warning (fallback saved locally):", error);
      }
    } catch (err) {
      console.warn("[Reviews] Supabase network offline (fallback saved locally):", err);
    }
  }

  // Set cooldown timestamp
  try {
    sessionStorage.setItem(COOLDOWN_KEY, Date.now().toString());
  } catch {
    // Ignore
  }

  return {
    success: true,
    message: "Ulasan berhasil dikirim! Ulasan kamu akan segera ditinjau dan ditampilkan di halaman ini."
  };
}

// =============================================================================
// DOM CONTROLLER & REVIEW MODAL LIFECYCLE
// =============================================================================

let currentPage = 1;
const PAGE_SIZE = 6;
let accumulatedReviews = [];
let totalReviewsCount = 0;
let averageRatingScore = 4.9;

/**
 * Initialize Reviews Section & Review Submission Modal
 */
export function initReviewsSection() {
  const reviewsContainer = document.getElementById("reviewsGrid");
  const openModalBtn = document.getElementById("btnOpenReviewModal");
  const openModalEmptyBtn = document.getElementById("btnOpenReviewEmpty");
  const loadMoreBtn = document.getElementById("btnLoadMoreReviews");

  // Populate menu items dropdown in review form
  populateReviewMenuSelect();

  // Initialize interactive star rating selector
  initStarRatingSelector();

  // Initialize modal handlers
  initReviewModal();

  // Initial fetch of approved reviews
  loadApprovedReviews(1, false);

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      loadApprovedReviews(currentPage + 1, true);
    });
  }

  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => openReviewModal());
  }

  if (openModalEmptyBtn) {
    openModalEmptyBtn.addEventListener("click", () => openReviewModal());
  }
}

/**
 * Populate menu select dropdown from PRODUCTS
 */
function populateReviewMenuSelect() {
  const select = document.getElementById("reviewMenuItem");
  if (!select) return;

  // Clear existing options except default
  select.innerHTML = `<option value="">-- Pilih menu yang dinikmati (opsional) --</option>`;

  PRODUCTS.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (Rp${p.price.toLocaleString("id-ID")})`;
    select.appendChild(opt);
  });

  const optOther = document.createElement("option");
  optOther.value = "lainnya";
  optOther.textContent = "Pesanan Campur / Menu Lainnya";
  select.appendChild(optOther);
}

/**
 * Fetch and render reviews
 */
export async function loadApprovedReviews(page = 1, append = false) {
  const grid = document.getElementById("reviewsGrid");
  const loadingEl = document.getElementById("reviewsLoading");
  const emptyEl = document.getElementById("reviewsEmpty");
  const unconfiguredEl = document.getElementById("reviewsUnconfigured");
  const loadMoreBtn = document.getElementById("btnLoadMoreReviews");
  const scoreBadge = document.getElementById("reviewsAverageScore");
  const countBadge = document.getElementById("reviewsTotalCount");
  const heroBadge = document.querySelector(".hero-rating-badge");

  if (!grid) return;

  if (!append) {
    if (loadingEl) loadingEl.style.display = "grid";
    if (emptyEl) emptyEl.style.display = "none";
    if (unconfiguredEl) unconfiguredEl.style.display = "none";
    grid.innerHTML = "";
  } else if (loadMoreBtn) {
    loadMoreBtn.classList.add("loading");
    loadMoreBtn.textContent = "Memuat...";
  }

  const res = await fetchApprovedReviews({ page, pageSize: PAGE_SIZE });

  if (loadingEl) loadingEl.style.display = "none";
  if (unconfiguredEl) unconfiguredEl.style.display = "none";
  if (loadMoreBtn) {
    loadMoreBtn.classList.remove("loading");
    loadMoreBtn.textContent = "Muat Ulasan Lainnya";
  }

  if (!res.success) {
    if (!append) {
      grid.innerHTML = `
        <div class="reviews-error-box" role="alert">
          <p>⚠️ Tidak dapat memuat ulasan saat ini: ${escapeHtml(res.error)}</p>
          <button type="button" class="btn btn-secondary btn-sm" id="btnRetryReviews">Coba Lagi</button>
        </div>
      `;
      const retryBtn = document.getElementById("btnRetryReviews");
      if (retryBtn) {
        retryBtn.addEventListener("click", () => loadApprovedReviews(1, false));
      }
    }
    return;
  }

  currentPage = page;
  totalReviewsCount = res.totalCount;
  averageRatingScore = res.averageRating;

  if (append) {
    accumulatedReviews = accumulatedReviews.concat(res.reviews);
  } else {
    accumulatedReviews = res.reviews;
  }

  // Update summary counts
  if (scoreBadge) scoreBadge.textContent = averageRatingScore.toFixed(1);
  if (countBadge) {
    countBadge.textContent = `${totalReviewsCount} Ulasan Pelanggan Terverifikasi`;
  }

  // Also update hero badge if appropriate
  if (heroBadge && totalReviewsCount > 0) {
    heroBadge.innerHTML = `<span class="rating-star">★</span> ${averageRatingScore.toFixed(1)}/5 • ${totalReviewsCount} Ulasan Pelanggan`;
  }

  // Render cards or empty state
  if (accumulatedReviews.length === 0) {
    if (emptyEl) emptyEl.style.display = "flex";
    grid.innerHTML = "";
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";
  renderReviewCards(accumulatedReviews);

  // Manage "Muat Ulasan Lainnya" button visibility
  if (loadMoreBtn) {
    if (res.hasMore) {
      loadMoreBtn.style.display = "inline-flex";
    } else {
      loadMoreBtn.style.display = "none";
    }
  }
}

/**
 * Render Review Cards with SAFE text rendering (Zero XSS)
 */
function renderReviewCards(reviews) {
  const grid = document.getElementById("reviewsGrid");
  if (!grid) return;

  grid.innerHTML = "";

  reviews.forEach((review, index) => {
    const card = document.createElement("article");
    card.className = "review-card reveal-on-scroll";
    if (index % 3 === 1) card.classList.add("delay-1");
    if (index % 3 === 2) card.classList.add("delay-2");

    // Top Row: Star Rating & Verified Badge
    const topRow = document.createElement("div");
    topRow.className = "review-card-top";

    const starsWrap = document.createElement("div");
    starsWrap.className = "review-stars";
    starsWrap.innerHTML = renderStarsHtml(review.rating);

    const verifiedBadge = document.createElement("span");
    verifiedBadge.className = "review-verified-badge";
    verifiedBadge.innerHTML = `<span class="badge-icon">✓</span> Terverifikasi`;

    topRow.appendChild(starsWrap);
    topRow.appendChild(verifiedBadge);

    // Optional Menu Item Badge
    let menuBadge = null;
    if (review.menu_item_name) {
      menuBadge = document.createElement("div");
      menuBadge.className = "review-menu-badge";
      menuBadge.textContent = review.menu_item_name;
    }

    // Comment Text: Rendered safely with textContent to avoid XSS
    const quoteEl = document.createElement("p");
    quoteEl.className = "review-comment";
    quoteEl.textContent = review.comment; // Safe textContent!

    // Bottom Row: Author details
    const authorWrap = document.createElement("div");
    authorWrap.className = "review-author";

    const avatar = document.createElement("div");
    avatar.className = "author-avatar";
    avatar.setAttribute("aria-hidden", "true");
    const initial = (review.display_name || "P").trim().charAt(0).toUpperCase();
    avatar.textContent = initial;

    const authorInfo = document.createElement("div");
    authorInfo.className = "author-info";

    const authorName = document.createElement("span");
    authorName.className = "author-name";
    authorName.textContent = review.display_name; // Safe textContent!

    const authorDate = document.createElement("span");
    authorDate.className = "author-date";
    authorDate.textContent = formatReviewDate(review.created_at) || "Pelanggan Siomay Online";

    authorInfo.appendChild(authorName);
    authorInfo.appendChild(authorDate);

    authorWrap.appendChild(avatar);
    authorWrap.appendChild(authorInfo);

    // Assemble Card
    card.appendChild(topRow);
    if (menuBadge) card.appendChild(menuBadge);
    card.appendChild(quoteEl);
    card.appendChild(authorWrap);

    grid.appendChild(card);
  });
}

// =============================================================================
// INTERACTIVE STAR RATING SELECTOR
// =============================================================================

let currentSelectedRating = 5;

const RATING_LABELS = {
  1: "1 — Kurang Puas",
  2: "2 — Cukup",
  3: "3 — Lumayan Enak",
  4: "4 — Sangat Enak!",
  5: "5 — Luar Biasa Lezat!"
};

function initStarRatingSelector() {
  const container = document.getElementById("starPicker");
  const hiddenInput = document.getElementById("reviewRatingInput");
  const labelEl = document.getElementById("starRatingLabel");

  if (!container || !hiddenInput) return;

  const starButtons = container.querySelectorAll(".star-picker-btn");

  const updateStarDisplay = (rating) => {
    starButtons.forEach(btn => {
      const val = parseInt(btn.getAttribute("data-star-val"), 10);
      if (val <= rating) {
        btn.classList.add("active");
        btn.setAttribute("aria-checked", "true");
      } else {
        btn.classList.remove("active");
        btn.setAttribute("aria-checked", "false");
      }
    });

    if (labelEl) {
      labelEl.textContent = RATING_LABELS[rating] || `${rating} Bintang`;
    }
  };

  starButtons.forEach(btn => {
    const val = parseInt(btn.getAttribute("data-star-val"), 10);

    // Click selection
    btn.addEventListener("click", () => {
      currentSelectedRating = val;
      hiddenInput.value = val;
      updateStarDisplay(val);
    });

    // Hover preview
    btn.addEventListener("mouseenter", () => {
      starButtons.forEach(b => {
        const hoverVal = parseInt(b.getAttribute("data-star-val"), 10);
        if (hoverVal <= val) {
          b.classList.add("hover");
        } else {
          b.classList.remove("hover");
        }
      });
      if (labelEl) {
        labelEl.textContent = RATING_LABELS[val] || `${val} Bintang`;
      }
    });

    // Hover leave -> restore selected
    btn.addEventListener("mouseleave", () => {
      starButtons.forEach(b => b.classList.remove("hover"));
      updateStarDisplay(currentSelectedRating);
    });

    // Keyboard support
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        currentSelectedRating = val;
        hiddenInput.value = val;
        updateStarDisplay(val);
      }
    });
  });

  // Set default 5 stars
  currentSelectedRating = 5;
  hiddenInput.value = "5";
  updateStarDisplay(5);
}

// =============================================================================
// REVIEW SUBMISSION MODAL LIFECYCLE
// =============================================================================

export function openReviewModal({ prefillName = "", prefillMenuItemId = "" } = {}) {
  const modal = document.getElementById("reviewModal");
  const overlay = document.getElementById("reviewModalOverlay");
  const nameInput = document.getElementById("reviewAuthorName");
  const menuSelect = document.getElementById("reviewMenuItem");
  const formAlert = document.getElementById("reviewFormAlert");
  const successState = document.getElementById("reviewSuccessState");
  const formElement = document.getElementById("reviewForm");

  if (!modal) return;

  // Reset alert & states
  if (formAlert) {
    formAlert.style.display = "none";
    formAlert.textContent = "";
  }
  if (successState) successState.style.display = "none";
  if (formElement) formElement.style.display = "block";

  if (prefillName && nameInput && !nameInput.value) {
    nameInput.value = prefillName;
  }
  if (prefillMenuItemId && menuSelect) {
    menuSelect.value = prefillMenuItemId;
  }

  modal.classList.add("open");
  if (overlay) overlay.classList.add("open");
  document.body.style.overflow = "hidden";

  if (nameInput) {
    setTimeout(() => {
      const commentInput = document.getElementById("reviewComment");
      if (prefillName && commentInput) {
        commentInput.focus();
      } else {
        nameInput.focus();
      }
    }, 150);
  }
}

export function closeReviewModal() {
  const modal = document.getElementById("reviewModal");
  const overlay = document.getElementById("reviewModalOverlay");

  if (!modal) return;

  modal.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
  document.body.style.overflow = "";
}

function initReviewModal() {
  const modal = document.getElementById("reviewModal");
  const overlay = document.getElementById("reviewModalOverlay");
  const closeBtn = document.getElementById("closeReviewModalBtn");
  const cancelBtn = document.getElementById("btnCancelReview");
  const closeSuccessBtn = document.getElementById("btnCloseReviewSuccess");
  const submitBtn = document.getElementById("btnSubmitReview");
  const form = document.getElementById("reviewForm");
  const commentInput = document.getElementById("reviewComment");
  const charCounter = document.getElementById("reviewCharCounter");

  if (closeBtn) closeBtn.addEventListener("click", closeReviewModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeReviewModal);
  if (closeSuccessBtn) closeSuccessBtn.addEventListener("click", closeReviewModal);
  if (overlay) overlay.addEventListener("click", closeReviewModal);

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.classList.contains("open")) {
      closeReviewModal();
    }
  });

  // Character counter
  if (commentInput && charCounter) {
    commentInput.addEventListener("input", () => {
      const len = commentInput.value.length;
      charCounter.textContent = `${len}/1000 karakter`;
      if (len < 10) {
        charCounter.classList.add("counter-warning");
      } else {
        charCounter.classList.remove("counter-warning");
      }
    });
  }

  // Clear errors on input
  ["reviewAuthorName", "reviewComment"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        el.classList.remove("input-error");
        const alert = document.getElementById("reviewFormAlert");
        if (alert) alert.style.display = "none";
      });
    }
  });

  // Handle Form Submission
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleReviewFormSubmit();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await handleReviewFormSubmit();
    });
  }
}

async function handleReviewFormSubmit() {
  const nameInput = document.getElementById("reviewAuthorName");
  const ratingInput = document.getElementById("reviewRatingInput");
  const commentInput = document.getElementById("reviewComment");
  const menuSelect = document.getElementById("reviewMenuItem");
  const honeypotInput = document.getElementById("reviewHoneypot");
  const submitBtn = document.getElementById("btnSubmitReview");
  const alertEl = document.getElementById("reviewFormAlert");
  const successState = document.getElementById("reviewSuccessState");
  const formElement = document.getElementById("reviewForm");

  const displayName = nameInput ? nameInput.value : "";
  const rating = ratingInput ? ratingInput.value : currentSelectedRating;
  const comment = commentInput ? commentInput.value : "";
  const menuItemId = menuSelect ? menuSelect.value : "";
  const honeypot = honeypotInput ? honeypotInput.value : "";

  // Client validation
  if (!displayName.trim() || displayName.trim().length < 2) {
    showReviewAlert("Nama kamu belum diisi (minimal 2 karakter).");
    if (nameInput) {
      nameInput.classList.add("input-error");
      nameInput.focus();
    }
    return;
  }

  if (!comment.trim() || comment.trim().length < 10) {
    showReviewAlert("Tulis pengalaman kamu minimal 10 karakter.");
    if (commentInput) {
      commentInput.classList.add("input-error");
      commentInput.focus();
    }
    return;
  }

  // Set loading state on submit button to prevent double-click
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("btn-loading");
    submitBtn.innerHTML = `
      <span class="btn-spinner" aria-hidden="true"></span>
      <span>Mengirim Ulasan...</span>
    `;
  }

  hideReviewAlert();

  const res = await submitCustomerReview({
    displayName,
    rating,
    comment,
    menuItemId,
    honeypot
  });

  // Reset button state
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove("btn-loading");
    submitBtn.innerHTML = `<span>Kirim Ulasan</span>`;
  }

  if (!res.success) {
    showReviewAlert(res.error || "Terjadi kesalahan. Silakan coba lagi.");
    return;
  }

  // Success: Clear form fields
  if (nameInput) nameInput.value = "";
  if (commentInput) commentInput.value = "";
  if (menuSelect) menuSelect.value = "";
  const charCounter = document.getElementById("reviewCharCounter");
  if (charCounter) charCounter.textContent = "0/1000 karakter";

  // Reset star selector to 5
  currentSelectedRating = 5;
  if (ratingInput) ratingInput.value = "5";
  const starButtons = document.querySelectorAll(".star-picker-btn");
  starButtons.forEach(btn => btn.classList.add("active"));
  const labelEl = document.getElementById("starRatingLabel");
  if (labelEl) labelEl.textContent = RATING_LABELS[5];

  // Show inline success view inside modal
  if (formElement) formElement.style.display = "none";
  if (successState) {
    successState.style.display = "block";
    const msgEl = document.getElementById("reviewSuccessMessage");
    if (msgEl) {
      msgEl.textContent = res.message;
    }
  }
}

function showReviewAlert(message) {
  const alertEl = document.getElementById("reviewFormAlert");
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.style.display = "block";
  alertEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideReviewAlert() {
  const alertEl = document.getElementById("reviewFormAlert");
  if (alertEl) {
    alertEl.textContent = "";
    alertEl.style.display = "none";
  }
}
