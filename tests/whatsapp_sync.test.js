import assert from "node:assert/strict";
import { 
  DEFAULT_SITE_SETTINGS, 
  getLocalSiteSettings, 
  saveLocalSiteSettings, 
  fetchSiteSettings, 
  updateSiteSettings,
  getSyncQueue,
  clearSyncQueue 
} from "../cmsService.js";
import { 
  CONFIG, 
  getCleanWhatsAppNumber, 
  getWhatsAppBaseUrl, 
  buildWhatsAppOrderUrl, 
  applySiteSettingsToUI 
} from "../main.js";

console.log("=== RUNNING WHATSAPP CMS & CLIENT-SIDE SYNC TEST SUITE ===");

// -----------------------------------------------------------------------------
// Test 1: Config Initial State and Sanitization
// -----------------------------------------------------------------------------
console.log("\nTest 1: WhatsApp Initial State & Sanitization...");
{
  assert.ok(CONFIG.whatsappNumber, "CONFIG contains whatsappNumber property");
  assert.ok(CONFIG.whatsappBaseUrl.startsWith("https://wa.me/"), "Base URL points to wa.me");
  
  const testSummary = {
    items: [{ product: { name: "Siomay Original", price: 15000 }, quantity: 2, subtotal: 30000 }],
    itemCount: 2,
    total: 30000
  };
  const testCustomer = {
    name: "Budi Santoso",
    phone: "081234567890",
    address: "Jl. Pemuda No. 10",
    note: "Bumbu kacang dipisah"
  };

  const orderUrl = buildWhatsAppOrderUrl(testSummary, testCustomer);
  assert.ok(orderUrl.startsWith("https://wa.me/"), "Order URL is generated correctly");
  assert.ok(orderUrl.includes("text="), "Order URL includes text parameter");
  console.log("✓ WhatsApp initial state and URL generation verified.");
}

// -----------------------------------------------------------------------------
// Test 2: CMS Update and Dynamic Clientside Catching
// -----------------------------------------------------------------------------
console.log("\nTest 2: CMS Update and Clientside Dynamic Synchronization...");
{
  clearSyncQueue();
  const newWa = "6281299998888";
  const newMsg = "Halo Siomay Online, saya mau pesan catering.";

  // Simulate CMS updating WhatsApp settings
  const updateRes = await updateSiteSettings({
    whatsapp_number: newWa,
    default_order_message: newMsg
  });

  assert.equal(updateRes.success, true, "updateSiteSettings succeeded");
  assert.equal(updateRes.settings.whatsapp_number, newWa, "Saved number is normalized");
  assert.equal(updateRes.settings.default_order_message, newMsg, "Saved message updated");

  // Verify Clientside applySiteSettingsToUI catches and updates CONFIG
  applySiteSettingsToUI(updateRes.settings);

  assert.equal(CONFIG.whatsappNumber, newWa, "CONFIG.whatsappNumber was updated by applySiteSettingsToUI");
  assert.equal(CONFIG.defaultOrderMessage, newMsg, "CONFIG.defaultOrderMessage was updated");
  assert.equal(getCleanWhatsAppNumber(), newWa, "getCleanWhatsAppNumber reflects new number");
  assert.equal(getWhatsAppBaseUrl(), `https://wa.me/${newWa}`, "getWhatsAppBaseUrl reflects new number");

  const newOrderUrl = buildWhatsAppOrderUrl(
    { items: [], itemCount: 0, total: 0 },
    { name: "Andi", phone: "081111", address: "Jl. Baru", note: "" }
  );
  assert.ok(newOrderUrl.startsWith(`https://wa.me/${newWa}`), "Checkout order URL routes to updated WhatsApp number");
  console.log("✓ Clientside catches CMS update immediately and updates order URLs.");
}

// -----------------------------------------------------------------------------
// Test 3: Uncommitted Offline Sync Protection
// -----------------------------------------------------------------------------
console.log("\nTest 3: Offline Sync Queue Protection from Stale Cloud Overwrite...");
{
  clearSyncQueue();
  const offlineWa = "628555555555";
  
  // Save locally and simulate pending sync queue
  saveLocalSiteSettings({ ...DEFAULT_SITE_SETTINGS, whatsapp_number: offlineWa });
  
  // Directly enqueue an UPDATE_SETTINGS action
  const { enqueueSyncAction } = await import("../cmsService.js");
  enqueueSyncAction({
    type: "UPDATE_SETTINGS",
    corePayload: { id: 1, whatsapp_number: offlineWa },
    fullSettings: { ...DEFAULT_SITE_SETTINGS, whatsapp_number: offlineWa }
  });

  // fetchSiteSettings should recognize pending uncommitted action and NOT overwrite with stale data
  const res = await fetchSiteSettings();
  assert.equal(res.settings.whatsapp_number, offlineWa, "Pending uncommitted update is preserved");
  
  applySiteSettingsToUI(res.settings);
  assert.equal(CONFIG.whatsappNumber, offlineWa, "Client UI updates to pending settings");
  console.log("✓ Pending local settings are protected from stale cloud overwrite.");
}

console.log("\n=======================================================");
console.log("ALL WHATSAPP SYNC TESTS PASSED (100% OK)");
console.log("=======================================================");

