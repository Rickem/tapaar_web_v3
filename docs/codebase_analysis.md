# TapaarVerse Web — Codebase Analysis Report

> **Generated**: 2026-02-19  
> **Project Version**: 2.0.0  
> **Path**: `c:\app\projects\tapaar\tapaar_web_latest`

---

## 1. Project Overview

**TapaarVerse** is a mobile-first web application (Progressive Web App) built for the West African market (Benin). It is a **loyalty-points ecosystem** where users purchase "TapaarPoints" (TP) using mobile money, then spend those points on airtime/data top-ups and digital/physical marketplace products. The app also has an affiliate/referral system and a task-reward system.

Primary language: **French**  
Currency: **FCFA** (West African CFA franc)  
Mobile operators supported: **MTN, MOOV, CELTIIS**

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI Library | Radix UI (full primitive suite) |
| Styling | Tailwind CSS 3 + tailwindcss-animate |
| Component Library | shadcn/ui pattern (via `components.json`) |
| Icons | Lucide React |
| Backend / DB | Firebase (Firestore + Firebase Auth) |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Email | Resend |
| Date Formatting | date-fns (French locale) |
| PWA | @ducanh2912/next-pwa |
| AI (dev only) | Genkit + tsx |
| Utility | Lodash, clsx, class-variance-authority |

---

## 3. Design System

- **Primary Color**: `#703BE3` (vibrant purple)  
- **Background**: `#F2EEFA` (light purple)  
- **Accent**: `#E3973B` (yellow-orange, CTAs)  
- **Font**: PT Sans (humanist sans-serif)  
- **Style**: Card-based layout, mobile-first, game-like dashboard

---

## 4. Project Structure

```
tapaar_web_latest/
├── docs/               # Documentation (blueprint.md, backend.json, this file)
├── public/             # Static assets
└── src/
    ├── app/            # Next.js App Router pages
    ├── components/     # Reusable UI components
    ├── firebase/       # Firebase abstraction layer
    ├── hooks/          # React custom hooks
    └── lib/            # Types, utils, placeholder data
```

---

## 5. Application Routes & Pages

### `/ (root)` — Redirect or splash
Likely redirects to `/dashboard` or `/login`.

### `/login`
Firebase Email/Password authentication with a styled login form.  
Components: `LoginForm`, `GoogleSigninButton`, `AuthLayout`.

### `/signup`
Multi-step signup form (`signup-form.tsx`, 20KB) handling:
- User registration with Firebase Auth
- OTP/email verification initiation
- Referral code auto-fill via URL param
- Writes `UserProfile` to Firestore `users/{uid}`

### `/verify-otp`
OTP verification step. Redirects to `/dashboard` on success.

### `/dashboard` _(protected)_
Main home screen. Reads:
- `users/{uid}` → `UserProfile`
- `users/{uid}/wallets/-topup-` → Topup balance
- `users/{uid}/wallets/-bonus-` → Bonus balance
- `products` (featured, limit 4)

Shows: `DashboardHeader`, `BalanceCard`, "Recharger" CTA → `/coupons`, `PointsCarousel`, `FeaturedProducts`, `BottomNav`.

### `/coupons`
TapaarPoints purchase page. Lists coupon denominations (200 → 50,000 FCFA/TP, valid 60 days). Clicking "Acheter" navigates to `/payment/{amount}`.

### `/payment/[amount]`
Payment confirmation and processing page. Uses dynamic route (amount segment).  
Integrates Mobile Money payment flow (MTN, MOOV, CELTIIS).

### `/airtime`
**Airtime & Data top-up** page. Allows users to spend TapaarPoints.
- Operator tabs: MTN / MOOV / CELTIIS
- Package types: Crédit, Maxi, Maxi+Internet, Internet, Illimité, etc.
- Fixed price grids per package/operator
- Phone number validation with operator prefix detection
- Favorite numbers stored in `users/{uid}/favorites`
- Proceeds to `/airtime/confirm?{params}`

### `/airtime/confirm`
Confirmation step for airtime/data orders. Processes USSD job via Firestore.

### `/transfer`
**Point transfer** (P2P) page — **currently feature-flagged/commented out**. Shows "Acheter un Coupon de Transfert" but recipient search and transfer form are commented out. The search was designed to query `users` by username/phone prefix.

### `/transfer/confirm`
Confirmation step for transfers (referenced by transfer page params).

### `/market`
**Marketplace** — product listing with:
- Featured products section (from Firestore, `featured == true`)
- Full product list with Firestore pagination (10/page, `orderBy createdAt desc`)
- "Load more" button
- Search input (UI only, not yet wired to query)
- Product cards with images, price, promo info

