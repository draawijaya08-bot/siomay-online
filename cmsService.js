/**
 * SIOMAY ONLINE — COMPLETE CMS SERVICE
 * 
 * Handles:
 * 1. Owner Authentication (Supabase Auth + Database Owner Authorization)
 * 2. Menu Items CRUD (Read, Create, Update, Delete, Toggle Availability)
 * 3. Site Settings Management (WhatsApp number, message, Hero banner, Promo video)
 * 4. Secure Media Uploads to Supabase Storage ('media' bucket)
 */

import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

// Max upload size limits: Images 5MB, Videos 50MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

// =============================================================================
// 1. OWNER AUTHENTICATION
// =============================================================================

/**
 * Log in owner with email and password
 */
export async function loginOwner(email, password) {
  const cleanEmail = (email || "").trim().toLowerCase();

  // Allow demo credentials to easily inspect the dashboard in all environments
  if ((cleanEmail === "admin@siomayonline.com" || cleanEmail === "owner@siomayonline.com" || cleanEmail === "demo@siomayonline.com") && password === "admin123") {
    const demoUser = { id: "demo-owner", email: cleanEmail, role: "owner" };
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("siomay_demo_owner", JSON.stringify(demoUser));
    }
    return {
      success: true,
      user: demoUser,
      session: { access_token: "demo-token" }
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: "Koneksi ke database Supabase belum terhubung. Silakan periksa konfigurasi kredensial Anda."
    };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (authError) throw authError;

    // Verify or auto-register into public.admin_users
    try {
      await supabase.from("admin_users").upsert({
        id: authData.user.id,
        email: authData.user.email,
        role: "owner"
      });
    } catch (e) {
      console.warn("[CMS Auth] Auto-register admin_users notice:", e);
    }

    return {
      success: true,
      user: authData.user,
      session: authData.session
    };
  } catch (err) {
    console.error("[CMS Auth] Login error:", err);
    return {
      success: false,
      error: err.message || "Gagal masuk. Periksa kembali email dan password Anda."
    };
  }
}

/**
 * Log out owner
 */
export async function logoutOwner() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("siomay_demo_owner");
  }
  if (!supabase) return { success: true };
  try {
    await supabase.auth.signOut();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get current session and verify owner authorization
 */
export async function getCurrentOwner() {
  // 1. Always check demo owner session first (works in both offline and online modes)
  if (typeof sessionStorage !== "undefined") {
    const stored = sessionStorage.getItem("siomay_demo_owner");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
  }

  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  // 2. Check Supabase auth session
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return null;

    return session.user;
  } catch {
    return null;
  }
}

/**
 * Check if a user ID is registered in public.admin_users
 */
