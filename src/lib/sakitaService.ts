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
  OFFICIAL_HOTEL_GALLERY,
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

import { normalizeWhatsappID } from './format';

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function makeClientId(prefix: string): string {
  return `${prefix}_${randomHex(10)}`;
}

export function isJsonResponse(resp: Response): boolean {
  const ct = (resp.headers.get('content-type') || '').toLowerCase();
  return ct.includes('application/json');
}

export function apiUrl(path: string): string {
  const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';
  if (!rawBase) return path;
  return `${rawBase.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file bukti transfer.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file bukti transfer.'));
    reader.readAsDataURL(file);
  });
}

function compressImageDataUrl(
  rawDataUrl: string,
  maxDimension: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.max(1, Math.round((height * maxDimension) / width));
          width = maxDimension;
        } else {
          width = Math.max(1, Math.round((width * maxDimension) / height));
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Browser tidak mendukung pemrosesan gambar.'));
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('File gambar bukti transfer tidak dapat diproses.'));
    img.src = rawDataUrl;
  });
}

async function storeProofInFirestore(
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
  const lowerType = (file.type || '').toLowerCase();
  const isPdf = lowerType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isPng = lowerType === 'image/png' || file.name.toLowerCase().endsWith('.png');
  const isJpg =
    lowerType === 'image/jpeg' ||
    lowerType === 'image/jpg' ||
    file.name.toLowerCase().endsWith('.jpg') ||
    file.name.toLowerCase().endsWith('.jpeg');

  if (!isPdf && !isPng && !isJpg) {
    throw new Error('Format file harus berupa JPG, PNG, atau PDF.');
  }

  onProgress(20);
  let dataUrl = await readFileAsDataUrl(file);
  let finalMime: 'image/jpeg' | 'image/png' | 'application/pdf' = isPdf
    ? 'application/pdf'
    : isPng
      ? 'image/png'
      : 'image/jpeg';

  if (isPdf) {
    if (dataUrl.length > 880_000) {
      throw new Error(
        'Ukuran file PDF terlalu besar (maksimal ~600KB). Silakan unggah screenshot bukti transfer dalam format JPG atau PNG.',
      );
    }
  } else {
    onProgress(45);
    const attempts: Array<{ maxDim: number; quality: number }> = [
      { maxDim: 1280, quality: 0.78 },
      { maxDim: 1024, quality: 0.68 },
      { maxDim: 820, quality: 0.56 },
    ];
    for (const step of attempts) {
      if (dataUrl.length <= 850_000 && finalMime === 'image/jpeg') break;
      dataUrl = await compressImageDataUrl(dataUrl, step.maxDim, step.quality);
      finalMime = 'image/jpeg';
      if (dataUrl.length <= 850_000) break;
    }
    if (dataUrl.length > 880_000) {
      throw new Error(
        'Ukuran gambar bukti transfer masih terlalu besar setelah kompresi. Mohon gunakan foto yang lebih kecil.',
      );
    }
  }

  onProgress(75);
  const proofFileId = makeClientId('prf');
  const cleanName = (file.name || 'bukti-transfer').trim().slice(0, 200) || 'bukti-transfer';
  try {
    await setDoc(doc(db, 'payment_proofs', proofFileId), {
      id: proofFileId,
      accessToken,
      registrationNumber,
      fileName: cleanName,
      mimeType: finalMime,
      dataUrl,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `payment_proofs/${proofFileId}`);
  }

  onProgress(100);
  return {
    proofFileId,
    proofFilePath: `firestore:${proofFileId}`,
    proofFileName: cleanName,
    proofMimeType: finalMime,
  };
}

export async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sesi admin tidak aktif.');
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchAdminProofObjectUrl(proofFilePath: string): Promise<string> {
  if (proofFilePath.startsWith('firestore:')) {
    const proofId = proofFilePath.slice('firestore:'.length);
    const snap = await getDoc(doc(db, 'payment_proofs', proofId));
    if (!snap.exists()) {
      throw new Error('Bukti transfer tidak ditemukan di database.');
    }
    const payload = snap.data() as { dataUrl?: string; mimeType?: string };
    if (!payload.dataUrl || !payload.dataUrl.includes(',')) {
      throw new Error('Data lampiran bukti transfer kosong.');
    }
    const [header, base64] = payload.dataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+);base64/i);
    const mimeType = mimeMatch?.[1] || payload.mimeType || 'image/jpeg';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  }

  const headers = await getAdminAuthHeaders();
  const resp = await fetch(proofFilePath, { headers });
  const ct = (resp.headers.get('content-type') || '').toLowerCase();
  if (!resp.ok || ct.includes('text/html')) {
    throw new Error('Bukti transfer tidak tersedia di server.');
  }
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
}

// =========================================================================
// PUBLIC READS (Landing Page, Registration Form, Token-Gated Status Page)
// =========================================================================
const LEGACY_PROGRAM_DATE_LABELS = new Set([
  '21–24 desember 2026',
  '21-24 desember 2026',
  '21 - 24 desember 2026',
  '21 – 24 desember 2026',
]);
const LEGACY_PROGRAM_START_ISO = '2026-12-21T08:00:00+07:00';
const LEGACY_PROGRAM_END_ISO = '2026-12-24T17:00:00+07:00';

function isLegacyProgramDateLabel(val?: string): boolean {
  if (!val) return false;
  return LEGACY_PROGRAM_DATE_LABELS.has(val.trim().toLowerCase());
}

function normalizeLegacyProgramDates(prog: Program): Program {
  if (prog.id !== DEFAULT_PROGRAM.id) return prog;
  const nextDateLabel = isLegacyProgramDateLabel(prog.dateLabel)
    ? DEFAULT_PROGRAM.dateLabel
    : prog.dateLabel;
  const nextStartIso =
    prog.startDateIso === LEGACY_PROGRAM_START_ISO
      ? DEFAULT_PROGRAM.startDateIso
      : prog.startDateIso;
  const nextEndIso =
    prog.endDateIso === LEGACY_PROGRAM_END_ISO
      ? DEFAULT_PROGRAM.endDateIso
      : prog.endDateIso;
  if (
    nextDateLabel === prog.dateLabel &&
    nextStartIso === prog.startDateIso &&
    nextEndIso === prog.endDateIso
  ) {
    return prog;
  }
  return {
    ...prog,
    dateLabel: nextDateLabel,
    startDateIso: nextStartIso,
    endDateIso: nextEndIso,
  };
}

export async function fetchPublicPrograms(): Promise<Program[]> {
  const path = 'programs';
  try {
    const q = query(collection(db, path), where('status', 'in', ['open', 'closed', 'archived']));
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalizeLegacyProgramDates({ ...(d.data() as Program), id: d.id }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

const LEGACY_WHATSAPP_DIGITS = new Set(['085769427335', '6285769427335']);
const LEGACY_HERO_SUBHEADLINE = 'Bangun Sistem Digital Sendiri dengan AI. Tanpa Harus Bisa Coding.';

function isLegacyWhatsappNumber(val?: string): boolean {
  if (!val) return false;
  const digits = val.replace(/\D/g, '');
  return LEGACY_WHATSAPP_DIGITS.has(digits);
}

export async function fetchWebsiteSettings(): Promise<WebsiteSettings> {
  const path = 'website_settings/default';
  try {
    const snap = await getDoc(doc(db, 'website_settings', 'default'));
    if (!snap.exists()) return DEFAULT_WEBSITE_SETTINGS;
    const merged = { ...DEFAULT_WEBSITE_SETTINGS, ...(snap.data() as WebsiteSettings) };
    if (isLegacyWhatsappNumber(merged.whatsappNumber)) {
      merged.whatsappNumber = DEFAULT_WEBSITE_SETTINGS.whatsappNumber;
    }
    if (merged.heroSubheadline === LEGACY_HERO_SUBHEADLINE) {
      merged.heroSubheadline = DEFAULT_WEBSITE_SETTINGS.heroSubheadline;
      merged.heroDescription = DEFAULT_WEBSITE_SETTINGS.heroDescription;
      merged.tagline = DEFAULT_WEBSITE_SETTINGS.tagline;
    }
    if (!Array.isArray(merged.hotelGallery) || merged.hotelGallery.length === 0) {
      merged.hotelGallery = OFFICIAL_HOTEL_GALLERY;
    }
    return merged;
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
    const ticket = snap.data() as RegistrationTicket;
    if (ticket.programId === DEFAULT_PROGRAM.id && isLegacyProgramDateLabel(ticket.programDates)) {
      return { ...ticket, programDates: DEFAULT_PROGRAM.dateLabel };
    }
    return ticket;
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
  // 1. Validate locally first so static hosting & Express server enforce identical rules
  const trimmedName = input.fullName.trim();
  const trimmedEmail = input.email.trim().toLowerCase();
  const localNormalizedWa = normalizeWhatsappID(input.whatsapp.trim());
  if (trimmedName.length < 2) {
    throw new Error('Nama lengkap wajib diisi minimal 2 karakter.');
  }
  if (!/^62[0-9]{8,15}$/.test(localNormalizedWa)) {
    throw new Error('Format nomor WhatsApp tidak valid. Contoh: 081234567890.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    throw new Error('Format alamat email tidak valid.');
  }

  // Try Express backend initializer first; seamlessly fall back to Web Crypto when served statically
  let registrationId = `reg_${randomHex(12)}`;
  let accessToken = randomHex(24);
  let normalizedWhatsapp = localNormalizedWa;

  try {
    const initResp = await fetch('/api/registration/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: trimmedName,
        whatsapp: input.whatsapp.trim(),
        email: trimmedEmail,
      }),
    });
    if (isJsonResponse(initResp)) {
      const initData = (await initResp.json()) as {
        registrationId?: string;
        accessToken?: string;
        normalizedWhatsapp?: string;
        error?: string;
      };
      if (!initResp.ok) {
        throw new Error(initData.error || 'Gagal menginisialisasi pendaftaran di server.');
      }
      if (initData.registrationId && initData.accessToken && initData.normalizedWhatsapp) {
        registrationId = initData.registrationId;
        accessToken = initData.accessToken;
        normalizedWhatsapp = initData.normalizedWhatsapp;
      }
    }
  } catch (err) {
    // Re-throw genuine backend validation/rate-limit errors; ignore missing /api route on static hosts
    if (
      err instanceof Error &&
      !(err instanceof TypeError) &&
      !(err instanceof SyntaxError) &&
      !err.message.toLowerCase().includes('fetch')
    ) {
      throw err;
    }
  }

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
      const prog = normalizeLegacyProgramDates({ ...(progSnap.data() as Program), id: progSnap.id });
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
    const fallbackToFirestore = () => {
      storeProofInFirestore(file, accessToken, registrationNumber, onProgress)
        .then(resolve)
        .catch(reject);
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('accessToken', accessToken);
    formData.append('registrationNumber', registrationNumber);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/uploads/proof', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(90, Math.round((event.loaded / event.total) * 90)));
      }
    };

    xhr.onload = () => {
      const contentType = (xhr.getResponseHeader('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) {
        // Static hosting (e.g., custom domain without Express) returned HTML/404 -> store securely in Firestore
        fallbackToFirestore();
        return;
      }
      try {
        const parsed = JSON.parse(xhr.responseText) as {
          proofFileId?: string;
          proofFilePath?: string;
          proofFileName?: string;
          proofMimeType?: 'image/jpeg' | 'image/png' | 'application/pdf';
          error?: string;
        };
        if (
          xhr.status >= 200 &&
          xhr.status < 300 &&
          parsed.proofFilePath &&
          parsed.proofMimeType &&
          parsed.proofFileId &&
          parsed.proofFileName
        ) {
          onProgress(100);
          resolve({
            proofFileId: parsed.proofFileId,
            proofFilePath: parsed.proofFilePath,
            proofFileName: parsed.proofFileName,
            proofMimeType: parsed.proofMimeType,
          });
        } else if (xhr.status === 404 || xhr.status === 405) {
          fallbackToFirestore();
        } else {
          reject(new Error(parsed.error || 'Gagal mengunggah file bukti transfer.'));
        }
      } catch {
        fallbackToFirestore();
      }
    };

    xhr.onerror = () => fallbackToFirestore();
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
    const resp = await fetch(apiUrl('/api/notifications/dispatch-submission'), {
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
        senderName: input.senderName.trim(),
        senderBank: input.senderBank.trim(),
        transferDate: input.transferDate,
      }),
    });
    if (resp.ok && isJsonResponse(resp)) {
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
  try {
    const resp = await fetch('/api/community/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });
    if (resp.ok && isJsonResponse(resp)) {
      return (await resp.json()) as {
        unlocked: boolean;
        configured: boolean;
        communityName?: string;
        description?: string;
        whatsappInviteUrl?: string;
      };
    }
  } catch {
    // Fallback to Firestore token verification below when deployed statically
  }

  try {
    const ticket = await fetchRegistrationTicket(accessToken);
    if (!ticket) {
      return { unlocked: false, configured: false };
    }
    const eligible =
      ticket.paymentStatus === 'menunggu_verifikasi' || ticket.paymentStatus === 'lunas';
    if (!eligible) {
      return { unlocked: false, configured: false };
    }
    const configured = Boolean(
      DEFAULT_COMMUNITY_SETTINGS.isActive && DEFAULT_COMMUNITY_SETTINGS.whatsappInviteUrl.trim(),
    );
    return {
      unlocked: true,
      configured,
      communityName: DEFAULT_COMMUNITY_SETTINGS.communityName,
      description: DEFAULT_COMMUNITY_SETTINGS.description,
      whatsappInviteUrl: configured ? DEFAULT_COMMUNITY_SETTINGS.whatsappInviteUrl : '',
    };
  } catch {
    return { unlocked: false, configured: false };
  }
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

  // Ensure default program exists and sync legacy schedule date if still untouched
  const progRef = doc(db, 'programs', DEFAULT_PROGRAM.id);
  try {
    const progSnap = await getDoc(progRef);
    if (!progSnap.exists()) {
      await setDoc(progRef, {
        ...DEFAULT_PROGRAM,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingProg = progSnap.data() as Partial<Program>;
      const progPatch: Record<string, unknown> = {};
      if (isLegacyProgramDateLabel(existingProg.dateLabel)) {
        progPatch.dateLabel = DEFAULT_PROGRAM.dateLabel;
      }
      if (existingProg.startDateIso === LEGACY_PROGRAM_START_ISO) {
        progPatch.startDateIso = DEFAULT_PROGRAM.startDateIso;
      }
      if (existingProg.endDateIso === LEGACY_PROGRAM_END_ISO) {
        progPatch.endDateIso = DEFAULT_PROGRAM.endDateIso;
      }
      if (Object.keys(progPatch).length > 0) {
        await updateDoc(progRef, {
          ...progPatch,
          updatedAt: serverTimestamp(),
        });
      }
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
      } else {
        const existingData = snap.data() as Record<string, unknown>;
        if (seed.col === 'website_settings') {
          const patch: Record<string, unknown> = {};
          if (isLegacyWhatsappNumber(String(existingData.whatsappNumber || ''))) {
            patch.whatsappNumber = DEFAULT_WEBSITE_SETTINGS.whatsappNumber;
          }
          if (String(existingData.heroSubheadline || '') === LEGACY_HERO_SUBHEADLINE) {
            patch.heroSubheadline = DEFAULT_WEBSITE_SETTINGS.heroSubheadline;
            patch.heroDescription = DEFAULT_WEBSITE_SETTINGS.heroDescription;
            patch.tagline = DEFAULT_WEBSITE_SETTINGS.tagline;
          }
          if (!Array.isArray(existingData.hotelGallery) || existingData.hotelGallery.length === 0) {
            patch.hotelGallery = OFFICIAL_HOTEL_GALLERY;
          }
          if (Object.keys(patch).length > 0) {
            await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
          }
        } else if (
          seed.col === 'notification_settings' &&
          isLegacyWhatsappNumber(String(existingData.adminWhatsapp || ''))
        ) {
          await updateDoc(ref, {
            adminWhatsapp: DEFAULT_NOTIFICATION_SETTINGS.adminWhatsapp,
            updatedAt: serverTimestamp(),
          });
        } else if (
          seed.col === 'community_settings' &&
          !String(existingData.whatsappInviteUrl || '').trim()
        ) {
          await updateDoc(ref, {
            whatsappInviteUrl: DEFAULT_COMMUNITY_SETTINGS.whatsappInviteUrl,
            isActive: true,
            updatedAt: serverTimestamp(),
          });
        }
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
      if (resp.ok && isJsonResponse(resp)) {
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

export async function saveProgram(
  program: Program,
  isNew: boolean,
  allPrograms?: Program[],
): Promise<void> {
  const ref = doc(db, 'programs', program.id);
  const cleanSlug =
    program.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100) || program.id.toLowerCase();

  const cleanFacilities = (program.facilities || [])
    .map((f) => f.trim())
    .filter(Boolean)
    .slice(0, 30);

  const cleanCurriculum = (program.curriculum || [])
    .filter((item) => item.title.trim().length > 0)
    .slice(0, 30)
    .map((item, idx) => ({
      number: (item.number || String(idx + 1).padStart(2, '0')).trim().slice(0, 10),
      icon: (item.icon || 'LayoutDashboard').trim().slice(0, 40),
      title: item.title.trim().slice(0, 160),
      description: item.description.trim().slice(0, 600),
      benefit: item.benefit.trim().slice(0, 400),
    }));

  const cleanTargetAudience = (program.targetAudience || [])
    .filter((item) => item.role.trim().length > 0)
    .slice(0, 12)
    .map((item) => ({
      role: item.role.trim().slice(0, 120),
      desc: item.desc.trim().slice(0, 400),
    }));

  const payload = {
    slug: cleanSlug.length >= 3 ? cleanSlug : `${cleanSlug}-prog`,
    name: program.name.trim().slice(0, 180),
    batchLabel: program.batchLabel.trim().slice(0, 80),
    description: program.description.trim().slice(0, 2000),
    dateLabel: program.dateLabel.trim().slice(0, 100),
    startDateIso: program.startDateIso.trim().slice(0, 40),
    endDateIso: program.endDateIso.trim().slice(0, 40),
    durationLabel: program.durationLabel.trim().slice(0, 60),
    location: program.location.trim().slice(0, 200),
    price: Math.max(0, Math.min(500000000, Number(program.price) || 0)),
    quota: Math.max(1, Math.min(5000, Number(program.quota) || 1)),
    reservationHours: Math.max(1, Math.min(720, Number(program.reservationHours) || 48)),
    projectCount: Math.max(
      1,
      Math.min(100, Number(program.projectCount) || cleanCurriculum.length || 1),
    ),
    targetRevenue: Math.max(0, Number(program.targetRevenue) || 0),
    status: program.status,
    isFeatured: Boolean(program.isFeatured),
    facilities: cleanFacilities,
    curriculum: cleanCurriculum,
    bannerUrl: (program.bannerUrl || '').trim().slice(0, 500),
    headline: (program.headline || '').trim().slice(0, 240),
    subheadline: (program.subheadline || '').trim().slice(0, 300),
    targetAudience: cleanTargetAudience,
  };

  try {
    if (isNew) {
      await setDoc(ref, {
        id: program.id,
        ...payload,
        confirmedCount: 0,
        reservedCount: 0,
        waitlistCount: 0,
        registrationSeq: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }

    if (payload.isFeatured && allPrograms && allPrograms.length > 0) {
      const othersToUnfeature = allPrograms.filter(
        (other) => other.id !== program.id && other.isFeatured,
      );
      await Promise.all(
        othersToUnfeature.map((other) =>
          updateDoc(doc(db, 'programs', other.id), {
            isFeatured: false,
            updatedAt: serverTimestamp(),
          }),
        ),
      );
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, `programs/${program.id}`);
  }

  await logAdminAudit(
    isNew ? 'BUAT_PROGRAM' : 'EDIT_PROGRAM',
    'program',
    program.id,
    `${isNew ? 'Membuat' : 'Memperbarui'} program "${payload.name}" (Slug: /program/${payload.slug}, Status: ${payload.status}, Kuota: ${payload.quota})`,
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
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }

  // Best-effort sync to Express runtime if available
  try {
    const headers = await getAdminAuthHeaders();
    const resp = await fetch('/api/admin/sync-runtime', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ community: settings }),
    });
    if (!resp.ok && isJsonResponse(resp)) {
      const errData = (await resp.json()) as { error?: string };
      console.warn('Community runtime sync warning:', errData.error);
    }
  } catch (err) {
    console.warn('Community runtime sync skipped on static host:', err);
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
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }

  // Best-effort sync to Express runtime if available
  try {
    const headers = await getAdminAuthHeaders();
    await fetch('/api/admin/sync-runtime', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications: settings }),
    });
  } catch (err) {
    console.warn('Notification runtime sync skipped on static host:', err);
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
  if (!isJsonResponse(resp)) {
    throw new Error(
      'Unggah file langsung tidak tersedia pada hosting statis. Silakan tempel URL gambar langsung pada kolom URL.',
    );
  }
  const data = (await resp.json()) as { url?: string; error?: string };
  if (!resp.ok || !data.url) {
    throw new Error(data.error || 'Gagal mengunggah gambar.');
  }
  return data.url;
}

export async function sendTestAdminNotification(): Promise<{
  email: { recipient: string; status: 'sent' | 'failed' | 'unconfigured'; errorMessage: string };
  whatsapp: { recipient: string; status: 'sent' | 'failed' | 'unconfigured'; errorMessage: string };
}> {
  const headers = await getAdminAuthHeaders();
  const resp = await fetch(apiUrl('/api/notifications/test-admin'), {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
  if (!isJsonResponse(resp)) {
    throw new Error(
      'Server notifikasi otomatis tidak terdeteksi pada domain ini. Pastikan aplikasi dijalankan sebagai server Node.js atau atur VITE_API_BASE_URL.',
    );
  }
  const data = (await resp.json()) as {
    email?: { recipient: string; status: 'sent' | 'failed' | 'unconfigured'; errorMessage: string };
    whatsapp?: { recipient: string; status: 'sent' | 'failed' | 'unconfigured'; errorMessage: string };
    error?: string;
  };
  if (!resp.ok || !data.email || !data.whatsapp) {
    throw new Error(data.error || 'Gagal menjalankan tes notifikasi admin.');
  }
  return { email: data.email, whatsapp: data.whatsapp };
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
