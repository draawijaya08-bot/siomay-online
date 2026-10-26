/**
 * Unit & Integration Test Suite for Siomay Online Customer Reviews
 * Run with: node tests/reviews.test.js
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { 
  formatReviewDate, 
  escapeHtml, 
  renderStarsHtml, 
  submitCustomerReview, 
  fetchApprovedReviews,
  deleteCustomerReview,
  isMyReview
} from "../reviews.js";

console.log("=== RUNNING SIOMAY ONLINE CUSTOMER REVIEWS TEST SUITE ===\n");

// -----------------------------------------------------------------------------
// Test 1: HTML Escaping & XSS Protection
// -----------------------------------------------------------------------------
console.log("Test 1: HTML Escaping & Safe Text Defense...");
{
  const malicious1 = "<script>alert('xss')</script>";
  const escaped1 = escapeHtml(malicious1);
  assert.equal(escaped1, "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
  assert.ok(!escaped1.includes("<script>"));

  const malicious2 = `<img src="x" onerror="stealCookies()">`;
  const escaped2 = escapeHtml(malicious2);
  assert.equal(escaped2, `&lt;img src=&quot;x&quot; onerror=&quot;stealCookies()&quot;&gt;`);
  assert.ok(!escaped2.includes("<img"));

  console.log("✓ HTML Escaping properly sanitizes malicious tags and quotes.");
}

// -----------------------------------------------------------------------------
// Test 2: Date Formatting Helper
// -----------------------------------------------------------------------------
console.log("\nTest 2: Indonesian Date Formatting...");
{
  const dateStr = "2026-10-24T12:00:00Z";
  const formatted = formatReviewDate(dateStr);
  assert.ok(formatted.includes("2026"), "Formatted date should contain 2026");
  assert.ok(formatted.includes("24"), "Formatted date should contain day 24");
  
  // Invalid date fallback
  assert.equal(formatReviewDate("invalid-date"), "");
  assert.equal(formatReviewDate(null), "");
  console.log("✓ Indonesian date formatting works correctly.");
}

// -----------------------------------------------------------------------------
// Test 3: Star Rating Generator
// -----------------------------------------------------------------------------
console.log("\nTest 3: Star Rating HTML Generator...");
{
  const html5 = renderStarsHtml(5);
  assert.ok(html5.includes(`Rating 5 dari 5 bintang`));
  assert.equal((html5.match(/star-filled/g) || []).length, 5);
  assert.equal((html5.match(/star-empty/g) || []).length, 0);

  const html3 = renderStarsHtml(3);
  assert.ok(html3.includes(`Rating 3 dari 5 bintang`));
  assert.equal((html3.match(/star-filled/g) || []).length, 3);
  assert.equal((html3.match(/star-empty/g) || []).length, 2);

  // Clamping test (e.g. rating 0 -> 1, rating 10 -> 5)
  const clampedMin = renderStarsHtml(0);
  assert.ok(clampedMin.includes(`Rating 1 dari 5 bintang`));

  const clampedMax = renderStarsHtml(99);
  assert.ok(clampedMax.includes(`Rating 5 dari 5 bintang`));

  console.log("✓ Star rating properly renders and clamps values between 1 and 5.");
}

// -----------------------------------------------------------------------------
// Test 4: SQL Migration Verification (RLS & Anti-Tamper)
// -----------------------------------------------------------------------------
console.log("\nTest 4: Supabase Migration File Verification...");
{
  const sqlPath = path.resolve(import.meta.dirname, "../supabase/migrations/20261024_customer_reviews.sql");
  assert.ok(fs.existsSync(sqlPath), "SQL migration file must exist");
  const sqlContent = fs.readFileSync(sqlPath, "utf-8");

  // Check table creation
  assert.ok(sqlContent.includes("CREATE TABLE IF NOT EXISTS public.customer_reviews"), "Creates customer_reviews table");
  
  // Check RLS is enabled
  assert.ok(sqlContent.includes("ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;"), "Enables RLS");

  // Check public read policy restricts to status = 'approved'
  assert.ok(sqlContent.includes("USING (status = 'approved');"), "Public read policy requires status = approved");

  // Check public insert policy restricts to status = 'pending'
  assert.ok(sqlContent.includes("status = 'pending'"), "Public insert policy restricts status to pending");

  // Check length & range constraints
  assert.ok(sqlContent.includes("rating >= 1 AND rating <= 5"), "Rating range constraint 1-5");
  assert.ok(sqlContent.includes("char_length(comment) <= 1000"), "Comment max 1000 chars constraint");
  assert.ok(sqlContent.includes("char_length(trim(comment)) >= 10"), "Comment min 10 chars constraint");

  // Check seed test data is clearly labeled
  assert.ok(sqlContent.includes("TEST DATA"), "Seed data is clearly labeled as test data");

  console.log("✓ SQL migration contains all required constraints, RLS policies, and labeled test seed data.");
}

// -----------------------------------------------------------------------------
// Test 5: DOM & Accessibility Structure in index.html
// -----------------------------------------------------------------------------
console.log("\nTest 5: index.html Structure & Accessibility Attributes...");
{
  const htmlPath = path.resolve(import.meta.dirname, "../index.html");
  const html = fs.readFileSync(htmlPath, "utf-8");

  // Reviews section exists
  assert.ok(html.includes('id="ulasan"'), "Contains #ulasan section");
  assert.ok(html.includes("Cerita Pelanggan Kami"), "Contains heading/tag Cerita Pelanggan Kami");
  assert.ok(html.includes("CERITA PELANGGAN KAMI"), "Contains section title");
  assert.ok(html.includes('id="btnOpenReviewModal"'), "Contains Tulis Ulasan button");
  assert.ok(html.includes('id="reviewsGrid"'), "Contains dynamic reviews grid");
  assert.ok(html.includes('id="reviewsEmpty"'), "Contains reviews empty state");
  assert.ok(html.includes('id="reviewsLoading"'), "Contains reviews skeleton loading");

  // Review submission modal exists
  assert.ok(html.includes('id="reviewModal"'), "Contains review modal");
  assert.ok(html.includes('role="dialog"'), "Modal has dialog role");
  assert.ok(html.includes('aria-modal="true"'), "Modal has aria-modal=true");
  assert.ok(html.includes('id="starPicker"'), "Contains interactive star picker");
  assert.ok(html.includes('id="reviewAuthorName"'), "Contains customer name field");
  assert.ok(html.includes('id="reviewMenuItem"'), "Contains menu item selection");
  assert.ok(html.includes('id="reviewComment"'), "Contains comment textarea");
  assert.ok(html.includes('id="reviewHoneypot"'), "Contains anti-spam honeypot field");

  console.log("✓ index.html contains all required elements, accessibility roles, and modal markup.");
}

// -----------------------------------------------------------------------------
// Test 6: Admin Dashboard Reviews Removal
// -----------------------------------------------------------------------------
console.log("\nTest 6: Admin Reviews Moderation Removal Verification...");
{
  const adminHtmlPath = path.resolve(import.meta.dirname, "../admin.html");
  assert.ok(fs.existsSync(adminHtmlPath), "admin.html exists");
  const adminHtml = fs.readFileSync(adminHtmlPath, "utf-8");

  // Per user specification: reviews must be removed from admin dashboard
  assert.ok(!adminHtml.includes('data-target-view="viewReviews"'), "Reviews navigation tab removed from admin sidebar");
  assert.ok(!adminHtml.includes('id="viewReviews"'), "Reviews moderation section removed from admin views");
  assert.ok(!adminHtml.includes('id="cmsReviewsList"'), "Admin reviews list container removed");

  console.log("✓ Reviews moderation cleanly removed from admin dashboard per specification.");
}

// -----------------------------------------------------------------------------
// Test 7: Review Submission Logic, Instant Publishing & Self-Deletion
// -----------------------------------------------------------------------------
console.log("\nTest 7: Direct Customer Review Publishing & Customer Self-Deletion...");
{
  // 1. Valid customer submission (must be directly approved, no pending state!)
  const resValid = await submitCustomerReview({
    displayName: "Caca",
    rating: 5,
    comment: "Siomay kentangnya sangat lezat dan bumbu kacangnya berlimpah!",
    menuItemId: "siomay-komplit"
  });
  assert.equal(resValid.success, true, "Review submission must succeed even without Supabase credentials");
  assert.ok(resValid.message.includes("berhasil"), "Success message returned");
  assert.equal(resValid.review.status, "approved", "Review must be directly approved without admin intervention");

  // 2. Customer ownership tracking
  assert.equal(isMyReview(resValid.review.id), true, "Customer can identify their own created review");

  // 3. Customer self-deletion (e.g. if typo/salah kata)
  const resDelete = await deleteCustomerReview(resValid.review.id);
  assert.equal(resDelete.success, true, "Customer can delete their own review");
  assert.equal(isMyReview(resValid.review.id), false, "Deleted review is no longer in customer's review list");

  // 4. Validation: Name too short
  const resBadName = await submitCustomerReview({
    displayName: "A",
    rating: 5,
    comment: "Siomay enak sekali dan sangat nikmat!"
  });
  assert.equal(resBadName.success, false, "Must reject name with fewer than 2 characters");

  // 5. Validation: Comment too short (< 10 chars)
  const resShortComment = await submitCustomerReview({
    displayName: "Caca",
    rating: 5,
    comment: "Enak"
  });
  assert.equal(resShortComment.success, false, "Must reject comment with fewer than 10 characters");

  // 6. Anti-spam honeypot
  const resSpambot = await submitCustomerReview({
    displayName: "SpamBot",
    rating: 5,
    comment: "Visit http://spam-link.example.com for cheap deals",
    honeypot: "http://spam-link.example.com"
  });
  assert.equal(resSpambot.success, true, "Spambot is deceived silently without error");

  // 7. Fetch approved reviews fallback
  const fetchRes = await fetchApprovedReviews({ page: 1, pageSize: 6 });
  assert.equal(fetchRes.success, true, "Fetching approved reviews returns valid fallback");
  assert.ok(fetchRes.reviews.length > 0, "Approved reviews list is populated");
  assert.ok(fetchRes.averageRating >= 4.0, "Average rating is calculated");

  console.log("✓ Customer reviews direct publishing and self-deletion work with 100% reliability.");
}

console.log("\n=======================================================");
console.log("ALL 7 TEST SUITES PASSED SUCCESSFULLY (100% OK)");
console.log("=======================================================");
