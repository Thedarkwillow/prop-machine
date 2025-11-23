# Broken & Missing Features Report

Generated: $(date)

## 🔴 Critical Issues

### 1. Prop Comparison Returns Mock Data (Not Real Data)
**Location:** `server/routes.ts:400-473`

**Issue:** The `/api/prop-comparison/player` endpoint returns hardcoded mock data instead of using the real prop comparison service.

**Current Code:**
```typescript
// Mock prop comparison data - will be replaced with real API integration
const mockComparisons = [...hardcoded data...];
res.json(mockComparisons);
```

**Expected:** Should use `propComparisonService.getBestLinesForPlayer()` which already exists in `server/services/propComparisonService.ts`.

**Impact:** Prop Comparison page shows fake data, making it useless for users.

---

### 2. Notification Preferences Not Persisted to Database
**Location:** `server/notificationRoutes.ts:18-46`

**Issue:** Notification preferences endpoints return hardcoded defaults and acknowledge updates but don't actually save preferences to the database.

**Current Code:**
```typescript
// TODO: Implement database-backed per-user preferences using notificationPreferences table
res.json({
  emailEnabled: true,
  newPropsEnabled: true,
  // ... hardcoded defaults
});
```

**Expected:** Should use:
- `storage.getNotificationPreferences(userId)` to fetch
- `storage.updateNotificationPreferences(userId, prefs)` to save (method already exists!)

**Impact:** User notification preferences are lost on page refresh and don't actually control notifications.

---

### 3. Settlement Service Uses Hardcoded User IDs
**Location:** `server/services/settlementService.ts:170`

**Issue:** The settlement service hardcodes a single user ID instead of processing all users.

**Current Code:**
```typescript
const allUsers = ['seed-user-1']; // TODO: Get all user IDs from database
```

**Problem:** 
- Missing `getAllUsers()` method in storage interface
- Only processes bets for one hardcoded user
- Other users' bets are never automatically settled

**Impact:** Multi-user deployments won't have automatic bet settlement for non-seed users.

---

## 🟡 Partial/Missing Implementations

### 4. Prop Rescoring Uses Mock Features
**Location:** `server/adminRoutes.ts:319-360`

**Issue:** The `/api/admin/props/rescore` endpoint uses mock player stats instead of fetching real data.

**Current Code:**
```typescript
// For now, use mock data based on existing prop confidence
const mockFeatures = {
  recentAverage: parseFloat(prop.line) * (prop.confidence / 100 + 0.2),
  seasonAverage: parseFloat(prop.line) * (prop.confidence / 100 + 0.1),
  // ... other mock fields
};
```

**Expected:** Should fetch real player stats from ESPN/BallDontLie APIs before rescoring.

**Impact:** Rescoring doesn't improve accuracy since it's using fake data derived from existing confidence scores.

**Note:** The comment says "Update prop with new scores would require an updateProp method in storage" - this method doesn't exist, so rescoring doesn't actually update props even if scores were calculated correctly.

---

### 5. OpticOdds Results Stream - Bet Grading TODO
**Location:** `server/services/opticOddsResultsStream.ts:198`

**Issue:** TODO comment suggests bet grading might not be fully implemented.

**Current Code:**
```typescript
// TODO: Grade bets based on final stats
await this.gradeBetsForFixture(fixture.fixture_id, player_stats);
```

**Status:** Actually appears to be implemented - the `gradeBetsForFixture` method exists and looks complete. This TODO can likely be removed.

---

## 🟢 Minor Issues

### 6. Missing Update Prop Method in Storage
**Location:** Referenced in `server/adminRoutes.ts:342`

**Issue:** Prop rescoring mentions needing an `updateProp` method that doesn't exist in the storage interface.

**Impact:** Cannot update prop confidence/EV after rescoring even if calculations are correct.

---

### 7. Example Components Circular Imports
**Location:** `client/src/components/examples/*.tsx`

**Issue:** Example components import from parent directory which may cause circular dependencies.

**Files:**
- `examples/ConfidenceBar.tsx` → `../ConfidenceBar`
- `examples/DashboardHeader.tsx` → `../DashboardHeader`
- etc.

**Impact:** Potentially confusing structure, but may not cause runtime issues.

---

## ✅ Working Features (Verified)

- ✅ Authentication (Replit & Google OAuth)
- ✅ Dashboard data fetching
- ✅ Props CRUD operations
- ✅ Bets tracking and settlement (manual)
- ✅ Slips generation
- ✅ Analytics endpoints
- ✅ Player comparison
- ✅ Live scoreboard
- ✅ Streaming control (admin)
- ✅ Notification service (notification creation works, preferences don't persist)

---

## 📋 Recommended Fixes Priority

### High Priority
1. **Fix Prop Comparison** - Replace mock data with real `propComparisonService` call
2. **Fix Notification Preferences** - Implement database persistence (methods already exist!)
3. **Add getAllUsers() method** - Fix settlement service to process all users

### Medium Priority
4. **Implement updateProp() method** - Enable prop rescoring to actually update props
5. **Fix prop rescoring** - Use real player stats instead of mock data

### Low Priority
6. **Remove stale TODO** - Clean up opticOddsResultsStream TODO if implementation is complete
7. **Reorganize example components** - Consider moving examples or fixing import structure

---

## 🔧 Quick Fixes Needed

### Fix 1: Prop Comparison Route
**File:** `server/routes.ts:401-473`
- Replace mock data with `propComparisonService.getBestLinesForPlayer(player)`

### Fix 2: Notification Preferences
**File:** `server/notificationRoutes.ts`
- Use `storage.getNotificationPreferences(userId)` in GET handler
- Use `storage.updateNotificationPreferences(userId, validatedData)` in PATCH handler

### Fix 3: GetAllUsers Method
**Files:** 
- Add to `server/storage.ts` interface (IStorage)
- Implement in `server/storage.ts` (DbStorage class)
- Use in `server/services/settlementService.ts:170`

