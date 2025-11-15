# Design Guidelines: AI Sports Betting Intelligence Platform

## Design Approach

**Selected Approach:** Hybrid System combining Linear's modern productivity aesthetic with Robinhood's financial dashboard clarity and sports betting platform engagement patterns.

**Rationale:** This is a professional data analytics tool handling real money with complex real-time information. It requires trust, clarity, and efficient information architecture while maintaining excitement around sports betting opportunities.

**Key Design Principles:**
1. **Data hierarchy over decoration** - Information density without clutter
2. **Instant comprehension** - Critical metrics visible at a glance
3. **Trust through clarity** - Transparent data presentation builds confidence
4. **Progressive disclosure** - Surface key insights, details on demand

---

## Typography

**Font System:**
- **Primary:** Inter (via Google Fonts CDN) - Clean, highly legible for data
- **Monospace:** JetBrains Mono - For odds, numbers, statistics, code-like data
- **Accent:** System font stack for performance

**Type Scale:**
- Hero/Dashboard Headers: 32px (2xl), weight 700
- Section Headers: 24px (xl), weight 600
- Card Titles: 18px (lg), weight 600
- Body/Data: 14px (base), weight 400
- Small/Meta: 12px (sm), weight 400
- Numbers/Stats: 16px (lg), weight 700, monospace

**Hierarchy Implementation:**
- Dashboard metrics use large, bold monospace numbers
- Confidence scores and percentages are prominent and color-coded
- Player names and prop details in medium weight
- Metadata (timestamps, IDs) in small gray text

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Tight spacing: p-2, gap-2 (dense data tables)
- Standard spacing: p-4, gap-4 (cards, sections)
- Generous spacing: p-8, gap-8 (major sections)

**Grid Architecture:**
- **Dashboard:** 12-column grid with responsive breakpoints
- **Sidebar:** Fixed 280px width, collapsible on mobile
- **Main Content:** Fluid with max-w-7xl container
- **Cards:** 4px radius, subtle shadow, 1px border

**Responsive Breakpoints:**
- Mobile: Stack all cards single column, hide sidebar to hamburger
- Tablet (md): 2-column grid for metrics, sidebar overlay
- Desktop (lg): Full 3-4 column dashboard, persistent sidebar
- XL: Max content width with comfortable margins

---

## Component Library

### Navigation & Structure

**Top Navigation Bar:**
- Height: 64px, sticky positioned
- Contains: Logo, sport selector, bankroll display (prominent), alerts icon with badge, user menu
- Background with subtle backdrop blur when scrolling

**Sidebar Navigation:**
- Persistent on desktop, overlay on mobile
- Sections: Dashboard, Slips, Props Feed, Performance, Models, Settings
- Active state: Subtle accent background, bold text
- Icons from Heroicons (outline style)

**Dashboard Layout:**
- Hero metrics row: 4 key stats (Bankroll, Win Rate, CLV, ROI) in cards
- Top Slips section: 3 featured slip cards horizontal scroll on mobile
- Live Props feed: Scrollable table with filters
- Performance charts: 2-column grid below
- Week 1 validation (conditional): Prominent progress tracker at top

### Data Display Components

**Metric Cards:**
- Large number in monospace font, center-aligned
- Small label above, change indicator below
- Positive changes in success styling, negative in warning
- Subtle gradient background for hero metrics
- Hover state: Gentle lift with shadow

**Slip Cards:**
- Title with slip type badge (Conservative/Balanced/Aggressive)
- Confidence ring/meter visualization at top
- 3-5 pick rows with player name, stat, line, confidence dot
- Footer: Suggested bet size, potential return, quick actions
- Border color matches slip type (success/info/warning)
- One-click copy button with icon

**Props Table:**
- Compact row height (48px) for data density
- Sticky header with sortable columns
- Columns: Player, Stat, Line, Confidence (visual bar), EV, Platform, Actions
- Alternating row backgrounds for scannability
- Expandable rows for detailed analytics
- Color-coded confidence levels (red/yellow/green gradient)

**Charts & Visualizations:**
- Line charts for bankroll growth (area fill below line)
- Bar charts for performance by category
- Donut chart for confidence calibration
- Heat maps for correlation matrices
- Subtle grid lines, no heavy borders
- Interactive tooltips on hover
- Legend positioned top-right

**Performance Metrics Grid:**
- Small stat cards in 3-4 column grid
- Label, large number, sparkline trend
- Quick-scan visual hierarchy

