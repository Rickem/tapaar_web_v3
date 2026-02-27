# Failed Airtime Job Handling & Operator Availability

When an airtime/data job fails, users currently get no feedback — the transaction stays "pending" silently. This plan adds: real-time job status monitoring, automatic retry for transient failures, operator-level disabling for "insuffisant" (balance) errors, and a refund mechanism when retries are exhausted.

## Proposed Design

### How It Works (End-to-End)

```mermaid
flowchart TD
    A[User confirms airtime] --> B[Job created in Firestore<br>status: pending]
    B --> C[Backend executes USSD]
    C --> D{Job status?}
    D -->|completed| E[✅ Success toast on /airtime/status]
    D -->|failed| F{results.ussd_response<br>contains 'insuffisant'?}
    F -->|Yes| G[Set operatorStatus/{operator}<br>disabled = true]
    G --> H[Refund user wallet]
    H --> I[Show 'Opérateur indisponible' message]
    F -->|No| J{retryCount < 2?}
    J -->|Yes| K[Reset job status to 'pending'<br>retryCount++]
    K --> C
    J -->|No| L[Refund user wallet]
    L --> M[Show 'Échec - Remboursé' message]
```

### Key Decisions

> [!IMPORTANT]
> **New Firestore collection `operatorStatus/{operator}`** — contains `{ disabled: boolean, reason: string, updatedAt }`. The `/airtime` page reads this in real-time and disables the operator tab + shows a banner. This auto-disables the operator for ALL users when an "insuffisant" error is detected from ANY user's job.

> [!WARNING]
> **Automatic refund on permanent failure** — when a job fails with "insuffisant" or exhausts retries, the user's wallet is automatically credited back. The transaction status is updated to "cancelled". This means the retry and refund logic runs **on the client side** when the user is viewing the status page. If the user closes the page before the refund, they can still trigger it from the `/transactions` page (pending transactions already have a "Vérifier" button — we'll add a similar "Relancer / Rembourser" flow).

---

## Proposed Changes

### Data Layer

#### [MODIFY] [types.ts](file:///c:/app/projects/tapaar/tapaar_web_latest/src/lib/types.ts)

- Add `retryCount?: number` to the `Job` interface
- Add new `OperatorStatus` interface:
  ```ts
  export interface OperatorStatus {
    disabled: boolean;
    reason: string;
    updatedAt: any;
  }
  ```

---

### Operator Availability (blocks purchases when balance is depleted)

#### [NEW] [use-operator-status.ts](file:///c:/app/projects/tapaar/tapaar_web_latest/src/hooks/use-operator-status.ts)

Custom hook that subscribes to `operatorStatus/{operator}` in real-time. Returns `{ isDisabled, reason, isLoading }`. Used by the airtime page to gate operator tabs.

#### [MODIFY] [airtime/page.tsx](file:///c:/app/projects/tapaar/tapaar_web_latest/src/app/airtime/page.tsx)

- Import and use `useOperatorStatus` for each operator
- If an operator is disabled, show a red banner on that tab: _"Les recharges {operatorName} sont temporairement indisponibles."_
- Disable the package selection cards and "Continuer" button for disabled operators

---

### Job Status Monitoring (real-time feedback after purchase)

#### [NEW] [airtime/status/page.tsx](file:///c:/app/projects/tapaar/tapaar_web_latest/src/app/airtime/status/page.tsx)

New page that the user is redirected to after confirming an airtime purchase (instead of `/dashboard`). This page:

1. **Subscribes to the job document in real-time** via `useDoc<Job>(jobRef)`
2. Shows a status card with animated states:
   - ⏳ **Pending**: "Votre recharge est en cours de traitement..."
   - ✅ **Completed**: "Recharge réussie !" with a "Retour" button
   - ❌ **Failed (insuffisant)**: "L'opérateur est temporairement indisponible. Votre solde a été remboursé."
   - 🔄 **Failed (retryable)**: "Échec temporaire. Nouvelle tentative en cours..." (auto-retries)
   - ❌ **Failed (retries exhausted)**: "La recharge a échoué après plusieurs tentatives. Votre solde a été remboursé."
