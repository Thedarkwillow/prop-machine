/**
 * Test script to verify all fixes are working correctly
 * Run with: npx tsx test-fixes.ts
 */

import { storage } from "./server/storage.js";
import { propComparisonService } from "./server/services/propComparisonService.js";
import { NotificationService } from "./server/services/notificationService.js";

async function testAllFixes() {
  console.log("🧪 Testing All Fixes...\n");
  const results: { test: string; passed: boolean; error?: string }[] = [];

  // Test 1: Verify getAllUsers() method exists and works
  console.log("1️⃣ Testing getAllUsers() method...");
  try {
    const users = await storage.getAllUsers();
    console.log(`   ✅ getAllUsers() works - found ${users.length} user(s)`);
    results.push({ test: "getAllUsers() method", passed: true });
  } catch (error: any) {
    console.log(`   ❌ getAllUsers() failed: ${error.message}`);
    results.push({ test: "getAllUsers() method", passed: false, error: error.message });
  }

  // Test 2: Verify propComparisonService.getBestLinesForPlayer exists
  console.log("\n2️⃣ Testing propComparisonService.getBestLinesForPlayer()...");
  try {
    if (typeof propComparisonService.getBestLinesForPlayer === 'function') {
      console.log("   ✅ propComparisonService.getBestLinesForPlayer() method exists");
      results.push({ test: "propComparisonService method", passed: true });
    } else {
      throw new Error("Method does not exist");
    }
  } catch (error: any) {
    console.log(`   ❌ propComparisonService method check failed: ${error.message}`);
    results.push({ test: "propComparisonService method", passed: false, error: error.message });
  }

  // Test 3: Verify NotificationService class and methods exist
  console.log("\n3️⃣ Testing NotificationService class...");
  try {
    const notificationService = new NotificationService(storage);
    if (typeof notificationService.getOrCreatePreferences === 'function' &&
        typeof notificationService.updatePreferences === 'function') {
      console.log("   ✅ NotificationService methods exist");
      results.push({ test: "NotificationService methods", passed: true });
    } else {
      throw new Error("Methods do not exist");
    }
  } catch (error: any) {
    console.log(`   ❌ NotificationService methods check failed: ${error.message}`);
    results.push({ test: "NotificationService methods", passed: false, error: error.message });
  }

  // Test 4: Verify updateProp method exists in storage
  console.log("\n4️⃣ Testing updateProp() method...");
  try {
    if (typeof storage.updateProp === 'function') {
      console.log("   ✅ storage.updateProp() method exists");
      results.push({ test: "updateProp() method", passed: true });
    } else {
      throw new Error("Method does not exist");
    }
  } catch (error: any) {
    console.log(`   ❌ updateProp() method check failed: ${error.message}`);
    results.push({ test: "updateProp() method", passed: false, error: error.message });
  }

  // Test 5: Verify storage interface includes getAllUsers
  console.log("\n5️⃣ Testing storage interface includes getAllUsers...");
  try {
    // This is a compile-time check, so if it compiles, it's good
    const storageInterface: typeof storage = storage;
    if ('getAllUsers' in storageInterface) {
      console.log("   ✅ getAllUsers is in storage interface");
      results.push({ test: "Storage interface getAllUsers", passed: true });
    } else {
      throw new Error("getAllUsers not found in interface");
    }
  } catch (error: any) {
    console.log(`   ❌ Storage interface check failed: ${error.message}`);
    results.push({ test: "Storage interface getAllUsers", passed: false, error: error.message });
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Results Summary:");
  console.log("=".repeat(50));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} ${result.test}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${results.length}`);
    process.exit(1);
  } else {
    console.log("🎉 All tests passed!");
    process.exit(0);
  }
}

// Run tests
testAllFixes().catch(error => {
  console.error("Fatal error running tests:", error);
  process.exit(1);
});