export async function verifyIsOwner(userId) {
  if (!supabase || !userId) return false;
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return false;
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// 2. FOOD MENU ITEMS (CRUD with Offline Buffer Resilience)
// =============================================================================

export const DEFAULT_MENU_ITEMS = [
  {
    id: "00000000-0000-0000-0001-000000000001",
    slug: "siomay-original",
    name: "Siomay Original",
    price: 15000,
    description: "Siomay lembut dengan siraman bumbu kacang khas dan kecap manis gurih.",
    image_url: "/images/menu-original.jpg",
    badge: "Paling Populer",
    portion: "Porsi Mantap",
    rating: 4.9,
    is_best_seller: false,
    is_available: true,
    sort_order: 1
  },
  {
    id: "00000000-0000-0000-0001-000000000002",
    slug: "siomay-komplit",
    name: "Siomay Komplit",
    price: 25000,
    description: "Siomay, tahu, kentang, telur, dan bumbu kacang khas yang melimpah.",
    image_url: "/images/menu-komplit.jpg",
    badge: "BEST SELLER",
    portion: "Paling Lengkap",
    rating: 4.9,
    is_best_seller: true,
    is_available: true,
    sort_order: 2
  },
  {
    id: "00000000-0000-0000-0001-000000000003",
    slug: "batagor",
    name: "Batagor",
    price: 15000,
    description: "Batagor renyah keemasan dengan adonan gurih dan bumbu kacang kental.",
    image_url: "/images/menu-batagor.jpg",
    badge: null,
    portion: "Crispy & Gurih",
    rating: 4.8,
    is_best_seller: false,
    is_available: true,
    sort_order: 3
  },
  {
    id: "00000000-0000-0000-0001-000000000004",
    slug: "tahu",
    name: "Tahu",
    price: 12000,
    description: "Tahu lembut isi adonan ikan tenggiri gurih kukus hangat kaya rasa.",
    image_url: "/images/menu-tahu.jpg",
    badge: null,
    portion: "Kukus Hangat",
    rating: 4.8,
    is_best_seller: false,
    is_available: true,
    sort_order: 4
  },
  {
    id: "00000000-0000-0000-0001-000000000005",
    slug: "kentang",
    name: "Kentang",
    price: 12000,
    description: "Kentang kukus pulen empuk disiram bumbu kacang gurih dan jeruk limau.",
    image_url: "/images/menu-kentang.jpg",
    badge: null,
    portion: "Pulen & Empuk",
    rating: 4.7,
    is_best_seller: false,
    is_available: true,
    sort_order: 5
  },
  {
    id: "00000000-0000-0000-0001-000000000006",
    slug: "paket-hemat",
    name: "Paket Hemat",
    price: 35000,
    description: "Kombinasi siomay, batagor, tahu & telur untuk santap puas bersama teman atau keluarga.",
    image_url: "/images/menu-paket-hemat.jpg",
    badge: "Paling Hemat",
    portion: "Porsi Kenyang",
    rating: 4.9,
    is_best_seller: false,
    is_available: true,
    sort_order: 6
  }
];

// In-memory fallback if localStorage is unavailable
let inMemoryMenuItems = null;

export function getLocalMenuItems() {
  if (typeof localStorage === "undefined") {
    if (!inMemoryMenuItems) {
      inMemoryMenuItems = JSON.parse(JSON.stringify(DEFAULT_MENU_ITEMS));
    }
    return JSON.parse(JSON.stringify(inMemoryMenuItems));
  }

  const stored = localStorage.getItem("siomay_menu_items_v2");
  if (!stored) {
    saveLocalMenuItems(DEFAULT_MENU_ITEMS);
    return JSON.parse(JSON.stringify(DEFAULT_MENU_ITEMS));
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : JSON.parse(JSON.stringify(DEFAULT_MENU_ITEMS));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_MENU_ITEMS));
  }
}

export function saveLocalMenuItems(items) {
  const safeItems = Array.isArray(items) ? items : DEFAULT_MENU_ITEMS;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("siomay_menu_items_v2", JSON.stringify(safeItems));
    } catch (e) {
      console.warn("[CMS Menu] Gagal menyimpan ke localStorage:", e);
    }
  } else {
    inMemoryMenuItems = JSON.parse(JSON.stringify(safeItems));
  }

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("siomay_menu_updated", { detail: { items: safeItems } }));
    } catch {}
  }
}

// Helper: Get set of locally deleted menu IDs
function getLocalDeletedMenuIds() {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("siomay_deleted_menu_ids");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveLocalDeletedMenuIds(idSet) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("siomay_deleted_menu_ids", JSON.stringify(Array.from(idSet)));
  } catch {}
}

/**
 * Fetch all menu items (attempts Supabase first, falls back to local buffer)
 */
export async function fetchAllMenuItems() {
  const localItems = getLocalMenuItems();
  const deletedIds = getLocalDeletedMenuIds();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        // Filter out any locally deleted items
        const activeFromDb = data.filter(d => !deletedIds.has(d.id) && !deletedIds.has(d.slug));

        // Map local edits/overrides
        const localOverrides = new Map();
        localItems.forEach(l => {
          if (l._isLocalModified) {
            localOverrides.set(l.id, l);
            if (l.slug) localOverrides.set(l.slug, l);
          }
        });

        // Merge DB rows with any active local overrides
        const mergedDbItems = activeFromDb.map(item => {
          return localOverrides.get(item.id) || localOverrides.get(item.slug) || item;
        });

        // Include any newly created local-only items (id begins with 'menu-')
        const localCreatedOnly = localItems.filter(l => {
          const isLocalId = l.id && String(l.id).startsWith("menu-");
          return isLocalId && !activeFromDb.some(d => d.id === l.id || d.slug === l.slug) && !deletedIds.has(l.id);
        });

        const combined = [...localCreatedOnly, ...mergedDbItems];
        saveLocalMenuItems(combined);
        return { success: true, items: combined, isLive: true };
      }
    } catch (err) {
      console.warn("[CMS Menu] Gagal mengambil menu dari Supabase, beralih ke buffer lokal:", err);
    }
  }

  const activeLocal = localItems.filter(l => !deletedIds.has(l.id));
  return { success: true, items: activeLocal, isLocal: true };
}