### `/tasks`
**Rewarded Tasks** system.
- Lists all tasks from `tasks` Firestore collection
- Tracks completion per user in `users/{uid}/userTasks/{taskId}`
- Uses Firestore `runTransaction` to atomically award points to `users/{uid}/wallets/-coins-`
- Shows coin balance and task stats (completed / available)

### `/transactions`
**Transaction history** with pagination (15/page).
- Reads `users/{uid}/transactions` ordered by `createdAt` desc
- Displays: type icon (in/out), label, date, amount (TP), and status badge
- **Manual payment verification** for pending topup transactions: queries the `sms` collection for a matching unprocessed SMS, then uses a Firestore transaction to: confirm transaction, activate coupon, update wallet balance, and mark SMS as processed.

### `/history`
Likely a sub-history screen (1 child file found).

### `/community`
Community section (1 child file found — probably affiliate/referral leaderboard or network view).

### `/profile`
**User Profile** page with two tabs:
1. **Profil**: View & edit personal info (phone, address), view sponsor (parrain), logout
2. **Mes Parts** (if user is a shareholder): View purchased shares, bonus shares, total value, dividends, and per-phase breakdown

Reads:
- `users/{uid}` → `UserProfile`
- `shareholders/{uid}` → `Shareholder`
- `shareholders/{uid}/phases/{phaseId}` → `SharePhase` (phases 1–5)

---

## 6. Firebase Architecture

### Firestore Collections

| Collection | Description |
|---|---|
| `users/{uid}` | UserProfile document |
| `users/{uid}/wallets/-topup-` | TapaarPoints balance (purchased) |
| `users/{uid}/wallets/-bonus-` | Bonus points (from affiliates/tasks) |
| `users/{uid}/wallets/-coins-` | Task coin balance |
| `users/{uid}/transactions` | Transaction history per user |
| `users/{uid}/coupons/{id}` | Coupon records per user |
| `users/{uid}/userTasks/{taskId}` | Completed tasks per user |
| `users/{uid}/favorites` | Favorite phone numbers for airtime |
| `products` | Product catalog (marketplace) |
| `tasks` | Available reward tasks |
| `shareholders/{uid}` | Shareholder info (early investor program) |
| `shareholders/{uid}/phases/{id}` | Share purchase per phase |
| `sms` | Incoming Mobile Money SMS records (for payment processing) |

### Firebase Auth
- Email/password authentication
- `onAuthStateChanged` subscription in `FirebaseProvider`
- OTP email verification flow

### Custom Firebase Hooks (in `/src/firebase/`)

| Hook | Purpose |
|---|---|
| `useUser()` | Returns `{ user, isUserLoading, userError }` |
| `useAuth()` | Returns `Auth` instance |
| `useFirestore()` | Returns `Firestore` instance |
| `useFirebaseApp()` | Returns `FirebaseApp` instance |
| `useDoc<T>(ref)` | Real-time single document subscription |
| `useCollection<T>(query)` | Real-time collection subscription |
| `useMemoFirebase(factory, deps)` | Memoized Firebase ref/query creation |

The `FirebaseProvider` wraps the whole app and handles auth state via `onAuthStateChanged`. A `FirebaseErrorListener` component listens for and surfaces Firebase errors.

---

## 7. Data Types (Key Interfaces in `lib/types.ts`)

| Interface | Key Fields |
|---|---|
| `UserProfile` | uid, name, phone, email, emailVerified, isActive, isMember, parrain, parrainRef, parrainUid, username |
| `Wallet` | balance, type, updatedAt |
| `AppTransaction` | opRef, label, category, group, type (in/out), amount, displayAmount, fees, method, status |
| `Coupon` | userId, amount, status (active/used/expired/pending), expiresAt |
| `Task` | type (internal/external), title, description, reward, status |
| `UserTask` | status (completed/inProgress), rewardGiven, completedAt |
| `Product` | name, slug, description, imgUrl[], price, promo, stock, delivery, categories, featured, bestSeller, condition, seller, variationType, variations |
| `MembershipProfile` | affiliates, generation, parrain chain (up to 3 generations), level, pack, star, referral |
| `Shareholder` | bonus, bonusValue, members, purchased, totalValue, royalties, verified |
| `SharePhase` | bonus, members, purchased, totalValue |
| `SMS` | message, operator, parsedAmount, parsedRef, parsedPhone, processed |
| `Job` | amount, operator, phoneNumber, type (airtime), ussdSequence, pin, status |

---

## 8. Component Inventory

### `components/auth/`
- `auth-layout.tsx` — Wrapper layout for auth pages
- `login-form.tsx` — Email/password login
- `signup-form.tsx` — Full multi-step signup
- `signup-form-client.tsx` — Client wrapper for SSR
- `google-signin-button.tsx` — Google OAuth button
- `verify-otp-form.tsx` — OTP code entry

