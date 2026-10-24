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
      error: "Supabase belum terhubung di .env. Gunakan akun demo (Email: admin@siomayonline.com, Password: admin123) untuk masuk mode preview."
    };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (authError) throw authError;

    // Verify that the logged-in user is listed in public.admin_users
    const isOwner = await verifyIsOwner(authData.user.id);
    if (!isOwner) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: "Akses ditolak: Akun ini tidak terdaftar sebagai pemilik (owner) resmi Siomay Online."
      };
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
  if (!isSupabaseConfigured || !supabase) {
    if (typeof sessionStorage !== "undefined") {
      const stored = sessionStorage.getItem("siomay_demo_owner");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return null;

    const isOwner = await verifyIsOwner(session.user.id);
    if (!isOwner) return null;

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
// 2. FOOD MENU ITEMS (CRUD)
// =============================================================================

/**
 * Fetch all menu items from database (sorted by sort_order ASC, created_at ASC)
 */
export async function fetchAllMenuItems() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: true,
      items: [
        { id: "siomay-komplit", name: "Siomay Komplit Spesial", price: 25000, description: "5 Siomay Tenggiri + Tahu + Kentang + Telur + Bumbu Kacang Legit", image_url: "/images/hero.jpg", badge: "Paling Laris", portion: "1 Porsi (5 pcs)", rating: 5, is_best_seller: true, is_available: true, sort_order: 1 },
        { id: "siomay-original", name: "Siomay Original Tenggiri", price: 20000, description: "5 Siomay Tenggiri Murni kenyal gurih dengan bumbu kacang khas Bandung", image_url: "/images/hero.jpg", badge: "Favorit", portion: "1 Porsi (5 pcs)", rating: 4.9, is_best_seller: false, is_available: true, sort_order: 2 },
        { id: "batagor", name: "Batagor Gurih Renyah", price: 22000, description: "Batagor ikan tenggiri garing di luar lembut di dalam dengan bumbu kacang gurih", image_url: "/images/hero.jpg", badge: "Renyah", portion: "1 Porsi (4 pcs)", rating: 4.9, is_best_seller: false, is_available: true, sort_order: 3 },
        { id: "paket-hemat", name: "Paket Rame-Rame Keluarga", price: 65000, description: "15 Siomay campur komplit cocok untuk dinikmati bersama keluarga di rumah", image_url: "/images/hero.jpg", badge: "Hemat", portion: "Porsi Jumbo (15 pcs)", rating: 5, is_best_seller: true, is_available: true, sort_order: 4 }
      ]
    };
  }

  try {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { success: true, items: data || [] };
  } catch (err) {
    console.error("[CMS Menu] Gagal memuat menu:", err);
    return { success: false, items: [], error: err.message };
  }
}

/**
 * Create a new menu item
 */
export async function createMenuItem(itemData) {
  if (!supabase) return { success: false, error: "Database tidak tersedia." };

  try {
    const payload = {
      name: itemData.name.trim(),
      price: Math.max(0, parseInt(itemData.price, 10) || 0),
      description: (itemData.description || "").trim(),
      image_url: itemData.image_url || "/images/menu-original.jpg",
      badge: (itemData.badge || "").trim() || null,
      portion: (itemData.portion || "Porsi Mantap").trim(),
      rating: parseFloat(itemData.rating) || 4.9,
      is_best_seller: Boolean(itemData.is_best_seller),
      is_available: itemData.is_available !== false,
      sort_order: parseInt(itemData.sort_order, 10) || 0,
      slug: (itemData.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36)
    };

    const { data, error } = await supabase
      .from("menu_items")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return { success: true, item: data };
  } catch (err) {
    console.error("[CMS Menu] Gagal menambah menu:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing menu item
 */
export async function updateMenuItem(id, itemData) {
  if (!supabase) return { success: false, error: "Database tidak tersedia." };

  try {
    const payload = {
      name: itemData.name.trim(),
      price: Math.max(0, parseInt(itemData.price, 10) || 0),
      description: (itemData.description || "").trim(),
      image_url: itemData.image_url,
      badge: (itemData.badge || "").trim() || null,
      portion: (itemData.portion || "Porsi Mantap").trim(),
      rating: parseFloat(itemData.rating) || 4.9,
      is_best_seller: Boolean(itemData.is_best_seller),
      is_available: Boolean(itemData.is_available),
      sort_order: parseInt(itemData.sort_order, 10) || 0,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("menu_items")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, item: data };
  } catch (err) {
    console.error("[CMS Menu] Gagal memperbarui menu:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a menu item
 */
export async function deleteMenuItem(id) {
  if (!supabase) return { success: false, error: "Database tidak tersedia." };

  try {
    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("[CMS Menu] Gagal menghapus menu:", err);
    return { success: false, error: err.message };
  }
}

// =============================================================================
// 3. SITE SETTINGS (WhatsApp, Hero Banner, Promo Video)
// =============================================================================

/**
 * Fetch singleton site settings row
 */
export async function fetchSiteSettings() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: true,
      settings: {
        id: 1,
        brand_name: "Siomay Online",
        whatsapp_number: "6281234567890",
        default_order_message: "Halo Siomay Online, saya mau pesan siomay hangat untuk diantar sekarang.",
        hero_badge: "SIOMAY ONLINE",
        hero_title: "SIOMAY ASLI BANDUNG, DIBUAT FRESH SETIAP HARI",
        hero_subtitle: "Dibuat dengan ikan tenggiri asli pilihan dan resep bumbu kacang gurih legit warisan keluarga. Diantar hangat sampai di depan pintu rumahmu.",
        hero_cta_text: "Pesan Sekarang via WhatsApp",
        hero_image_url: "/images/hero.jpg",
        promo_video_url: null,
        promo_video_poster_url: null
      }
    };
  }

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;
    return { success: true, settings: data };
  } catch (err) {
    console.error("[CMS Settings] Gagal memuat pengaturan:", err);
    return { success: false, settings: null, error: err.message };
  }
}

/**
 * Update singleton site settings
 */
export async function updateSiteSettings(settingsData) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: true,
      settings: { id: 1, ...settingsData }
    };
  }

  try {
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

    const { data, error } = await supabase
      .from("site_settings")
      .upsert({ id: 1, ...payload })
      .select()
      .single();

    if (error) throw error;
    return { success: true, settings: data };
  } catch (err) {
    console.error("[CMS Settings] Gagal menyimpan pengaturan:", err);
    return { success: false, error: err.message };
  }
}

// =============================================================================
// 4. STORAGE / MEDIA UPLOAD
// =============================================================================

/**
 * Upload an image or video file to Supabase Storage ('media' bucket)
 */
export async function uploadMediaFile(file, folder = "menu") {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: "Supabase Storage belum terhubung." };
  }

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

  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("media")
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      path: filePath
    };
  } catch (err) {
    console.error("[CMS Storage] Upload error:", err);
    return {
      success: false,
      error: err.message || "Gagal mengunggah file ke media storage."
    };
  }
}