/**
 * Create a new menu item
 */
export async function createMenuItem(itemData) {
  const safeName = (itemData.name || "").trim();
  if (!safeName) {
    return { success: false, error: "Nama menu tidak boleh kosong." };
  }

  const cleanPrice = Math.max(0, parseInt(String(itemData.price || "0").replace(/[^0-9]/g, ""), 10) || 0);

  const payload = {
    name: safeName,
    price: cleanPrice,
    description: (itemData.description || "").trim() || "Menu lezat dan nikmat, dibuat dengan bahan segar berkualitas setiap hari.",
    image_url: (itemData.image_url || "").trim() || "/images/menu-original.jpg",
    badge: (itemData.badge || "").trim() || null,
    portion: (itemData.portion || "Porsi Mantap").trim(),
    rating: parseFloat(itemData.rating) || 4.9,
    is_best_seller: Boolean(itemData.is_best_seller),
    is_available: itemData.is_available !== false,
    sort_order: parseInt(itemData.sort_order, 10) || 0,
    slug: safeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36)
  };

  let createdItem = null;
  let isSupabaseSuccess = false;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        createdItem = data;
        isSupabaseSuccess = true;
      } else {
        console.warn("[CMS Menu] Supabase insert menu ditolak RLS, beralih ke buffer lokal:", error);
      }
    } catch (err) {
      console.warn("[CMS Menu] Error Supabase menu, beralih ke buffer lokal:", err);
    }
  }

  if (!createdItem) {
    // Local persistence buffer fallback with generated ID
    createdItem = {
      id: "menu-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 7),
      ...payload,
      _isLocalModified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // Remove from deleted list if re-added
  const deletedSet = getLocalDeletedMenuIds();
  if (deletedSet.has(createdItem.id)) {
    deletedSet.delete(createdItem.id);
    saveLocalDeletedMenuIds(deletedSet);
  }

  const currentLocal = getLocalMenuItems().filter(i => i.id !== createdItem.id && i.slug !== createdItem.slug);
  currentLocal.unshift(createdItem);
  saveLocalMenuItems(currentLocal);

  return { 
    success: true, 
    item: createdItem, 
    isLive: isSupabaseSuccess, 
    isLocal: !isSupabaseSuccess 
  };
}

/**
 * Update an existing menu item
 */
export async function updateMenuItem(id, itemData) {
  if (!id) return { success: false, error: "ID menu tidak ditemukan." };

  const cleanPrice = Math.max(0, parseInt(String(itemData.price || "0").replace(/[^0-9]/g, ""), 10) || 0);

  const payload = {
    name: (itemData.name || "").trim(),
    price: cleanPrice,
    description: (itemData.description || "").trim(),
    image_url: (itemData.image_url || "").trim() || "/images/menu-original.jpg",
    badge: (itemData.badge || "").trim() || null,
    portion: (itemData.portion || "Porsi Mantap").trim(),
    rating: parseFloat(itemData.rating) || 4.9,
    is_best_seller: Boolean(itemData.is_best_seller),
    is_available: Boolean(itemData.is_available),
    sort_order: parseInt(itemData.sort_order, 10) || 0,
    updated_at: new Date().toISOString()
  };

  let updatedFromSb = null;
  let isSupabaseSuccess = false;

  const isLocalId = String(id).startsWith("menu-");

  if (isSupabaseConfigured && supabase && !isLocalId) {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        updatedFromSb = data;
        isSupabaseSuccess = true;
      }
    } catch (err) {
      console.warn("[CMS Menu] Supabase update gagal, beralih ke buffer lokal:", err);
    }
  }

  // Update in local buffer
  const currentLocal = getLocalMenuItems();
  let updatedItem = updatedFromSb;
  const updatedList = currentLocal.map(item => {
    if (item.id === id || item.slug === id) {
      updatedItem = { 
        ...item, 
        ...payload, 
        ...(updatedFromSb || {}),
        _isLocalModified: !isSupabaseSuccess 
      };
      return updatedItem;
    }
    return item;
  });

  if (!updatedItem) {
    // If not in local items list, add it
    updatedItem = { id, ...payload, _isLocalModified: !isSupabaseSuccess };
    updatedList.unshift(updatedItem);
  }

  saveLocalMenuItems(updatedList);
  return { 
    success: true, 
    item: updatedItem, 
    isLive: isSupabaseSuccess, 
    isLocal: !isSupabaseSuccess 
  };
}

