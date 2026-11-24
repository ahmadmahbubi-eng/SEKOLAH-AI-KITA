# SAKITA Firestore Security Specification (Phase 0)

## Data Invariants
1. **PII Isolation**: `/registrations` and `/payments` contain personal data (`email`, `whatsapp`, `senderName`, `proofFilePath`) and MUST NEVER be readable (`get` or `list`) by unauthenticated or non-admin users.
2. **Community Link Secrecy**: `/community_settings` MUST NEVER be readable by non-admins in Firestore; community invite links are unlocked strictly server-side after proof upload verification.
3. **Immutable Audit Trail**: `/audit_logs` can only be created by verified admins (`adminUid == request.auth.uid`, `createdAt == request.time`) and can NEVER be updated or deleted.
4. **No Self-Approval of Payments**: Public users can only create `/registrations` with `paymentStatus` in `['belum_unggah', 'daftar_tunggu']` and `/payments` with `verificationStatus == 'menunggu_verifikasi'`. Transition to `'lunas'` is strictly admin-only.
5. **Quota Enforcement**: Public updates to `/programs/{programId}` can only atomically increment `registrationSeq` (+1) or `reservedCount` (+1, strictly bounded by `confirmedCount + reservedCount <= quota`) on open programs.
6. **Token-Gated Status Access**: `/registration_tickets/{accessToken}` requires a 32+ character unguessable token for `get` and forbids `list` for non-admins.
7. **Temporal & Structural Integrity**: All documents validate exact key allowlists (`hasAll` + `hasOnly`), string length bounds, ID regex patterns, and server timestamps (`request.time`).

## The "Dirty Dozen" Adversarial Payloads
1. **Self-Admin Escalation**: Non-admin attempts `create` on `/admins/{uid}` with `role: 'super_admin'`.
2. **Email Spoofing**: Unverified account (`email_verified: false`) matching admin email attempts `read` on `/registrations`.
3. **PII Scraping**: Unauthenticated client attempts `list` on `/registrations` or `/payments`.
4. **Community Link Extraction**: Unauthenticated client attempts `get` on `/community_settings/default`.
5. **Payment Self-Verification**: Public user creates `/payments/{id}` with `verificationStatus: 'lunas'`.
6. **Registration Shadow Field Injection**: Public user creates `/registrations/{id}` with extra field `isVerified: true`.
7. **Quota Overflow**: Public user updates `/programs/sakita-2026-batch-1` setting `reservedCount` past `quota` (31 > 30).
8. **Program Price Tampering**: Public user updates `/programs/sakita-2026-batch-1` changing `price: 0`.
9. **ID Poisoning**: Client writes to `/registrations/` with a 200-char junk document ID containing invalid symbols.
10. **Audit Log Tampering**: Admin attempts `update` or `delete` on `/audit_logs/{logId}`.
11. **Terminal State Overwrite**: Public user attempts to update a registration whose `paymentStatus == 'lunas'` back to `'menunggu_verifikasi'`.
12. **Client Timestamp Forgery**: Client creates `/registrations/{id}` with a backdated `createdAt` instead of `serverTimestamp()`.