3. On failure, executes the retry or refund logic (see below)

#### [MODIFY] [airtime/confirm/page.tsx](file:///c:/app/projects/tapaar/tapaar_web_latest/src/app/airtime/confirm/page.tsx)

- Store the `jobRef.id` and `userTransactionRef.id` so we can pass them to the status page
- Change redirect from `router.push("/dashboard")` to `router.push("/airtime/status?jobId=...&txId=...")`

---

### Retry & Refund Logic

#### [NEW] [use-job-handler.ts](file:///c:/app/projects/tapaar/tapaar_web_latest/src/hooks/use-job-handler.ts)

Custom hook used by the status page. Given a `jobId` and `transactionId`:

1. Subscribes to the job document
2. When `job.status === "failed"`:
   - Checks `job.results?.ussd_response` for "insuffisant" (case-insensitive)
   - **If "insuffisant"**:
     - Marks `operatorStatus/{operator}` as `{ disabled: true, reason: "Solde insuffisant", updatedAt }`
     - Refunds the user's wallet (Firestore transaction: credit wallet + update transaction status to "cancelled")
   - **If NOT "insuffisant"** and `retryCount < 2`:
     - Updates the job: `{ status: "pending", retryCount: (current + 1) }`
   - **If NOT "insuffisant"** and `retryCount >= 2`:
     - Refunds the user's wallet
     - Updates transaction status to "cancelled"

---

### Transaction History Enhancement

#### [MODIFY] [transactions/page.tsx](file:///c:/app/projects/tapaar/tapaar_web_latest/src/app/transactions/page.tsx)

- For airtime transactions with `status === "pending"`, add a "Voir le statut" link to `/airtime/status?jobId=...&txId=...` so users can check on their job and trigger retry/refund from there too

---

## Summary of New Files

| File | Purpose |
|---|---|
| `src/hooks/use-operator-status.ts` | Real-time operator availability hook |
| `src/hooks/use-job-handler.ts` | Job monitoring + retry/refund logic |
| `src/app/airtime/status/page.tsx` | Post-purchase status page with live updates |

## Summary of Modified Files

| File | Changes |
|---|---|
| `src/lib/types.ts` | Add `retryCount` to Job, add `OperatorStatus` interface |
| `src/app/airtime/page.tsx` | Disable operators based on `operatorStatus` |
| `src/app/airtime/confirm/page.tsx` | Redirect to `/airtime/status` instead of `/dashboard` |
| `src/app/transactions/page.tsx` | Add "Voir le statut" link for pending airtime transactions |

---

## Verification Plan

### Manual Verification

Since this feature depends on Firestore data and the USSD backend, testing requires simulating job states:

1. **Test operator disabling**: Manually set `operatorStatus/mtn` → `{ disabled: true, reason: "test" }` in the Firebase console, then open `/airtime` and verify the MTN tab shows a disabled banner and packages are unclickable
2. **Test job status page**: After confirming an airtime purchase, verify the user is redirected to `/airtime/status` and sees the pending animation
3. **Test retry**: Manually set a job document's `status` to `"failed"` with `results: { success: false, ussd_response: "network error" }` and verify the status page auto-retries (resets to pending, increments retryCount)
4. **Test insuffisant refund**: Set a job's `status` to `"failed"` with `results: { success: false, ussd_response: "Solde insuffisant" }` and verify the user gets refunded and the operator is marked disabled
5. **Test retry exhaustion refund**: Set `retryCount: 2` and trigger another failure — verify refund happens

> [!TIP]
> You can re-enable an operator at any time by setting `operatorStatus/{operator}` → `{ disabled: false }` in the Firebase console. In the future, a backend cron or admin panel could auto-re-enable operators after the balance is topped up.
