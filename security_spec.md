# Service Status Companion — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny**: All unmatched Firestore paths deny read and write by default.
2. **Role Integrity**: No user may self-assign `admin`, `advisor`, `technician`, or `parts_manager` on `/users/{userId}` creation or update. Only the bootstrapped admin (`nivekhitha2005@gmail.com` with `email_verified == true`) or an active `/admins/{uid}` document can grant dealership roles.
3. **PII Isolation**: `/users/{userId}` and `/customers/{customerId}` containing email, phone, and address are strictly readable only by the owning user (`uid == request.auth.uid`) or verified dealership staff/admin.
4. **Customer-Scoped Queries**: Customers can only read or list `/serviceOrders`, `/vehicles`, `/appointments`, `/approvalRequests`, and `/notifications` where `resource.data.customerUserId == request.auth.uid`.
5. **Action-Based Updates & Terminal State Locking**:
   - Customers updating `/approvalRequests/{requestId}` may ONLY transition `status` from `'pending'` to `'approved'` or `'declined'` and touch `['status', 'customerResponseNote', 'respondedAt', 'updatedAt']`. Once approved/declined, non-admins cannot mutate it again.
   - Customers updating `/serviceOrders/{orderId}` may ONLY submit `customerRating`, `customerFeedback`, `partExchangeOptIn`, `approvedExtrasTotal`, `totalCost`, `costBreakdown`, `stage`, `stageIndex`, `updatedAt` (strictly for rating, part-exchange opt-in, or approval resolution on their own order).
6. **Safety-Critical Exclusion**: `/circularParts/{partId}` strictly enforces `isSafetyCritical == false` on all creates and updates.
7. **Strict Key & Size Bounds**: Every write validates required + allowed keys (`hasAll` + `hasOnly`), string `.size()` limits, bounded arrays, regex-checked document IDs (`^[a-zA-Z0-9_\-]+$`), and immutable `createdAt`/`customerId`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Privilege Escalation on Signup**: Customer attempts to create `/users/{uid}` with `role: "admin"`. -> MUST FAIL.
2. **Shadow Field Injection**: Advisor attempts to add ghost key `isSuperUser: true` to `/serviceOrders/{id}`. -> MUST FAIL.
3. **Email Spoofing (Unverified)**: Unverified token (`email_verified: false`) attempts admin write. -> MUST FAIL.
4. **Cross-Customer Order Read**: Customer A attempts `get` on Customer B's `/serviceOrders/{orderB}`. -> MUST FAIL.
5. **Blanket List Scraping**: Customer attempts unrestricted `list` on `/customers` or `/employees`. -> MUST FAIL.
6. **ID Poisoning**: Attacker writes to `/vehicles/{1500-char-junk-id}`. -> MUST FAIL.
7. **Value Poisoning**: Customer submits `customerRating: "five"` or 10KB `customerFeedback` string. -> MUST FAIL.
8. **Terminal State Re-Mutation**: Customer attempts to flip an already `'declined'` approval request back to `'approved'`. -> MUST FAIL.
9. **Safety-Critical Part Listing**: Staff attempts to list `/circularParts/{id}` with `isSafetyCritical: true`. -> MUST FAIL.
10. **Immutable Owner Tampering**: User attempts to change `customerId` or `createdAt` during an update. -> MUST FAIL.
11. **Array Exhaustion**: Attacker sends 500 items inside `serviceOrders.checklist`. -> MUST FAIL.
12. **Unauthenticated Write**: Anonymous/unauthenticated caller attempts to create `/notifications/{id}`. -> MUST FAIL.