### Forms & Inputs

**Filters & Controls:**
- Pill-style filter buttons with active state
- Dropdown selects with subtle borders
- Toggle switches for binary options
- Date pickers for historical data
- Search input with icon prefix

**Bet Tracking:**
- Manual entry modal with form fields
- Auto-populated fields from slip clicks
- Status badges (Pending/Won/Lost)
- Confirmation patterns with clear CTAs

### Alerts & Notifications

**In-App Alert Center:**
- Bell icon with red badge count in header
- Dropdown panel showing recent alerts
- Alert types: High-EV opportunity, Line movement, Injury, Hedge suggestion, Milestone
- Color-coded by urgency (success/warning/danger)
- Dismiss and quick action buttons

**Toast Notifications:**
- Bottom-right corner positioning
- Auto-dismiss after 5 seconds
- Action buttons for critical alerts
- Icon prefix matching alert type

**Banners:**
- Top of dashboard for critical system messages
- Disclaimers on slip suggestions
- Calibration warnings when drifting

---

## Visual Treatments

**Confidence Visualization:**
- Color gradient from red (low) → yellow (mid) → green (high)
- Circular progress rings for slip confidence
- Horizontal bars in tables
- Never use pure red/green (accessibility)

**Status Indicators:**
- Small colored dots for quick status (online/offline, active/inactive)
- Badges for categorical labels (Sport, Platform, Slip Type)
- Pill shapes with subtle backgrounds

**Data Emphasis:**
- Bold monospace for all monetary values
- Percentage changes with up/down arrows
- Highlighted cells for outliers in tables
- Subtle background colors for key metrics

**Depth & Elevation:**
- Flat design with strategic shadows for cards
- 2-level hierarchy: base (tables) and elevated (cards/modals)
- Avoid heavy shadows, use subtle borders instead
- Hover states lift elements slightly

---

## Interactions & States

**Loading States:**
- Skeleton screens for data tables
- Shimmer effect for loading metrics
- Spinner for actions (small, inline)
- Progress bars for longer operations

**Empty States:**
- Centered illustration with message
- Clear call-to-action
- Examples: "No slips generated yet", "No bets tracked"

**Error States:**
- Inline field validation
- Banner alerts for system errors
- Retry buttons where applicable

**Success Confirmations:**
- Toast for actions (bet tracked, slip copied)
- Check mark animations
- Brief, non-intrusive

**Hover/Active:**
- Cards: Subtle shadow increase, slight scale
- Buttons: Background darkening
- Table rows: Light background change
- Links: Underline appearance

---

## Accessibility & Polish

**Accessibility:**
- All interactive elements have focus states (2px offset ring)
- Sufficient contrast ratios (WCAG AA minimum)
- Icons paired with labels or aria-labels
- Keyboard navigation support
- Screen reader friendly data tables

**Dark Mode:**
- System preference detection
- Toggle in settings
- Inverted backgrounds with adjusted grays
- Reduced contrast for comfort
- Accent colors remain vibrant

**Responsive Considerations:**
- Touch-friendly tap targets (44px minimum on mobile)
- Bottom navigation on mobile for key actions
- Horizontal scroll for wide tables with fixed first column
- Collapsible sections to save vertical space

**Animations:**
- Minimal, purposeful only
- Smooth transitions (200-300ms)
- Reduce motion preference respected
- Page transitions: subtle fade
- Data updates: brief highlight flash

---

## Images & Media

**No large hero image needed** - This is a dashboard/tool interface, not a marketing site.

**Icon Usage:**
- Heroicons library (outline style for navigation, solid for status)
- Sport-specific icons for NHL/NBA/NFL/MLB
- Platform logos (PrizePicks, Underdog) as small badges
- Chart icons in empty states

**Avatars/Placeholders:**
- Player headshots if available (circular, 40px)
- Fallback to initials in colored circles
- Team logos as small identifiers

---

## Platform-Specific Notes

**Mobile Optimizations:**
- Horizontal card scrolling for slips
- Simplified table views (show fewer columns, expand for details)
- Fixed bottom action bar for quick bet tracking
- Pull-to-refresh on data feeds

**Desktop Enhancements:**
- Multi-column layouts maximize screen space
- Persistent sidebar navigation
- Hover tooltips for additional context
- Keyboard shortcuts for power users

**Real-Time Updates:**
- Subtle pulse animation when new data arrives
- Badge indicators for new props/slips
- Live updating numbers without jarring transitions
- WebSocket connection status indicator