# ⚠️ ARCHIVED: PrizePicks Bypass Research - DO NOT USE ⚠️

> **🚨 CRITICAL: This is historical documentation ONLY**
>
> - **Status**: ARCHIVED - All integration code has been removed from this project
> - **DO NOT ATTEMPT**: None of these methods work
> - **NO CODE EXISTS**: The implementation code referenced in this document has been deleted
> - **NO ENV VARS**: Environment variables mentioned below are not supported

---

## Purpose of This Archive

This document exists solely as a historical record of research conducted in November 2025 to bypass PrizePicks' PerimeterX bot protection. It is preserved to:

1. **Document what was attempted** - So future contributors understand what approaches were tested
2. **Explain why they failed** - Enterprise-grade bot protection defeated all methods
3. **Justify the strategic decision** - Why we focused on The Odds API instead
4. **Save time** - Prevent others from repeating the same failed experiments

**This guide should NOT be used as an instruction manual. The code no longer exists in this project.**

---

## Why PrizePicks Integration Was Abandoned

### Strategic Decision (November 21, 2025)

After extensive research and testing, PrizePicks integration was **permanently abandoned** for these reasons:

1. **PerimeterX Bot Protection** - Enterprise-grade protection blocks all automated access methods
2. **Superior Alternative** - The Odds API provides 10,000+ props from 8 bookmakers vs PrizePicks' ~250 props
3. **Multi-Bookmaker Coverage** - DraftKings, FanDuel, Caesars, BetMGM, Fanatics, Bovada, BetOnline, BetRivers enable superior line shopping and CLV analysis
4. **Maintenance Burden** - Bypass methods require constant updates as PerimeterX detection evolves
5. **Legal Risk** - Automated scraping likely violates PrizePicks Terms of Service
6. **Technical Debt** - Maintaining bypass code adds complexity without production value

---

## Research Summary: What Was Tested

### Method 1: Direct API with Enhanced Headers

**Approach**: Direct HTTP requests to `https://api.prizepicks.com/projections` with browser-like headers

**Implementation Details**:
- Enhanced User-Agent headers mimicking Chrome browser
- Sec-Fetch-* directives for browser fingerprinting
- Accept-Language and encoding headers

**Result**: ❌ **FAILED**
- HTTP 403 Forbidden with PerimeterX CAPTCHA challenge
- Response contained `"appId":"PXZNeitfzP"` indicating active bot protection
- All requests blocked regardless of header configuration

**Conclusion**: PerimeterX detects and blocks direct API access regardless of header mimicry

---

### Method 2: Stealth Browser with Puppeteer

**Approach**: Puppeteer Extra with stealth plugin to automate browser interactions

**Implementation Details**:
- `puppeteer-extra` with `puppeteer-extra-plugin-stealth`
- Request interception to capture API responses
- Realistic viewport sizes and browser fingerprints
- Non-headless mode with behavioral simulation

**Result**: ❌ **FAILED**
- `ConnectionClosedError: Connection closed` - PrizePicks actively kills browser sessions
- Stealth plugin patches detected by PerimeterX
- Even with behavioral simulation (mouse movements, scrolling), connections terminated

**Conclusion**: PerimeterX identifies and terminates automated browser sessions despite stealth techniques

---

### Method 3: Manual Cookie Capture (Considered but Not Implemented)

**Approach**: Extract cookies from real browser session and use in automated requests

**Why Not Implemented**:
- High maintenance burden (cookies expire every 24-48 hours)
- Still vulnerable to PerimeterX fingerprinting
- Would require manual intervention for each refresh
- Not scalable for automated scheduling

**Conclusion**: Even with valid cookies, PerimeterX can still detect automation through other signals

---

### Method 4: Residential Proxy Support (Researched)

**Approach**: Route requests through residential IP addresses to avoid datacenter IP flagging

**Findings**:
- Residential proxies cost $50-300/month
- Success rate improves to ~70-85% when combined with stealth browser
- Still not 100% reliable against advanced PerimeterX configurations
- Node.js `fetch()` doesn't support proxies natively (would require additional dependencies)

**Conclusion**: Expensive solution with no guarantee of long-term success as PerimeterX evolves

---

## Technical Details: PerimeterX Protection

PrizePicks uses PerimeterX (now HUMAN Security) which employs multiple detection vectors:

1. **Browser Fingerprinting** - WebGL, canvas rendering, font detection, screen resolution
2. **Automation Flags** - Detects `navigator.webdriver`, automation extensions, headless browsers
3. **Behavioral Analysis** - Mouse movements, click patterns, timing, keystroke dynamics
4. **HTTP Headers** - Analyzes header order, values, missing headers (Referer, Origin)
5. **TLS Fingerprinting (JA3)** - Identifies client TLS handshake patterns
6. **IP Reputation** - Monitors datacenter IPs, request rates, access patterns

**Result**: Enterprise-grade, multi-layered protection designed specifically to defeat automation

---

## The Odds API: Superior Alternative

Instead of fighting PerimeterX, we focused on The Odds API which provides:

| Metric | PrizePicks | The Odds API |
|--------|-----------|--------------|
| **NFL Props** | ~250 | 10,196+ |
| **NBA Props** | ~250 | 2,968+ |
| **Bookmakers** | 1 (PrizePicks) | 8 (DraftKings, FanDuel, Caesars, BetMGM, Fanatics, Bovada, BetOnline, BetRivers) |
| **Line Shopping** | ❌ Not possible | ✅ Compare 8 bookmakers |
| **CLV Analysis** | ❌ Single source | ✅ Multi-bookmaker tracking |
| **Reliability** | ❌ PerimeterX blocks access | ✅ Official API with paid tier |
| **Maintenance** | ❌ Constant bypass updates | ✅ Stable API contract |

**Strategic Conclusion**: The Odds API provides objectively superior data coverage, enables better line shopping and CLV analysis, and requires zero maintenance for bypass detection.

---

## Recommendations for Future Contributors

If you're considering adding PrizePicks integration:

1. **Don't** - The Odds API is objectively better for this use case
2. **OpticOdds Alternative** - If you must have PrizePicks data, consider OpticOdds API (enterprise pricing, legitimate access)
3. **Focus on Analytics** - Enhance The Odds API integration, improve ML models, build better dashboards
4. **Line Shopping Tools** - Multi-bookmaker coverage is more valuable than single-source PrizePicks data

---

## Files Removed (November 21, 2025)

The following files were deleted from the codebase:

- `server/integrations/prizepicksClient.ts` - Direct API client implementation
- `server/integrations/prizepicksStealth.ts` - Puppeteer stealth browser implementation
- `server/integrations/prizepicksScraperClient.ts` - Additional scraper client
- All references in `server/services/propRefreshService.ts`

**Environment variables mentioned in earlier research** (no longer supported):
- ~~`DISABLE_PRIZEPICKS`~~ - Removed
- ~~`PRIZEPICKS_COOKIES`~~ - Never implemented
- ~~`PRIZEPICKS_PROXY_URL`~~ - Never implemented

---

## Conclusion

PrizePicks integration was thoroughly researched and tested but ultimately abandoned in favor of The Odds API. This decision was based on:

- **Technical Reality**: PerimeterX bot protection defeated all tested bypass methods
- **Strategic Advantage**: The Odds API provides 40x more props with multi-bookmaker coverage
- **Maintenance Burden**: Bypasses require constant updates as detection evolves
- **Legal/Ethical Concerns**: Automated scraping violates ToS

**Current Status**: Platform uses The Odds API exclusively. PrizePicks is not supported.

**Last Updated**: November 21, 2025
