/**
 * SAKITA Firestore Security Rules Verification Suite (Phase 0 TDD Specification)
 * Verifies that all "Dirty Dozen" adversarial payloads are rejected with PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  actor: 'anonymous' | 'unverified_admin_email' | 'regular_user' | 'verified_admin';
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const dirtyDozenTests: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Self-Admin Escalation on /admins/{uid}',
    collection: '/admins/attacker-uid',
    operation: 'create',
    actor: 'regular_user',
    payload: { uid: 'attacker-uid', email: 'attacker@example.com', name: 'Attacker', role: 'super_admin', active: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Admin Spoofing',
    collection: '/registrations',
    operation: 'list',
    actor: 'unverified_admin_email',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Public PII Scraping on /registrations',
    collection: '/registrations',
    operation: 'list',
    actor: 'anonymous',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Public Extraction of /community_settings/default',
    collection: '/community_settings/default',
    operation: 'get',
    actor: 'anonymous',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Payment Self-Approval on /payments',
    collection: '/payments/pay_1234567890123456',
    operation: 'create',
    actor: 'anonymous',
    payload: { verificationStatus: 'lunas', transferAmount: 2700000 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow Field Injection on /registrations',
    collection: '/registrations/reg_1234567890123456',
    operation: 'create',
    actor: 'anonymous',
    payload: { isVerified: true, paymentStatus: 'belum_unggah' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Quota Overflow on /programs',
    collection: '/programs/sakita-2026-batch-1',
    operation: 'update',
    actor: 'anonymous',
    payload: { reservedCount: 31 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Program Price Tampering by Public User',
    collection: '/programs/sakita-2026-batch-1',
    operation: 'update',
    actor: 'anonymous',
    payload: { price: 0 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Document ID Poisoning (>128 chars)',
    collection: `/registrations/${'a'.repeat(200)}`,
    operation: 'create',
    actor: 'anonymous',
    payload: { fullName: 'Poison' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Audit Log Deletion by Admin',
    collection: '/audit_logs/log_123456789012',
    operation: 'delete',
    actor: 'verified_admin',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Terminal State Downgrade from lunas to menunggu_verifikasi',
    collection: '/registrations/reg_1234567890123456',
    operation: 'update',
    actor: 'anonymous',
    payload: { paymentStatus: 'menunggu_verifikasi' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Client Timestamp Forgery on Registration Create',
    collection: '/registrations/reg_1234567890123456',
    operation: 'create',
    actor: 'anonymous',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
];
