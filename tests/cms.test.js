/**
 * Unit & Integration Test Suite for Siomay Online Complete Admin CMS
 * Run with: node tests/cms.test.js
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== RUNNING SIOMAY ONLINE COMPLETE ADMIN CMS TEST SUITE ===\n");

// -----------------------------------------------------------------------------
// Test 1: Complete CMS SQL Migration Verification
// -----------------------------------------------------------------------------
console.log("Test 1: Complete CMS SQL Schema & RLS Verification...");
{
  const sqlPath = path.resolve(import.meta.dirname, "../supabase/migrations/20261024_complete_admin_cms.sql");
  assert.ok(fs.existsSync(sqlPath), "Complete CMS SQL migration file must exist");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  // Admin users table & function
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS public.admin_users"), "Creates admin_users table");
  assert.ok(sql.includes("CREATE OR REPLACE FUNCTION public.is_admin_owner()"), "Creates is_admin_owner function");

  // Food Menu table & RLS
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS public.menu_items"), "Creates menu_items table");
  assert.ok(sql.includes("ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;"), "Enables RLS on menu_items");
  assert.ok(sql.includes("CREATE POLICY \"Public can view menu items\""), "Allows public read on menu_items");
  assert.ok(sql.includes("public.is_admin_owner()"), "Enforces is_admin_owner for menu modifications");

  // Site Settings singleton & RLS
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS public.site_settings"), "Creates site_settings table");
  assert.ok(sql.includes("ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;"), "Enables RLS on site_settings");
  assert.ok(sql.includes("CREATE POLICY \"Public can view site settings\""), "Allows public read on site_settings");
  assert.ok(sql.includes("CREATE POLICY \"Owner can update site settings\""), "Restricts site_settings updates to owner");

  // Storage Media bucket & policies
  assert.ok(sql.includes("'media'"), "Configures 'media' storage bucket");
  assert.ok(sql.includes("CREATE POLICY \"Public media access\""), "Public read access on media storage");
  assert.ok(sql.includes("CREATE POLICY \"Owner can upload media\""), "Restricts media uploads to authorized owner");

  console.log("✓ SQL migration contains all required tables, triggers, storage bucket, and RLS policies.");
}

// -----------------------------------------------------------------------------
// Test 2: Admin HTML Structure & Views
// -----------------------------------------------------------------------------
console.log("\nTest 2: admin.html Complete CMS Dashboard Views Verification...");
{
  const htmlPath = path.resolve(import.meta.dirname, "../admin.html");
  assert.ok(fs.existsSync(htmlPath), "admin.html exists");
  const html = fs.readFileSync(htmlPath, "utf-8");

  // Auth screen
  assert.ok(html.includes('id="authView"'), "Contains Auth login screen");
  assert.ok(html.includes('id="ownerEmail"'), "Contains owner email input");
  assert.ok(html.includes('id="ownerPassword"'), "Contains owner password input");

  // CMS Dashboard Layout
  assert.ok(html.includes('id="cmsDashboardLayout"'), "Contains CMS dashboard layout");
  assert.ok(html.includes('id="cmsSidebar"'), "Contains responsive sidebar");
  assert.ok(html.includes('data-target-view="viewOverview"'), "Contains Overview nav tab");
  assert.ok(html.includes('data-target-view="viewMenu"'), "Contains Menu nav tab");
  assert.ok(html.includes('data-target-view="viewContent"'), "Contains Content/Banner nav tab");
  assert.ok(html.includes('data-target-view="viewWhatsApp"'), "Contains WhatsApp nav tab");
  assert.ok(html.includes('data-target-view="viewReviews"'), "Contains Reviews nav tab");

  // Management Views
  assert.ok(html.includes('id="viewMenu"'), "Contains Menu management view");
  assert.ok(html.includes('id="menuModal"'), "Contains Add/Edit menu modal dialog");
  assert.ok(html.includes('id="viewContent"'), "Contains Banner & Video promo view");
  assert.ok(html.includes('id="viewWhatsApp"'), "Contains WhatsApp settings view");
  assert.ok(html.includes('id="viewReviews"'), "Contains Reviews moderation view");

  // Demo Account Box & 1-Click Login
  assert.ok(html.includes('id="btnQuickDemoLogin"'), "Contains 1-Click demo login button");
  assert.ok(html.includes("admin@siomayonline.com"), "Displays demo admin email");
  assert.ok(html.includes("admin123"), "Displays demo admin password");

  console.log("✓ admin.html contains all 5 required CMS management views, modal controls, and demo admin login.");
}

// -----------------------------------------------------------------------------
// Test 3: Vercel & Routing Configuration
// -----------------------------------------------------------------------------
console.log("\nTest 3: Vercel & Vite Routing Configuration...");
{
  const vercelPath = path.resolve(import.meta.dirname, "../vercel.json");
  assert.ok(fs.existsSync(vercelPath), "vercel.json exists");
  const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf-8"));
  assert.ok(Array.isArray(vercel.rewrites), "Vercel rewrites configured");
  const hasAdminRewrite = vercel.rewrites.some(r => r.source === "/admin" && r.destination === "/admin.html");
  assert.ok(hasAdminRewrite, "Rewrites /admin to /admin.html");

  const vitePath = path.resolve(import.meta.dirname, "../vite.config.js");
  const viteConfig = fs.readFileSync(vitePath, "utf-8");
  assert.ok(viteConfig.includes("admin.html"), "Vite bundles admin.html as rollup input");
  assert.ok(viteConfig.includes("/admin"), "Vite dev server rewrites /admin to admin.html");

  console.log("✓ Vercel and Vite correctly route /admin to admin.html.");
}

// -----------------------------------------------------------------------------
// Test 4: Public Synchronization Logic in main.js
// -----------------------------------------------------------------------------
console.log("\nTest 4: Public Website Backend Synchronization...");
{
  const mainPath = path.resolve(import.meta.dirname, "../main.js");
  const main = fs.readFileSync(mainPath, "utf-8");

  assert.ok(main.includes("activeProducts"), "Exports dynamic activeProducts");
  assert.ok(main.includes("syncPublicWebsiteFromBackend"), "Contains backend synchronization function");
  assert.ok(main.includes("renderPromoVideoOnPublicSite"), "Supports dynamic promotional video embedding");
  assert.ok(main.includes("Stok Habis"), "Renders stock out indicators for unavailable items");

  console.log("✓ main.js contains dynamic sync for menu, WhatsApp, banner, and promo video.");
}

// -----------------------------------------------------------------------------
// Test 5: Demo Admin Authentication Lifecycle
// -----------------------------------------------------------------------------
console.log("\nTest 5: Demo Admin Authentication & Session...");
{
  const { loginOwner, logoutOwner, getCurrentOwner } = await import("../cmsService.js");

  // Valid demo login
  const res = await loginOwner("admin@siomayonline.com", "admin123");
  assert.equal(res.success, true, "Demo login must succeed");
  assert.equal(res.user.email, "admin@siomayonline.com");
  assert.equal(res.user.role, "owner");

  // Invalid password
  const resBad = await loginOwner("admin@siomayonline.com", "wrongpassword");
  assert.equal(resBad.success, false, "Invalid password must fail");

  await logoutOwner();
  console.log("✓ Demo admin authentication functions reliably.");
}

// -----------------------------------------------------------------------------
// Test 6: Media Upload Buffer Resilience (uploadMediaFile)
// -----------------------------------------------------------------------------
console.log("\nTest 6: Media Upload Buffer Resilience (Offline / Unconnected Supabase)...");
{
  const { uploadMediaFile } = await import("../cmsService.js");

  // A. Format validation
  const badFile = { name: "malicious.exe", type: "application/x-msdownload", size: 1024 };
  const resBad = await uploadMediaFile(badFile, "menu");
  assert.equal(resBad.success, false, "Disallows unsupported file extensions");

  // B. Size limit validation (> 5MB)
  const hugeFile = { name: "huge.jpg", type: "image/jpeg", size: 6 * 1024 * 1024 };
  const resHuge = await uploadMediaFile(hugeFile, "menu");
  assert.equal(resHuge.success, false, "Disallows files exceeding 5MB");

  // C. Valid file offline buffer fallback
  const validFile = { 
    name: "siomay-spesial.jpg", 
    type: "image/jpeg", 
    size: 50 * 1024,
    arrayBuffer: async () => Buffer.from("fake-image-bytes")
  };
  const resValid = await uploadMediaFile(validFile, "menu");
  assert.equal(resValid.success, true, "Upload must succeed with offline Data URL fallback");
  assert.ok(resValid.url, "Must return an image URL");
  assert.ok(resValid.isLocal, "Must indicate local buffer mode when Supabase is unconfigured");

  console.log("✓ Media upload validates types, size limits, and successfully converts to safe data URL buffer.");
}

// -----------------------------------------------------------------------------
// Test 7: Food Menu Items Offline Persistence & CRUD
// -----------------------------------------------------------------------------
console.log("\nTest 7: Food Menu CRUD & Local Persistence Buffer...");
{
  const { 
    fetchAllMenuItems, 
    createMenuItem, 
    updateMenuItem, 
    deleteMenuItem,
    getLocalMenuItems,
    saveLocalMenuItems 
  } = await import("../cmsService.js");

  // 1. Initial list has at least default items
  const initial = await fetchAllMenuItems();
  assert.equal(initial.success, true);
  assert.ok(initial.items.length >= 4, "Initial menu items must exist");

  // 2. Add new menu item
  const newProductPayload = {
    name: "Siomay Telur Asin Gurih",
    price: 28000,
    description: "Siomay premium isi telur asin gurih melimpah bumbu kacang.",
    image_url: "data:image/jpeg;base64,samplebase64",
    portion: "Porsi 5 pcs",
    rating: 5.0,
    is_best_seller: true,
    is_available: true
  };

  const createRes = await createMenuItem(newProductPayload);
  assert.equal(createRes.success, true, "Create menu item must succeed");
  assert.ok(createRes.item.id, "Must generate an ID");
  assert.equal(createRes.item.name, "Siomay Telur Asin Gurih");

  // 3. Verify it is now present in fetchAllMenuItems
  const afterAdd = await fetchAllMenuItems();
  const found = afterAdd.items.find(i => i.name === "Siomay Telur Asin Gurih");
  assert.ok(found, "Newly added menu item must be present in menu list");
  assert.equal(found.price, 28000);

  // 4. Update the menu item
  const updateRes = await updateMenuItem(found.id, {
    ...found,
    price: 30000,
    is_available: false
  });
  assert.equal(updateRes.success, true, "Update menu item must succeed");
  assert.equal(updateRes.item.price, 30000);
  assert.equal(updateRes.item.is_available, false);

  // 5. Delete the created item
  const deleteRes = await deleteMenuItem(found.id);
  assert.equal(deleteRes.success, true, "Delete menu item must succeed");

  const afterDelete = await fetchAllMenuItems();
  const deletedFound = afterDelete.items.find(i => i.id === found.id);
  assert.equal(deletedFound, undefined, "Deleted item must no longer exist");

  console.log("✓ Menu item Create, Read, Update, Delete (CRUD) works flawlessly with local persistence.");
}

console.log("\n=======================================================");
console.log("ALL COMPLETE ADMIN CMS TESTS PASSED (100% OK)");
console.log("=======================================================");
