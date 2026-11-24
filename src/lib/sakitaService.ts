import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  DEFAULT_BANK_SETTINGS,
  DEFAULT_COMMUNITY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PROGRAM,
  DEFAULT_WEBSITE_SETTINGS,
} from './defaults';
import type {
  AdminUserRecord,
  BankSettings,
  CommunitySettings,
  NotificationLog,
  NotificationSettings,
  Payment,
  Program,
  Registration,
  RegistrationTicket,
  WebsiteSettings,
} from '../types';

function makeClientId(prefix: string): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}

export async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sesi admin tidak aktif.');
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

// =========================================================================
// PUBLIC READS (Landing Page, Registration Form, Token-Gated Status Page)
// =========================================================================
export async function fetchPublicPrograms(): Promise<Program[]> {
  const path = 'programs';
  try {
    const q = query(collection(db, path), where('status', 'in', ['open', 'closed', 'archived']));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...(d.data() as Program), id: d.id }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchWebsiteSettings(): Promise<WebsiteSettings> {
  const path = 'website_settings/default';
  try {
    const snap = await getDoc(doc(db, 'website_settings', 'default'));
    if (!snap.exists()) return DEFAULT_WEBSITE_SETTINGS;
    return { ...DEFAULT_WEBSITE_SETTINGS, ...(snap.data() as WebsiteSettings) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchBankSettings(): Promise<BankSettings> {
  const path = 'bank_settings/default';
  try {
    const snap = await getDoc(doc(db, 'bank_settings', 'default'));
    if (!snap.exists()) return DEFAULT_BANK_SETTINGS;
    return { ...DEFAULT_BANK_SETTINGS, ...(snap.data() as BankSettings) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchRegistrationTicket(accessToken: string): Promise<RegistrationTicket | null> {
  const path = `registration_tickets/${accessToken}`;
  try {
    const snap = await getDoc(doc(db, 'registration_tickets', accessToken));
    if (!snap.exists()) return null;
    return snap.data() as RegistrationTicket;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// =========================================================================
// PARTICIPANT REGISTRATION & PAYMENT PROOF FLOW
// =========================================================================
export interface CreateRegistrationInput {
  programId: string;
  fullName: string;
  gender: 'Laki-laki' | 'Perempuan';
  whatsapp: string;
  email: string;
  institution: string;
  position: string;
  city: string;
  province: string;
  aiExperience: string;
  expectations: string;
  joinWaitlistIfFull?: boolean;
}

export async function createRegistrationTransaction(
  input: CreateRegistrationInput,
): Promise<{ registration: Registration; ticket: RegistrationTicket; isWaitlist: boolean }> {
  // 1. Server-side validation, rate limiting, and cryptographic token generation
  const initResp = await fetch('/api/registration/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: input.fullName.trim(),
      whatsapp: input.whatsapp.trim(),
      email: input.email.trim(),
    }),
  });
  const initData = (await initResp.json()) as {
    registrationId?: string;
    accessToken?: string;
    normalizedWhatsapp?: string;
    error?: string;
  };
  if (!initResp.ok || !initData.registrationId || !initData.accessToken || !initData.normalizedWhatsapp) {
    throw new Error(initData.error || 'Gagal menginisialisasi pendaftaran di server.');
  }

  const registrationId = initData.registrationId;
  const accessToken = initData.accessToken;
  const normalizedWhatsapp = initData.normalizedWhatsapp;

  // 2. Atomic Firestore transaction for unique sequential registrationNumber & waitlist counter
  const programRef = doc(db, 'programs', input.programId);
  const regRef = doc(db, 'registrations', registrationId);
  const ticketRef = doc(db, 'registration_tickets', accessToken);

  try {
    const result = await runTransaction(db, async (tx) => {
      const progSnap = await tx.get(programRef);
      if (!progSnap.exists()) {
        throw new Error('Program pelatihan tidak ditemukan di database.');
      }
      const prog = progSnap.data() as Program;
      if (prog.status !== 'open') {
        throw new Error('Pendaftaran untuk program ini saat ini ditutup.');
      }

      const remaining = Math.max(0, prog.quota - prog.confirmedCount - prog.reservedCount);
      const isWaitlist = remaining <= 0 || Boolean(input.joinWaitlistIfFull);
      const nextSeq = (prog.registrationSeq || 0) + 1;
      const year = (prog.startDateIso || '2026').slice(0, 4);
      const registrationNumber = `SAKITA-${year}-${String(nextSeq).padStart(4, '0')}`;

      const nowIso = new Date().toISOString();
      const registration: Registration = {
        id: registrationId,
        registrationNumber,
        accessToken,
        programId: prog.id,
        programName: prog.name,
        fullName: input.fullName.trim().slice(0, 140),
        gender: input.gender,
        whatsapp: normalizedWhatsapp,
        email: input.email.trim().toLowerCase().slice(0, 160),
        institution: input.institution.trim().slice(0, 180),
        position: input.position.trim().slice(0, 120),
        city: input.city.trim().slice(0, 100),
        province: input.province.trim().slice(0, 100),
        aiExperience: input.aiExperience.trim().slice(0, 1000),
        expectations: input.expectations.trim().slice(0, 1000),
        registrationStatus: isWaitlist ? 'waitlist' : 'pending_payment',
        paymentStatus: isWaitlist ? 'daftar_tunggu' : 'belum_unggah',
        amount: prog.price,
        rejectionReason: '',
        reservationExpiresAt: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ticket: RegistrationTicket = {
        accessToken,
        registrationId,
        registrationNumber,
        programId: prog.id,
        programName: prog.name,
        programDates: prog.dateLabel,
        programLocation: prog.location,
        fullName: registration.fullName,
        institution: registration.institution,
        amount: prog.price,
        registrationStatus: registration.registrationStatus,
        paymentStatus: registration.paymentStatus,
        rejectionReason: '',
        reservationExpiresAt: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      tx.update(programRef, {
        registrationSeq: nextSeq,
        waitlistCount: isWaitlist ? (prog.waitlistCount || 0) + 1 : prog.waitlistCount || 0,
        updatedAt: serverTimestamp(),
      });
      tx.set(regRef, registration);
      tx.set(ticketRef, ticket);

      return {
        registration: { ...registration, createdAt: nowIso, updatedAt: nowIso },
        ticket: { ...ticket, createdAt: nowIso, updatedAt: nowIso },
        isWaitlist,
      };
    });

    return result;
  } catch (error) {
    if (error instanceof Error && !error.message.toLowerCase().includes('permission')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `registrations/${registrationId}`);
  }
}

export function uploadProofFileWithProgress(
  file: File,
  accessToken: string,
  registrationNumber: string,
  onProgress: (percent: number) => void,
): Promise<{
  proofFileId: string;
  proofFilePath: string;
  proofFileName: string;
  proofMimeType: 'image/jpeg' | 'image/png' | 'application/pdf';
}> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accessToken', accessToken);
    formData.append('registrationNumber', registrationNumber);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/uploads/proof', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText) as {
          proofFileId?: string;
          proofFilePath?: string;
          proofFileName?: string;
          proofMimeType?: 'image/jpeg' | 'image/png' | 'application/pdf';
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300 && parsed.proofFilePath && parsed.proofMimeType && parsed.proofFileId && parsed.proofFileName) {
          onProgress(100);
          resolve({
            proofFileId: parsed.proofFileId,
            proofFilePath: parsed.proofFilePath,
            proofFileName: parsed.proofFileName,
            proofMimeType: parsed.proofMimeType,
          });
        } else {
          reject(new Error(parsed.error || 'Gagal mengunggah file bukti transfer.'));
        }
      } catch {
        reject(new Error('Respon server tidak valid saat mengunggah file.'));
      }
    };

    xhr.onerror = () => reject(new Error('Koneksi terputus saat mengunggah bukti transfer.'));
    xhr.send(formData);
  });
}

export interface SubmitPaymentProofInput {
  registrationId: string;
  registrationNumber: string;
  accessToken: string;
  programId: string;
  programName: string;
  fullName: string;
  email: string;
  institution: string;
  position: string;
  amount: number;
  senderName: string;
  senderBank: string;
  transferDate: string;
  transferAmount: number;
  proofFilePath: string;
  proofFileName: string;
  proofMimeType: 'image/jpeg' | 'image/png' | 'application/pdf';
}

export async function submitPaymentProofTransaction(input: SubmitPaymentProofInput): Promise<{
  paymentId: string;
  reservationExpiresAt: string;
}> {
  const paymentId = makeClientId('pay');
  const programRef = doc(db, 'programs', input.programId);
  const regRef = doc(db, 'registrations', input.registrationId);
  const ticketRef = doc(db, 'registration_tickets', input.accessToken);
  const payRef = doc(db, 'payments', paymentId);

  let reservationExpiresAt = '';

  try {
    await runTransaction(db, async (tx) => {
      const progSnap = await tx.get(programRef);
      const ticketSnap = await tx.get(ticketRef);

      if (!progSnap.exists() || !ticketSnap.exists()) {
        throw new Error('Data program atau pendaftaran tidak ditemukan.');
      }

      const prog = progSnap.data() as Program;
      const ticket = ticketSnap.data() as RegistrationTicket;

      if (ticket.paymentStatus === 'lunas') {
        throw new Error('Pembayaran pendaftaran ini sudah berstatus LUNAS.');
      }
      if (ticket.paymentStatus === 'menunggu_verifikasi') {
        throw new Error('Bukti pembayaran Anda sudah dikirim dan sedang menunggu verifikasi admin.');
      }

      const needsSeatHold = ticket.paymentStatus === 'belum_unggah' || ticket.paymentStatus === 'ditolak';
      if (needsSeatHold) {
        if (prog.confirmedCount + prog.reservedCount >= prog.quota) {
          throw new Error(
            'Mohon maaf, kuota kursi untuk angkatan ini baru saja terpenuhi. Silakan hubungi admin SAKITA melalui WhatsApp untuk konfirmasi.',
          );
        }
        tx.update(programRef, {
          reservedCount: prog.reservedCount + 1,
          updatedAt: serverTimestamp(),
        });
      }

      const ttlHours = prog.reservationHours || 48;
      reservationExpiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();

      const paymentDoc: Payment = {
        id: paymentId,
        registrationId: input.registrationId,
        registrationNumber: input.registrationNumber,
        accessToken: input.accessToken,
        programId: input.programId,
        senderName: input.senderName.trim().slice(0, 140),
        senderBank: input.senderBank.trim().slice(0, 100),
        transferDate: input.transferDate,
        transferAmount: Number(input.transferAmount),
        proofFilePath: input.proofFilePath,
        proofFileName: input.proofFileName.slice(0, 200),
        proofMimeType: input.proofMimeType,
        verificationStatus: 'menunggu_verifikasi',
        verifiedBy: '',
        verifiedAt: '',
        rejectionReason: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      tx.set(payRef, paymentDoc);
      tx.update(regRef, {
        paymentStatus: 'menunggu_verifikasi',
        registrationStatus: 'active',
        reservationExpiresAt,
        rejectionReason: '',
        updatedAt: serverTimestamp(),
      });
      tx.update(ticketRef, {
        paymentStatus: 'menunggu_verifikasi',
        registrationStatus: 'active',
        reservationExpiresAt,
        rejectionReason: '',
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error && !error.message.toLowerCase().includes('permission')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `payments/${paymentId}`);
  }

  // Best-effort notification dispatch — failure MUST NOT affect saved registration
  try {
    const resp = await fetch('/api/notifications/dispatch-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: input.accessToken,
        registrationNumber: input.registrationNumber,
        fullName: input.fullName,
        email: input.email,
        institution: input.institution,
        position: input.position,
        programName: input.programName,
        amount: input.transferAmount,
      }),
    });
    if (resp.ok) {
      const data = (await resp.json()) as {
        results?: Array<{
          channel: NotificationLog['channel'];
          recipient: string;
          subject: string;
          status: NotificationLog['status'];
          attempts: number;
          errorMessage: string;
          payloadSummary: string;
        }>;
      };
      if (Array.isArray(data.results)) {
        for (const item of data.results) {
          const logId = makeClientId('nlog');
          await setDoc(doc(db, 'notification_logs', logId), {
            id: logId,
            eventKey: `submission:${input.registrationNumber}:${item.channel}`,
            channel: item.channel,
            recipient: item.recipient.slice(0, 180),
            subject: (item.subject || '').slice(0, 200),
            registrationNumber: input.registrationNumber,
            status: item.status,
            attempts: item.attempts,
            errorMessage: (item.errorMessage || '').slice(0, 500),
            payloadSummary: (item.payloadSummary || '').slice(0, 1000),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    }
  } catch (err) {
    console.warn('Notification dispatch failed non-fatally:', err);
  }

  return { paymentId, reservationExpiresAt };
}

export async function fetchUnlockedCommunityLink(accessToken: string): Promise<{
  unlocked: boolean;
  configured: boolean;
  communityName?: string;
  description?: string;
  whatsappInviteUrl?: string;
}> {
  const resp = await fetch('/api/community/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken }),
  });
  if (!resp.ok) {
    return { unlocked: false, configured: false };
  }
  return (await resp.json()) as {
    unlocked: boolean;
    configured: boolean;
    communityName?: string;
    description?: string;
    whatsappInviteUrl?: string;
  };
}

// =========================================================================
// ADMIN BOOTSTRAP, AUDIT LOGS, AND MANAGEMENT OPERATIONS
// =========================================================================
export async function logAdminAudit(
  action: string,
  targetType: string,
  targetId: string,
  details: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) return;
  const logId = makeClientId('audit');
  const path = `audit_logs/${logId}`;
  try {
    await setDoc(doc(db, 'audit_logs', logId), {
      id: logId,
      adminUid: user.uid,
      adminEmail: user.email,
      action: action.slice(0, 100),
      targetType: targetType.slice(0, 60),
      targetId: targetId.slice(0, 140),
      details: details.slice(0, 1200),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function bootstrapAdminEnvironment(): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) return;

  // Ensure admin profile doc exists
  const adminRef = doc(db, 'admins', user.uid);
  try {
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        role: 'super_admin',
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } satisfies AdminUserRecord);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `admins/${user.uid}`);
  }

  // Ensure default program exists
  const progRef = doc(db, 'programs', DEFAULT_PROGRAM.id);
  try {
    const progSnap = await getDoc(progRef);
    if (!progSnap.exists()) {
      await setDoc(progRef, {
        ...DEFAULT_PROGRAM,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `programs/${DEFAULT_PROGRAM.id}`);
  }

  // Ensure default settings docs exist
  const settingsSeeds: Array<{ col: string; data: Record<string, unknown> }> = [
    { col: 'website_settings', data: { ...DEFAULT_WEBSITE_SETTINGS, updatedAt: serverTimestamp() } },
    { col: 'bank_settings', data: { ...DEFAULT_BANK_SETTINGS, updatedAt: serverTimestamp() } },
    { col: 'community_settings', data: { ...DEFAULT_COMMUNITY_SETTINGS, updatedAt: serverTimestamp() } },
    { col: 'notification_settings', data: { ...DEFAULT_NOTIFICATION_SETTINGS, updatedAt: serverTimestamp() } },
  ];

  for (const seed of settingsSeeds) {
    const ref = doc(db, seed.col, 'default');
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, seed.data);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${seed.col}/default`);
    }
  }

  // Sync community & notification configs to Express server for secure token-gated unlocks
  try {
    const [commSnap, notifSnap, adminsSnap] = await Promise.all([
      getDoc(doc(db, 'community_settings', 'default')),
      getDoc(doc(db, 'notification_settings', 'default')),
      getDocs(collection(db, 'admins')),
    ]);
    const headers = await getAdminAuthHeaders();
    const extraAdminEmails = adminsSnap.docs
      .map((d) => d.data() as AdminUserRecord)
      .filter((a) => a.active)
      .map((a) => a.email);

    await fetch('/api/admin/sync-runtime', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        community: commSnap.exists() ? commSnap.data() : DEFAULT_COMMUNITY_SETTINGS,
        notifications: notifSnap.exists() ? notifSnap.data() : DEFAULT_NOTIFICATION_SETTINGS,
        extraAdminEmails,
      }),
    });
  } catch (err) {
    console.warn('Runtime sync warning:', err);
  }
}

export async function verifyPaymentAction(params: {
  payment: Payment;
  registration: Registration;
  program: Program;
  decision: 'lunas' | 'ditolak' | 'minta_bukti_ulang';
  reason?: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Autentikasi admin diperlukan.');

  const { payment, registration, program, decision } = params;
  const reason = (params.reason || '').trim().slice(0, 500);
  const nowIso = new Date().toISOString();

  const payRef = doc(db, 'payments', payment.id);
  const regRef = doc(db, 'registrations', registration.id);
  const ticketRef = doc(db, 'registration_tickets', registration.accessToken);
  const progRef = doc(db, 'programs', program.id);

  try {
    await runTransaction(db, async (tx) => {
      const progSnap = await tx.get(progRef);
      const regSnap = await tx.get(regRef);
      if (!progSnap.exists() || !regSnap.exists()) {
        throw new Error('Data program atau peserta tidak ditemukan.');
      }

      const currProg = progSnap.data() as Program;
      const currReg = regSnap.data() as Registration;
      const prevStatus = currReg.paymentStatus;

      let nextConfirmed = currProg.confirmedCount;
      let nextReserved = currProg.reservedCount;

      if (decision === 'lunas' && prevStatus !== 'lunas') {
        if (prevStatus === 'menunggu_verifikasi' || prevStatus === 'minta_bukti_ulang') {
          nextReserved = Math.max(0, nextReserved - 1);
        }
        nextConfirmed = Math.min(currProg.quota, nextConfirmed + 1);
      } else if (decision === 'ditolak') {
        if (prevStatus === 'menunggu_verifikasi' || prevStatus === 'minta_bukti_ulang') {
          nextReserved = Math.max(0, nextReserved - 1);
        } else if (prevStatus === 'lunas') {
          nextConfirmed = Math.max(0, nextConfirmed - 1);
        }
      } else if (decision === 'minta_bukti_ulang') {
        // Keep seat reserved while participant re-uploads proof; if previously lunas, move back to reserved
        if (prevStatus === 'lunas') {
          nextConfirmed = Math.max(0, nextConfirmed - 1);
          nextReserved = Math.min(currProg.quota - nextConfirmed, nextReserved + 1);
        }
      }

      tx.update(payRef, {
        verificationStatus: decision,
        verifiedBy: user.email,
        verifiedAt: nowIso,
        rejectionReason: decision === 'lunas' ? '' : reason,
        updatedAt: serverTimestamp(),
      });

      tx.update(regRef, {
        paymentStatus: decision,
        registrationStatus: decision === 'ditolak' ? 'pending_payment' : 'active',
        rejectionReason: decision === 'lunas' ? '' : reason,
        updatedAt: serverTimestamp(),
      });

      tx.update(ticketRef, {
        paymentStatus: decision,
        registrationStatus: decision === 'ditolak' ? 'pending_payment' : 'active',
        rejectionReason: decision === 'lunas' ? '' : reason,
        updatedAt: serverTimestamp(),
      });

      tx.update(progRef, {
        confirmedCount: nextConfirmed,
        reservedCount: nextReserved,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `payments/${payment.id}`);
  }

  const actionMap = {
    lunas: 'KONFIRMASI_LUNAS',
    ditolak: 'TOLAK_PEMBAYARAN',
    minta_bukti_ulang: 'MINTA_BUKTI_ULANG',
  };
  await logAdminAudit(
    actionMap[decision],
    'payment',
    payment.id,
    `Registrasi ${registration.registrationNumber} (${registration.fullName}) diubah ke ${decision}${reason ? ` — Alasan: ${reason}` : ''}`,
  );

  // Send confirmation email if verified LUNAS
  if (decision === 'lunas') {
    try {
      const headers = await getAdminAuthHeaders();
      const resp = await fetch('/api/notifications/dispatch-verified', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationNumber: registration.registrationNumber,
          fullName: registration.fullName,
          email: registration.email,
          programName: program.name,
          dateLabel: program.dateLabel,
          location: program.location,
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as {
          result?: {
            channel: NotificationLog['channel'];
            recipient: string;
            subject: string;
            status: NotificationLog['status'];
            attempts: number;
            errorMessage: string;
            payloadSummary: string;
          };
        };
        if (data.result) {
          const logId = makeClientId('nlog');
          await setDoc(doc(db, 'notification_logs', logId), {
            id: logId,
            eventKey: `verified:${registration.registrationNumber}:email_verified`,
            channel: data.result.channel,
            recipient: data.result.recipient.slice(0, 180),
            subject: (data.result.subject || '').slice(0, 200),
            registrationNumber: registration.registrationNumber,
            status: data.result.status,
            attempts: data.result.attempts,
            errorMessage: (data.result.errorMessage || '').slice(0, 500),
            payloadSummary: (data.result.payloadSummary || '').slice(0, 1000),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.warn('Verified notification warning:', err);
    }
  }
}

export async function updateParticipantDetails(
  registration: Registration,
  updates: Partial<Pick<Registration, 'fullName' | 'gender' | 'whatsapp' | 'email' | 'institution' | 'position' | 'city' | 'province'>>,
): Promise<void> {
  const regRef = doc(db, 'registrations', registration.id);
  const ticketRef = doc(db, 'registration_tickets', registration.accessToken);
  try {
    await updateDoc(regRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    await updateDoc(ticketRef, {
      fullName: updates.fullName ?? registration.fullName,
      institution: updates.institution ?? registration.institution,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `registrations/${registration.id}`);
  }
  await logAdminAudit(
    'EDIT_PESERTA',
    'registration',
    registration.id,
    `Memperbarui biodata peserta ${registration.registrationNumber} (${updates.fullName || registration.fullName})`,
  );
}

export async function cancelRegistrationAction(registration: Registration): Promise<void> {
  const regRef = doc(db, 'registrations', registration.id);
  const ticketRef = doc(db, 'registration_tickets', registration.accessToken);
  const progRef = doc(db, 'programs', registration.programId);

  try {
    await runTransaction(db, async (tx) => {
      const progSnap = await tx.get(progRef);
      const regSnap = await tx.get(regRef);
      if (!progSnap.exists() || !regSnap.exists()) return;

      const prog = progSnap.data() as Program;
      const currReg = regSnap.data() as Registration;
      if (currReg.registrationStatus === 'cancelled') return;

      let nextConfirmed = prog.confirmedCount;
      let nextReserved = prog.reservedCount;
      let nextWaitlist = prog.waitlistCount;

      if (currReg.paymentStatus === 'lunas') {
        nextConfirmed = Math.max(0, nextConfirmed - 1);
      } else if (currReg.paymentStatus === 'menunggu_verifikasi' || currReg.paymentStatus === 'minta_bukti_ulang') {
        nextReserved = Math.max(0, nextReserved - 1);
      } else if (currReg.paymentStatus === 'daftar_tunggu') {
        nextWaitlist = Math.max(0, nextWaitlist - 1);
      }

      tx.update(regRef, {
        registrationStatus: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      tx.update(ticketRef, {
        registrationStatus: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      tx.update(progRef, {
        confirmedCount: nextConfirmed,
        reservedCount: nextReserved,
        waitlistCount: nextWaitlist,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `registrations/${registration.id}`);
  }

  await logAdminAudit(
    'BATALKAN_PENDAFTARAN',
    'registration',
    registration.id,
    `Membatalkan pendaftaran ${registration.registrationNumber} (${registration.fullName}) dan melepaskan kursi.`,
  );
}

export async function saveProgram(program: Program, isNew: boolean): Promise<void> {
  const ref = doc(db, 'programs', program.id);
  try {
    if (isNew) {
      await setDoc(ref, {
        ...program,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        slug: program.slug,
        name: program.name,
        batchLabel: program.batchLabel,
        description: program.description,
        dateLabel: program.dateLabel,
        startDateIso: program.startDateIso,
        endDateIso: program.endDateIso,
        durationLabel: program.durationLabel,
        location: program.location,
        price: Number(program.price),
        quota: Number(program.quota),
        reservationHours: Number(program.reservationHours),
        projectCount: Number(program.projectCount),
        targetRevenue: Number(program.targetRevenue),
        status: program.status,
        isFeatured: Boolean(program.isFeatured),
        facilities: program.facilities,
        curriculum: program.curriculum,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, `programs/${program.id}`);
  }

  await logAdminAudit(
    isNew ? 'BUAT_PROGRAM' : 'EDIT_PROGRAM',
    'program',
    program.id,
    `${isNew ? 'Membuat' : 'Memperbarui'} program "${program.name}" (Status: ${program.status}, Kuota: ${program.quota})`,
  );
}

export async function saveWebsiteSettings(settings: WebsiteSettings): Promise<void> {
  const path = 'website_settings/default';
  try {
    await setDoc(doc(db, 'website_settings', 'default'), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
  await logAdminAudit('UPDATE_WEBSITE_SETTINGS', 'settings', 'website_settings', 'Memperbarui konten landing page & CMS SAKITA.');
}

export async function saveBankSettings(settings: BankSettings): Promise<void> {
  const path = 'bank_settings/default';
  try {
    await setDoc(doc(db, 'bank_settings', 'default'), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
  await logAdminAudit(
    'UPDATE_BANK_SETTINGS',
    'settings',
    'bank_settings',
    `Memperbarui rekening transfer (${settings.bankName || 'Belum diisi'} — Konfigurasi: ${settings.isConfigured ? 'Aktif' : 'Nonaktif'}).`,
  );
}

export async function saveCommunitySettings(settings: CommunitySettings): Promise<void> {
  const path = 'community_settings/default';
  try {
    await setDoc(doc(db, 'community_settings', 'default'), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
    const headers = await getAdminAuthHeaders();
    const resp = await fetch('/api/admin/sync-runtime', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ community: settings }),
    });
    if (!resp.ok) {
      const errData = (await resp.json()) as { error?: string };
      throw new Error(errData.error || 'Gagal menyinkronkan pengaturan komunitas ke server.');
    }
  } catch (error) {
    if (error instanceof Error && !error.message.toLowerCase().includes('permission')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
  await logAdminAudit(
    'UPDATE_COMMUNITY_SETTINGS',
    'settings',
    'community_settings',
    `Memperbarui pengaturan komunitas "${settings.communityName}" (Aktif: ${settings.isActive ? 'Ya' : 'Tidak'}).`,
  );
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  const path = 'notification_settings/default';
  try {
    await setDoc(doc(db, 'notification_settings', 'default'), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
    const headers = await getAdminAuthHeaders();
    await fetch('/api/admin/sync-runtime', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications: settings }),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
  await logAdminAudit(
    'UPDATE_NOTIFICATION_SETTINGS',
    'settings',
    'notification_settings',
    `Memperbarui pengaturan notifikasi admin (${settings.adminEmail}, WA: ${settings.adminWhatsapp}).`,
  );
}

export async function uploadAdminAsset(file: File): Promise<string> {
  const headers = await getAdminAuthHeaders();
  const formData = new FormData();
  formData.append('file', file);
  const resp = await fetch('/api/uploads/asset', {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = (await resp.json()) as { url?: string; error?: string };
  if (!resp.ok || !data.url) {
    throw new Error(data.error || 'Gagal mengunggah gambar.');
  }
  return data.url;
}

export async function fetchAuditLogs(): Promise<import('../types').AuditLog[]> {
  const path = 'audit_logs';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as import('../types').AuditLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