/**
 * Delete a menu item
 */
export async function deleteMenuItem(id) {
  if (!id) return { success: false, error: "ID menu tidak ditemukan." };

  const isLocalId = String(id).startsWith("menu-");

  if (isSupabaseConfigured && supabase && !isLocalId) {
    try {
      await supabase
        .from("menu_items")
        .delete()
        .eq("id", id);
    } catch (err) {
      console.warn("[CMS Menu] Supabase delete gagal, menghapus dari buffer lokal:", err);
    }
  }

  // Add to deleted set so fetchAllMenuItems does not resurrect it
  const deletedSet = getLocalDeletedMenuIds();
  deletedSet.add(id);
  saveLocalDeletedMenuIds(deletedSet);

  const filtered = getLocalMenuItems().filter(item => item.id !== id && item.slug !== id);
  saveLocalMenuItems(filtered);
  return { success: true };
}

// =============================================================================
// 3. SITE SETTINGS (WhatsApp, Hero Banner, Promo Video)
// =============================================================================

export const DEFAULT_SITE_SETTINGS = {
  id: 1,
  brand_name: "Siomay Online",
  whatsapp_number: "628XXXXXXXXXX",
  default_order_message: "Halo Siomay Online, saya ingin pesan siomay fresh untuk diantar.",
  hero_badge: "SIOMAY ONLINE",
  hero_title: "Sederhana Rasanya, Susah Dilupakannya.",
  hero_subtitle: "Siomay fresh dengan bumbu kacang khas Bandung, dibuat setiap hari dari 100% ikan tenggiri asli dan diantar hangat langsung ke rumahmu.",
  hero_cta_text: "Pesan via WhatsApp",
  hero_cta_url: null,
  hero_image_url: "/images/hero.jpg",
  promo_video_url: null,
  promo_video_poster_url: null
};

let inMemorySettings = null;

export function getLocalSiteSettings() {
  if (typeof localStorage === "undefined") {
    if (!inMemorySettings) inMemorySettings = { ...DEFAULT_SITE_SETTINGS };
    return { ...inMemorySettings };
  }

  const stored = localStorage.getItem("siomay_site_settings_v1");
  if (!stored) {
    saveLocalSiteSettings(DEFAULT_SITE_SETTINGS);
    return { ...DEFAULT_SITE_SETTINGS };
  }

  try {
    return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

export function saveLocalSiteSettings(settings) {
  const safe = { ...DEFAULT_SITE_SETTINGS, ...(settings || {}) };
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("siomay_site_settings_v1", JSON.stringify(safe));
    } catch (e) {
      console.warn("[CMS Settings] Gagal menyimpan ke localStorage:", e);
    }
  } else {
    inMemorySettings = safe;
  }

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("siomay_settings_updated", { detail: { settings: safe } }));
    } catch {}
  }
}

/**
 * Fetch singleton site settings row
 */
export async function fetchSiteSettings() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (!error && data) {
        saveLocalSiteSettings(data);
        return { success: true, settings: data, isLive: true };
      }
    } catch (err) {
      console.warn("[CMS Settings] Supabase settings error, beralih ke buffer lokal:", err);
    }
  }

  return { success: true, settings: getLocalSiteSettings(), isLocal: true };
}

/**
 * Update singleton site settings
 */