### `components/dashboard/`
- `header.tsx` — Top bar with username greeting
- `balance-card.tsx` — Dual wallet display (Topup + Bonus)
- `points-carousel.tsx` — Animated carousel (quick actions)
- `featured-products.tsx` — Horizontal product strip
- `bottom-nav.tsx` — Bottom navigation bar (Dashboard, Market, Tasks, Transactions, Profile)

### `components/market/`
- `product-card.tsx` — Product listing card with image, price, promo

### `components/airtime/`
- `favorite-number.tsx` — Favorite number chip

### `components/payment/`
- Two component files (payment form / status)

### `components/profile/`
- `share-phase-card.tsx` — Phase-level shareholding summary

### `components/analytics/`
- One analytics component

### `components/ui/`
- Full shadcn/ui component set: Button, Card, Input, Tabs, Dialog, Select, Checkbox, Avatar, Badge, Progress, Slider, Toast, Tooltip, Carousel, Accordion, Popover, Menubar, RadioGroup, ScrollArea, Separator, Switch, Label

### `components/FirebaseErrorListener.tsx`
- Global Firebase error surface component

---

## 9. Key Business Logic & Flows

### 9.1 Point Purchase Flow
1. User selects coupon denomination on `/coupons`
2. Navigates to `/payment/{amount}`
3. User pays via Mobile Money (MTN/MOOV/CELTIIS)
4. A `Job` is created for the USSD automation backend
5. An incoming SMS from the operator triggers parsing and storage in `sms` collection
6. Transaction verification (manual or automated) matches the SMS to the transaction, credits wallet, and activates coupon

### 9.2 Airtime Top-Up Flow
1. User selects operator, package type, amount, and phone number on `/airtime`
2. Phone prefix is validated against operator prefix lists
3. Order confirmed on `/airtime/confirm`
4. A `Job` is created in Firestore with `ussdSequence` and `pin` for USSD automation

### 9.3 Task Reward Flow
1. Tasks stored globally in `tasks` collection
2. User clicks "Accomplir la tâche" → Firestore `runTransaction` atomically:
   - Creates `userTasks/{taskId}` with status "completed"
   - Credits `wallets/-coins-` with `task.reward` points

### 9.4 Payment Verification (Pending Transactions)
On `/transactions`, pending topup transactions show a "Vérifier le paiement" button. This:
1. Queries `sms` collection for a matching unprocessed SMS (matching opRef, phone, operator, amount)
2. Runs a Firestore transaction to confirm the transaction, activate the coupon, update wallet balance, mark SMS as processed

### 9.5 Affiliate / Referral
- Referral code pre-filled from URL param during signup
- Multi-generation affiliate chain tracked (`parrain`, `grandParrain`, `greatParrain`)
- Bonus calculated at rates: 0.3% / 0.4% / 0.5% depending on referrer level
- Tracked in `MembershipProfile` with affiliate counts and generation

### 9.6 Shareholder / Investment Program
- Users can be shareholders (investor program, separate from regular users)
- Shares tracked per phase (5 phases) with `Shareholder` and `SharePhase` documents
- Dividends/royalties tracked with `bonusValue` and `royalties` fields
- Visible in the Profile page "Mes Parts" tab

---

## 10. Current State & Notable Observations

### ✅ Implemented & Functional
- Authentication (email/password + OTP verification)
- Dashboard with dual wallet display
- Coupon purchase flow (UI → payment page)
- Airtime & data top-up (operator/package selection, phone validation, favorites)
- Task reward system (with Firestore atomic transactions)
- Transaction history with pagination & manual payment verification
- Marketplace product listing with pagination & featured products
- User profile with editable fields & shareholder section
- Firebase real-time subscriptions throughout

### ⚠️ In Progress / Partially Implemented
- **Transfer (P2P)**: UI shell exists but recipient search and transfer form are commented out. Route `/transfer` shows placeholder only.
- **Market search**: Search input rendered but not wired to Firestore queries.
- **Community page**: Route exists, minimal file count — likely stub.
- **History page**: Route exists, minimal file count — likely stub.
- **Analytics component**: Present but no visible integration in pages.

### 🔧 Backend Dependencies
The app relies on an external backend (documented in `docs/backend.json`) for:
- USSD automation (executing airtime/transfer sequences on behalf of users)
- SMS parsing (reading incoming Mobile Money confirmation SMS messages)
- Affiliate bonus calculation triggers

---

## 11. File Count Summary

| Directory | Files |
|---|---|
| `src/app` (pages) | ~19 route files |
| `src/components` | ~38 component files |
| `src/firebase` | ~10 files |
| `src/lib` | 6 files |
| `src/hooks` | 2 files |
| `docs` | 3 files (including this one) |
