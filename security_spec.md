# SamaDeal Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. A user profile at `/users/{userId}` can only be read or created/updated by the verified owner (`request.auth.uid == userId`) or an admin, and users can never self-assign `role: 'admin'`, `isVerified: true`, or `isBlocked: false` changes.
2. A listing at `/listings/{listingId}` can only be created by a verified authenticated user whose `sellerId == request.auth.uid`, and **must** initialize with `isFeatured == false` (no client-side Boost activation).
3. Boost fields on `/listings/{listingId}` (`isFeatured`, `boostPlanId`, `boostPlanName`, `boostPriority`, `boostStartedAt`, `boostExpiresAt`, `boostPaymentId`) are strictly immutable from client SDKs; only the trusted backend / Cloud Functions (Admin SDK) can modify them after official PayDunya verification.
4. All `/boostPayments/{paymentId}` documents are strictly server-write only (`allow create, update, delete: if false` for clients). Sellers may only read/list their own transactions (`resource.data.sellerId == request.auth.uid`).

## 2. Dirty Dozen Payloads (Must Return PERMISSION_DENIED)
1. Client creates a listing with `isFeatured: true` -> DENIED (client cannot self-activate Boost).
2. Client updates own listing to set `boostPlanId: "vip"` or `boostPriority: 5` -> DENIED (system-only Boost fields).
3. Client updates another user's listing -> DENIED (ownership violation).
4. Client creates a `boostPayments` document directly with `status: "completed"` -> DENIED (`boostPayments` client writes forbidden).
5. Client updates a `boostPayments` document to `activated: true` -> DENIED (`boostPayments` client updates forbidden).
6. Non-owner queries/gets another seller's `boostPayments` document -> DENIED (PII / transaction isolation).
7. Unauthenticated user creates or updates a listing -> DENIED (Master Auth Gate).
8. Unverified email user creates a listing -> DENIED (`email_verified == true` gate).
9. Client creates `/users/{uid}` with `role: "admin"` -> DENIED (privilege escalation blocked).
10. Client reads another user's `/users/{otherUid}` PII document -> DENIED (PII isolation).
11. Client injects oversized `title` (> 160 chars) or invalid `listingId` (`../../etc`) -> DENIED (Path & size bounds).
12. Client attempts shadow update adding unknown field `ghostField: true` on `/listings/{id}` -> DENIED (`hasOnly` strict keys guard).