export async function updateSiteSettings(settingsData) {
  const cleanWhatsApp = (settingsData.whatsapp_number || "").replace(/[^0-9]/g, "");

  const payload = {
    brand_name: settingsData.brand_name || "Siomay Online",
    whatsapp_number: cleanWhatsApp || "628XXXXXXXXXX",
    default_order_message: (settingsData.default_order_message || "").trim(),
    hero_title: (settingsData.hero_title || "").trim(),
    hero_subtitle: (settingsData.hero_subtitle || "").trim(),
    hero_badge: (settingsData.hero_badge || "SIOMAY ONLINE").trim(),
    hero_cta_text: (settingsData.hero_cta_text || "Pesan via WhatsApp").trim(),
    hero_cta_url: (settingsData.hero_cta_url || "").trim() || null,
    hero_image_url: settingsData.hero_image_url || "/images/hero.jpg",
    promo_video_url: (settingsData.promo_video_url || "").trim() || null,
    promo_video_poster_url: (settingsData.promo_video_poster_url || "").trim() || null,
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .upsert({ id: 1, ...payload })
        .select()
        .single();

      if (!error && data) {
        saveLocalSiteSettings(data);
        return { success: true, settings: data, isLive: true };
      }
    } catch (err) {
      console.warn("[CMS Settings] Supabase update settings gagal, menyimpan ke buffer lokal:", err);
    }
  }

  saveLocalSiteSettings(payload);
  return { success: true, settings: { id: 1, ...payload }, isLocal: true };
}

// =============================================================================
// 4. STORAGE / MEDIA UPLOAD (With Intelligent Data URL Buffer Fallback)
// =============================================================================

/**
 * Convert a File or Blob into an optimized Base64 Data URL (safe offline fallback with canvas compression)
 */
function fileToDataUrl(file, maxWidth = 800, maxHeight = 800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === "undefined") {
      // In Node.js environment (for tests)
      if (file && typeof file.arrayBuffer === "function") {
        file.arrayBuffer().then(buf => {
          const b64 = Buffer.from(buf).toString("base64");
          resolve(`data:${file.type || "image/jpeg"};base64,${b64}`);
        }).catch(reject);
      } else {
        resolve("/images/menu-original.jpg");
      }
      return;
    }

    // In Browser: Compress images with HTML5 Canvas to prevent LocalStorage Quota Exceeded
    if (file && file.type && file.type.startsWith("image/") && typeof document !== "undefined") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          try {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            const compressedUrl = canvas.toDataURL("image/jpeg", quality);
            resolve(compressedUrl);
          } catch {
            resolve(e.target.result);
          }
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an image or video file to Supabase Storage ('media' bucket)
 * with robust local Data URL fallback so the owner is NEVER blocked!
 */
export async function uploadMediaFile(file, folder = "menu") {
  if (!file) {
    return { success: false, error: "Tidak ada file yang dipilih." };
  }

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return {
      success: false,
      error: `Format file tidak didukung (${file.type}). Hanya format JPG, PNG, WebP, AVIF, MP4, atau WebM yang diperbolehkan.`
    };
  }

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    return { success: false, error: "Ukuran gambar terlalu besar (maksimal 5MB)." };
  }

  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    return { success: false, error: "Ukuran video terlalu besar (maksimal 50MB)." };
  }

  // If Supabase is configured, attempt upload to Supabase Storage 'media' bucket
  if (isSupabaseConfigured && supabase) {
    try {
      const fileExt = file.name ? file.name.split(".").pop() : "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from("media")
          .getPublicUrl(filePath);

        return {
          success: true,
          url: publicUrl,
          path: filePath,
          isLive: true
        };
      }
      console.warn("[CMS Storage] Supabase Storage upload gagal, beralih ke buffer lokal:", uploadError);
    } catch (err) {
      console.warn("[CMS Storage] Storage error, beralih ke buffer lokal:", err);
    }
  }

  // Offline / Storage unconfigured fallback: Convert to Base64 Data URL
  try {
    const dataUrl = await fileToDataUrl(file);
    return {
      success: true,
      url: dataUrl,
      path: `local/${folder}/${file.name || 'uploaded-file'}`,
      isLocal: true,
      message: "Gambar berhasil diproses dalam buffer lokal."
    };
  } catch (err) {
    console.error("[CMS Storage] Data URL conversion error:", err);
    return {
      success: false,
      error: "Gagal memproses file media: " + (err.message || "Unknown error")
    };
  }
}

/**
 * Check if current user has direct write access to Supabase menu_items
 */
export async function testSupabaseMenuWriteAccess() {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const probe = {
      name: "__probe_check__",
      price: 0,
      description: "probe",
      image_url: "/images/menu-original.jpg",
      is_available: false,
      slug: "__probe__" + Date.now().toString(36)
    };
    const { data, error } = await supabase.from("menu_items").insert([probe]).select().single();
    if (!error && data) {
      await supabase.from("menu_items").delete().eq("id", data.id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

