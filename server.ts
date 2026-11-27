import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const INITIAL_ADMIN_EMAIL = (process.env.INITIAL_ADMIN_EMAIL || 'ahmadmahbubi@gmail.com').toLowerCase();

// Load Firebase Project ID & Database ID from firebase-applet-config.json (public web config)
let FIREBASE_PROJECT_ID = '';
let FIREBASE_DATABASE_ID = '(default)';
try {
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as {
      projectId?: string;
      firestoreDatabaseId?: string;
    };
    FIREBASE_PROJECT_ID = parsed.projectId || '';
    FIREBASE_DATABASE_ID = parsed.firestoreDatabaseId || '(default)';
  }
} catch (err) {
  console.error('Failed to read firebase-applet-config.json:', err);
}

async function verifyTicketSubmittedInFirestore(accessToken: string): Promise<boolean> {
  if (!FIREBASE_PROJECT_ID || !/^[a-zA-Z0-9_-]{32,128}$/.test(accessToken)) {
    return false;
  }
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/${encodeURIComponent(FIREBASE_DATABASE_ID)}/documents/registration_tickets/${encodeURIComponent(accessToken)}`;
    const resp = await fetch(url);
    if (!resp.ok) return false;
    const data = (await resp.json()) as {
      fields?: { paymentStatus?: { stringValue?: string } };
    };
    const status = data.fields?.paymentStatus?.stringValue || '';
    return status === 'menunggu_verifikasi' || status === 'lunas';
  } catch {
    return false;
  }
}

// Isolated storage directories strictly outside dist/
const STORAGE_ROOT = path.resolve(__dirname, 'storage_private');
const PROOF_DIR = path.resolve(STORAGE_ROOT, 'proofs');
const ASSET_DIR = path.resolve(STORAGE_ROOT, 'public_assets');
const STATE_DIR = path.resolve(STORAGE_ROOT, 'state');

for (const dir of [STORAGE_ROOT, PROOF_DIR, ASSET_DIR, STATE_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Non-secret runtime metadata persistence for community gate & proof ownership
const COMMUNITY_FILE = path.resolve(STATE_DIR, 'community_gate.json');
const PROOF_INDEX_FILE = path.resolve(STATE_DIR, 'proof_index.json');
const ADMIN_ALLOWLIST_FILE = path.resolve(STATE_DIR, 'admin_emails.json');
const NOTIF_CONFIG_FILE = path.resolve(STATE_DIR, 'notif_config.json');

interface CommunityGateConfig {
  communityName: string;
  whatsappInviteUrl: string;
  description: string;
  isActive: boolean;
}

interface ProofIndexRecord {
  fileId: string;
  fileName: string;
  mimeType: string;
  accessToken: string;
  registrationNumber: string;
  uploadedAt: string;
}

interface NotifRuntimeConfig {
  adminEmail: string;
  adminWhatsapp: string;
  participantEmailSubject: string;
  participantEmailTemplate: string;
  adminEmailSubject: string;
  adminEmailTemplate: string;
  adminWhatsappTemplate: string;
  verifiedEmailSubject: string;
  verifiedEmailTemplate: string;
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
    }
  } catch {
    // ignore corrupt state
  }
  return fallback;
}

function writeJsonFile(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

const DEFAULT_COMMUNITY_INVITE_URL = 'https://chat.whatsapp.com/JSmbDkfooS1EadYZ6ngfXx';
const DEFAULT_ADMIN_WHATSAPP = '6285121634560';

let communityGate: CommunityGateConfig = readJsonFile<CommunityGateConfig>(COMMUNITY_FILE, {
  communityName: 'Komunitas Sekolah AI Kita (SAKITA)',
  whatsappInviteUrl: process.env.COMMUNITY_WHATSAPP_LINK || DEFAULT_COMMUNITY_INVITE_URL,
  description: 'Bergabunglah dengan Komunitas Sekolah AI Kita untuk mendapatkan informasi persiapan pelatihan, berdiskusi, dan terhubung dengan peserta lainnya.',
  isActive: true,
});

if (!communityGate.whatsappInviteUrl) {
  communityGate = {
    ...communityGate,
    whatsappInviteUrl: process.env.COMMUNITY_WHATSAPP_LINK || DEFAULT_COMMUNITY_INVITE_URL,
    isActive: true,
  };
  writeJsonFile(COMMUNITY_FILE, communityGate);
}

let proofIndex: Record<string, ProofIndexRecord> = readJsonFile<Record<string, ProofIndexRecord>>(PROOF_INDEX_FILE, {});
let adminEmails: string[] = readJsonFile<string[]>(ADMIN_ALLOWLIST_FILE, [INITIAL_ADMIN_EMAIL]);
let notifRuntimeConfig: NotifRuntimeConfig = readJsonFile<NotifRuntimeConfig>(NOTIF_CONFIG_FILE, {
  adminEmail: INITIAL_ADMIN_EMAIL,
  adminWhatsapp: DEFAULT_ADMIN_WHATSAPP,
  participantEmailSubject: 'Pendaftaran Berhasil - Sekolah AI Kita',
  participantEmailTemplate:
    'Halo {{nama}},\n\nSelamat! Pendaftaran Anda pada program {{program}} dengan nomor registrasi {{registrasi}} dan bukti transfer telah kami terima.\nStatus saat ini: Menunggu Verifikasi.\n\nAkses Komunitas Sekolah AI Kita: {{komunitas}}\n\nSalam hangat,\nTim Sekolah AI Kita (SAKITA)',
  adminEmailSubject: 'Bukti Transfer Masuk — Perlu Verifikasi SAKITA',
  adminEmailTemplate:
    'Peserta baru telah mengunggah bukti transfer dan menunggu verifikasi Anda.\n\nNomor Registrasi: {{registrasi}}\nNama Peserta: {{nama}}\nLembaga: {{lembaga}} ({{jabatan}})\nProgram: {{program}}\nPengirim: {{pengirim}} ({{bank}})\nTanggal Transfer: {{tanggal_transfer}}\nNominal: {{nominal}}\nStatus: Menunggu Verifikasi\n\nSegera verifikasi di Dashboard Admin:\n{{dashboard}}',
  adminWhatsappTemplate:
    '*BUKTI TRANSFER MASUK — SAKITA*\n\nNo. Reg: {{registrasi}}\nPeserta: {{nama}}\nLembaga: {{lembaga}}\nProgram: {{program}}\nPengirim: {{pengirim}} ({{bank}})\nNominal: {{nominal}}\nStatus: Menunggu Verifikasi\n\nSilakan cek & verifikasi di Dashboard Admin:\n{{dashboard}}',
  verifiedEmailSubject: 'Pembayaran Terverifikasi (LUNAS) - Sekolah AI Kita',
  verifiedEmailTemplate:
    'Halo {{nama}},\n\nPembayaran Anda untuk program {{program}} ({{registrasi}}) telah diverifikasi dan berstatus LUNAS.\n\nTanggal: {{tanggal}}\nLokasi: {{lokasi}}\n\nSilakan persiapkan laptop pribadi dan ikuti informasi teknis di Komunitas Sekolah AI Kita.\n\nSampai jumpa di Jambi!\nTim SAKITA',
});

if (['085769427335', '6285769427335'].includes((notifRuntimeConfig.adminWhatsapp || '').replace(/\D/g, ''))) {
  notifRuntimeConfig = {
    ...notifRuntimeConfig,
    adminWhatsapp: DEFAULT_ADMIN_WHATSAPP,
  };
  writeJsonFile(NOTIF_CONFIG_FILE, notifRuntimeConfig);
}

// Idempotency deduplication cache for notifications (prevents double sending)
const sentEventKeys = new Set<string>();

// =========================================================================
// RATE LIMITING (In-memory sliding window per IP)
// =========================================================================
const rateBuckets = new Map<string, number[]>();

function rateLimit(keyPrefix: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const timestamps = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
    if (timestamps.length >= maxRequests) {
      res.status(429).json({
        error: 'Terlalu banyak permintaan dari perangkat ini. Silakan tunggu beberapa menit lalu coba lagi.',
      });
      return;
    }
    timestamps.push(now);
    rateBuckets.set(key, timestamps);
    next();
  };
}

// =========================================================================
// FIREBASE ID TOKEN VERIFICATION (RS256 via Google JWKS - Zero IAM needed)
// =========================================================================
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

interface VerifiedAdminUser {
  uid: string;
  email: string;
}

async function verifyFirebaseAdminToken(req: Request): Promise<VerifiedAdminUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token || !FIREBASE_PROJECT_ID) return null;

  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    const emailVerified = payload.email_verified === true;
    const uid = typeof payload.sub === 'string' ? payload.sub : '';

    if (!uid || !email || !emailVerified) return null;
    const allowed = email === INITIAL_ADMIN_EMAIL || adminEmails.includes(email);
    if (!allowed) return null;

    return { uid, email };
  } catch {
    return null;
  }
}

async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const admin = await verifyFirebaseAdminToken(req);
  if (!admin) {
    res.status(401).json({ error: 'Akses ditolak. Autentikasi admin yang valid diperlukan.' });
    return;
  }
  (req as Request & { adminUser?: VerifiedAdminUser }).adminUser = admin;
  next();
}

// =========================================================================
// MAGIC BYTES FILE VALIDATION & PATH CONFINEMENT
// =========================================================================
function detectFileSignature(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length < 4) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: '.jpg' };
  }
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mime: 'image/png', ext: '.png' };
  }
  // PDF: 25 50 44 46 (%PDF)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { mime: 'application/pdf', ext: '.pdf' };
  }
  // WEBP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: '.webp' };
  }
  return null;
}

function safeResolveInDir(baseDir: string, filename: string): string | null {
  if (!/^[a-zA-Z0-9_\-.]+$/.test(filename) || filename.includes('..')) {
    return null;
  }
  const cleanName = path.basename(filename);
  const resolved = path.resolve(baseDir, cleanName);
  if (!resolved.startsWith(baseDir + path.sep)) {
    return null;
  }
  return resolved;
}

function normalizeIndonesianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

function formatRupiahServer(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// =========================================================================
// EXTERNAL NOTIFICATION DISPATCHERS (RESEND & WHATSAPP CLOUD API)
// =========================================================================
interface DispatchResult {
  channel: 'email_participant' | 'email_admin' | 'whatsapp_admin' | 'email_verified';
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'unconfigured';
  attempts: number;
  errorMessage: string;
  payloadSummary: string;
}

async function sendResendEmail(to: string, subject: string, textBody: string): Promise<{ status: 'sent' | 'failed' | 'unconfigured'; attempts: number; errorMessage: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'SAKITA <no-reply@sekolahai.id>';

  if (!apiKey) {
    return {
      status: 'unconfigured',
      attempts: 0,
      errorMessage: 'RESEND_API_KEY belum dikonfigurasi pada environment server.',
    };
  }

  let attempts = 0;
  let lastError = '';
  while (attempts < 2) {
    attempts += 1;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          text: textBody,
        }),
      });
      if (response.ok) {
        return { status: 'sent', attempts, errorMessage: '' };
      }
      const errText = await response.text();
      lastError = `HTTP ${response.status}: ${errText.slice(0, 200)}`;
      if (response.status < 500) break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Gagal menghubungi layanan email Resend.';
    }
  }
  return { status: 'failed', attempts, errorMessage: lastError };
}

async function sendWhatsAppMessage(toPhone: string, textBody: string): Promise<{ status: 'sent' | 'failed' | 'unconfigured'; attempts: number; errorMessage: string }> {
  const fonnteToken = process.env.FONNTE_TOKEN?.trim();
  const metaToken = process.env.WHATSAPP_API_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const normalized = normalizeIndonesianPhone(toPhone);

  // 1. Prefer Fonnte (popular, fast Indonesian WhatsApp gateway) when configured
  if (fonnteToken) {
    let attempts = 0;
    let lastError = '';
    while (attempts < 2) {
      attempts += 1;
      try {
        const bodyParams = new URLSearchParams({
          target: normalized,
          message: textBody,
          countryCode: '62',
        });
        const response = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            Authorization: fonnteToken,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: bodyParams.toString(),
        });
        const rawText = await response.text();
        let parsedStatus = false;
        try {
          const parsed = JSON.parse(rawText) as { status?: boolean; reason?: string };
          parsedStatus = parsed.status === true;
          if (!parsedStatus && parsed.reason) {
            lastError = `Fonnte: ${parsed.reason.slice(0, 200)}`;
          }
        } catch {
          parsedStatus = response.ok;
        }
        if (response.ok && parsedStatus) {
          return { status: 'sent', attempts, errorMessage: '' };
        }
        if (!lastError) {
          lastError = `HTTP ${response.status}: ${rawText.slice(0, 200)}`;
        }
        if (response.status < 500) break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Gagal menghubungi layanan WhatsApp Fonnte.';
      }
    }
    return { status: 'failed', attempts, errorMessage: lastError };
  }

  // 2. Alternative: Meta WhatsApp Business Cloud API
  if (metaToken && phoneNumberId) {
    let attempts = 0;
    let lastError = '';
    while (attempts < 2) {
      attempts += 1;
      try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${metaToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: normalized,
            type: 'text',
            text: { body: textBody },
          }),
        });
        if (response.ok) {
          return { status: 'sent', attempts, errorMessage: '' };
        }
        const errText = await response.text();
        lastError = `HTTP ${response.status}: ${errText.slice(0, 200)}`;
        if (response.status < 500) break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Gagal menghubungi WhatsApp Business API.';
      }
    }
    return { status: 'failed', attempts, errorMessage: lastError };
  }

  return {
    status: 'unconfigured',
    attempts: 0,
    errorMessage: 'FONNTE_TOKEN (atau WHATSAPP_API_TOKEN & WHATSAPP_PHONE_NUMBER_ID) belum dikonfigurasi pada server.',
  };
}

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// =========================================================================
// EXPRESS APPLICATION
// =========================================================================
async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Basic security headers (iframe-safe — no X-Frame-Options)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // 1. Health & Integration Status
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'SAKITA Smart Registration System',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/notifications/status', requireAdminAuth, (_req, res) => {
    const emailConnected = Boolean(process.env.RESEND_API_KEY?.trim());
    const fonnteConnected = Boolean(process.env.FONNTE_TOKEN?.trim());
    const metaConnected = Boolean(
      process.env.WHATSAPP_API_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
    );
    const waConnected = fonnteConnected || metaConnected;

    res.json({
      email: {
        provider: 'Resend Email',
        connected: emailConnected,
        statusLabel: emailConnected ? 'Terhubung' : 'Belum Terhubung',
      },
      whatsapp: {
        provider: fonnteConnected
          ? 'Fonnte WhatsApp'
          : metaConnected
            ? 'WhatsApp Business Cloud API'
            : 'Fonnte / WhatsApp Business API',
        connected: waConnected,
        statusLabel: waConnected ? 'Terhubung' : 'Belum Terhubung',
      },
    });
  });

  app.post('/api/notifications/test-admin', requireAdminAuth, rateLimit('notif_test', 10, 15 * 60 * 1000), async (req, res) => {
    const appUrl = (process.env.APP_URL || 'https://sekolahaikita.my.id').replace(/\/$/, '');
    const targetAdminEmail = notifRuntimeConfig.adminEmail || INITIAL_ADMIN_EMAIL;
    const targetAdminWa = notifRuntimeConfig.adminWhatsapp || DEFAULT_ADMIN_WHATSAPP;
    const nowText = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    }).format(new Date());

    const emailBody = `Tes notifikasi otomatis SAKITA berhasil dijalankan pada ${nowText} WIB.\n\nSetiap kali peserta mengunggah bukti transfer, notifikasi akan langsung dikirim ke email ini (${targetAdminEmail}) agar Anda dapat segera memverifikasi di:\n${appUrl}/admin`;
    const waBody = `*TES NOTIFIKASI OTOMATIS SAKITA*\n\nBerhasil terhubung pada ${nowText} WIB.\nSetiap bukti transfer peserta baru akan langsung masuk ke nomor ini.\n\nDashboard Admin:\n${appUrl}/admin`;

    const [emailOutcome, waOutcome] = await Promise.all([
      sendResendEmail(targetAdminEmail, 'Tes Notifikasi Admin — Sekolah AI Kita', emailBody),
      sendWhatsAppMessage(targetAdminWa, waBody),
    ]);

    res.json({
      email: { recipient: targetAdminEmail, ...emailOutcome },
      whatsapp: { recipient: normalizeIndonesianPhone(targetAdminWa), ...waOutcome },
    });
  });

  // 2. Server-side Registration Initialization (rate-limited, validates & generates secure tokens)
  app.post('/api/registration/init', rateLimit('reg_init', 20, 15 * 60 * 1000), (req, res) => {
    const { fullName, whatsapp, email } = req.body as Record<string, unknown>;
    if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 140) {
      res.status(400).json({ error: 'Nama lengkap wajib diisi (2–140 karakter).' });
      return;
    }
    if (typeof whatsapp !== 'string') {
      res.status(400).json({ error: 'Nomor WhatsApp tidak valid.' });
      return;
    }
    const normalizedWa = normalizeIndonesianPhone(whatsapp);
    if (!/^62[0-9]{8,15}$/.test(normalizedWa)) {
      res.status(400).json({ error: 'Format nomor WhatsApp Indonesia tidak valid (contoh: 0851xxxx atau 62851xxxx).' });
      return;
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: 'Alamat email tidak valid.' });
      return;
    }

    const registrationId = `reg_${crypto.randomBytes(12).toString('hex')}`;
    const accessToken = crypto.randomBytes(24).toString('hex'); // 48-char unguessable token

    res.json({
      registrationId,
      accessToken,
      normalizedWhatsapp: normalizedWa,
      issuedAt: new Date().toISOString(),
    });
  });

  // 3. Private Transfer Proof Upload (JPG/JPEG/PNG/PDF, max 5MB, magic-byte checked)
  app.post(
    '/api/uploads/proof',
    rateLimit('proof_upload', 12, 15 * 60 * 1000),
    (req, res, next) => {
      uploadMemory.single('file')(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'Ukuran file maksimal 5 MB.' });
            return;
          }
          res.status(400).json({ error: 'Gagal memproses unggahan file bukti transfer.' });
          return;
        }
        next();
      });
    },
    (req, res) => {
      const file = req.file;
      const accessToken = typeof req.body.accessToken === 'string' ? req.body.accessToken.trim() : '';
      const registrationNumber = typeof req.body.registrationNumber === 'string' ? req.body.registrationNumber.trim() : '';

      if (!file || !file.buffer) {
        res.status(400).json({ error: 'File bukti transfer wajib diunggah.' });
        return;
      }
      if (!/^[a-zA-Z0-9_-]{32,128}$/.test(accessToken)) {
        res.status(400).json({ error: 'Token pendaftaran tidak valid.' });
        return;
      }
      if (!/^SAKITA-[0-9]{4}-[0-9]{4,6}$/.test(registrationNumber)) {
        res.status(400).json({ error: 'Nomor registrasi tidak valid.' });
        return;
      }

      const detected = detectFileSignature(file.buffer);
      if (!detected || !['image/jpeg', 'image/png', 'application/pdf'].includes(detected.mime)) {
        res.status(400).json({
          error: 'Format file tidak didukung. Gunakan file asli berformat JPG, JPEG, PNG, atau PDF (maks. 5 MB).',
        });
        return;
      }

      const fileId = `proof_${crypto.randomBytes(16).toString('hex')}${detected.ext}`;
      const targetPath = safeResolveInDir(PROOF_DIR, fileId);
      if (!targetPath) {
        res.status(500).json({ error: 'Gagal menentukan jalur penyimpanan aman.' });
        return;
      }

      fs.writeFileSync(targetPath, file.buffer);

      proofIndex[fileId] = {
        fileId,
        fileName: path.basename(file.originalname || fileId).slice(0, 180),
        mimeType: detected.mime,
        accessToken,
        registrationNumber,
        uploadedAt: new Date().toISOString(),
      };
      writeJsonFile(PROOF_INDEX_FILE, proofIndex);

      res.json({
        proofFileId: fileId,
        proofFilePath: `/api/uploads/proof/${fileId}`,
        proofFileName: proofIndex[fileId].fileName,
        proofMimeType: detected.mime,
      });
    },
  );

  // 4. Private Transfer Proof Retrieval (STRICTLY Admin Bearer Token OR Owner accessToken)
  app.get('/api/uploads/proof/:fileId', async (req, res) => {
    const fileId = req.params.fileId;
    const record = proofIndex[fileId];
    const resolved = safeResolveInDir(PROOF_DIR, fileId);

    if (!resolved || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Bukti transfer tidak ditemukan.' });
      return;
    }

    const admin = await verifyFirebaseAdminToken(req);
    const queryToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    const isOwner = Boolean(record && queryToken && record.accessToken === queryToken);

    if (!admin && !isOwner) {
      res.status(403).json({ error: 'Bukti transfer bersifat privat dan hanya dapat diakses admin berwenang.' });
      return;
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', record?.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${(record?.fileName || fileId).replace(/"/g, '')}"`);
    fs.createReadStream(resolved).pipe(res);
  });

  // 5. Admin CMS Public Asset Upload (Logo, Banner, Mentor Photo, Hotel Gallery)
  app.post(
    '/api/uploads/asset',
    requireAdminAuth,
    (req, res, next) => {
      uploadMemory.single('file')(req, res, (err) => {
        if (err) {
          res.status(400).json({ error: 'Ukuran gambar maksimal 5 MB.' });
          return;
        }
        next();
      });
    },
    (req, res) => {
      const file = req.file;
      if (!file || !file.buffer) {
        res.status(400).json({ error: 'File gambar wajib diunggah.' });
        return;
      }
      const detected = detectFileSignature(file.buffer);
      if (!detected || !['image/jpeg', 'image/png', 'image/webp'].includes(detected.mime)) {
        res.status(400).json({ error: 'Format gambar harus JPG, PNG, atau WEBP.' });
        return;
      }

      const fileId = `asset_${crypto.randomBytes(12).toString('hex')}${detected.ext}`;
      const targetPath = safeResolveInDir(ASSET_DIR, fileId);
      if (!targetPath) {
        res.status(500).json({ error: 'Gagal menyimpan aset.' });
        return;
      }
      fs.writeFileSync(targetPath, file.buffer);
      res.json({
        url: `/api/assets/${fileId}`,
        fileName: path.basename(file.originalname || fileId).slice(0, 180),
        mimeType: detected.mime,
      });
    },
  );

  app.get('/api/assets/:fileId', (req, res) => {
    const fileId = req.params.fileId;
    const resolved = safeResolveInDir(ASSET_DIR, fileId);
    if (!resolved || !fs.existsSync(resolved)) {
      res.status(404).end();
      return;
    }
    const ext = path.extname(fileId).toLowerCase();
    const mime =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', mime);
    fs.createReadStream(resolved).pipe(res);
  });

  // 6. Admin Sync for Protected Server State (Community Gate, Notification Config, Admin Emails)
  app.post('/api/admin/sync-runtime', requireAdminAuth, (req, res) => {
    const { community, notifications, extraAdminEmails } = req.body as {
      community?: CommunityGateConfig;
      notifications?: NotifRuntimeConfig;
      extraAdminEmails?: string[];
    };

    if (community && typeof community.communityName === 'string') {
      const inviteUrl = typeof community.whatsappInviteUrl === 'string' ? community.whatsappInviteUrl.trim() : '';
      if (inviteUrl && !/^https:\/\/(chat\.whatsapp\.com|wa\.me)\//i.test(inviteUrl) && !/^https:\/\//i.test(inviteUrl)) {
        res.status(400).json({ error: 'Link undangan komunitas harus menggunakan protokol HTTPS yang valid.' });
        return;
      }
      communityGate = {
        communityName: community.communityName.slice(0, 140),
        whatsappInviteUrl: inviteUrl.slice(0, 500),
        description: (community.description || '').slice(0, 1000),
        isActive: Boolean(community.isActive),
      };
      writeJsonFile(COMMUNITY_FILE, communityGate);
    }

    if (notifications && typeof notifications.adminWhatsapp === 'string') {
      notifRuntimeConfig = {
        ...notifRuntimeConfig,
        ...notifications,
      };
      writeJsonFile(NOTIF_CONFIG_FILE, notifRuntimeConfig);
    }

    if (Array.isArray(extraAdminEmails)) {
      const sanitized = extraAdminEmails
        .filter((e): e is string => typeof e === 'string' && e.includes('@'))
        .map((e) => e.trim().toLowerCase());
      adminEmails = Array.from(new Set([INITIAL_ADMIN_EMAIL, ...sanitized]));
      writeJsonFile(ADMIN_ALLOWLIST_FILE, adminEmails);
    }

    res.json({ ok: true });
  });

  // 7. Protected Community Link Unlock (ONLY available after proof upload, NEVER public)
  app.post('/api/community/access', rateLimit('community_unlock', 30, 15 * 60 * 1000), (req, res) => {
    const { accessToken } = req.body as { accessToken?: string };
    if (typeof accessToken !== 'string' || !/^[a-zA-Z0-9_-]{32,128}$/.test(accessToken)) {
      res.status(403).json({ error: 'Akses komunitas memerlukan bukti pendaftaran yang valid.' });
      return;
    }

    const hasProof = Object.values(proofIndex).some((rec) => rec.accessToken === accessToken);
    if (!hasProof) {
      res.status(403).json({
        unlocked: false,
        error: 'Link komunitas tersedia segera setelah bukti transfer berhasil diunggah.',
      });
      return;
    }

    const inviteUrl = communityGate.whatsappInviteUrl || process.env.COMMUNITY_WHATSAPP_LINK || '';
    if (!communityGate.isActive || !inviteUrl) {
      res.json({
        unlocked: true,
        configured: false,
        communityName: communityGate.communityName,
        description: communityGate.description,
      });
      return;
    }

    res.json({
      unlocked: true,
      configured: true,
      communityName: communityGate.communityName,
      description: communityGate.description,
      whatsappInviteUrl: inviteUrl,
    });
  });

  // 8. Notification Dispatch (On Transfer Proof Submitted — Participant Email, Admin Email, Admin WhatsApp)
  app.post('/api/notifications/dispatch-submission', rateLimit('notif_submit', 20, 15 * 60 * 1000), async (req, res) => {
    const {
      accessToken,
      registrationNumber,
      fullName,
      email,
      institution,
      position,
      programName,
      amount,
      senderName,
      senderBank,
      transferDate,
    } = req.body as Record<string, unknown>;

    if (typeof accessToken !== 'string' || typeof registrationNumber !== 'string' || typeof fullName !== 'string' || typeof email !== 'string') {
      res.status(400).json({ error: 'Payload notifikasi tidak lengkap.' });
      return;
    }

    const hasLocalProof = Object.values(proofIndex).some((rec) => rec.accessToken === accessToken);
    const hasFirestoreProof = hasLocalProof ? true : await verifyTicketSubmittedInFirestore(accessToken);
    if (!hasFirestoreProof) {
      res.status(403).json({ error: 'Bukti pembayaran belum tercatat.' });
      return;
    }

    const baseKey = `submission:${registrationNumber}`;
    const appUrl = (process.env.APP_URL || 'https://sekolahaikita.my.id').replace(/\/$/, '');
    const communityLink =
      communityGate.isActive && communityGate.whatsappInviteUrl
        ? communityGate.whatsappInviteUrl
        : 'Hubungi admin SAKITA melalui WhatsApp untuk mendapatkan tautan komunitas.';

    const vars: Record<string, string> = {
      nama: String(fullName).slice(0, 140),
      lembaga: String(institution || '-').slice(0, 180),
      jabatan: String(position || '-').slice(0, 120),
      registrasi: String(registrationNumber).slice(0, 40),
      program: String(programName || 'Kelas Intensif AI untuk Pengelolaan Sekolah & Pesantren').slice(0, 180),
      nominal: formatRupiahServer(Number(amount || 0)),
      pengirim: String(senderName || fullName).slice(0, 140),
      bank: String(senderBank || '-').slice(0, 100),
      tanggal_transfer: String(transferDate || '-').slice(0, 30),
      komunitas: communityLink,
      dashboard: `${appUrl}/admin`,
    };

    const results: DispatchResult[] = [];

    // A. Email Peserta
    const participantKey = `${baseKey}:email_participant`;
    if (!sentEventKeys.has(participantKey)) {
      const subject = notifRuntimeConfig.participantEmailSubject || 'Pendaftaran Berhasil - Sekolah AI Kita';
      const body = renderTemplate(notifRuntimeConfig.participantEmailTemplate, vars);
      const outcome = await sendResendEmail(email, subject, body);
      if (outcome.status === 'sent') sentEventKeys.add(participantKey);
      results.push({
        channel: 'email_participant',
        recipient: email,
        subject,
        status: outcome.status,
        attempts: outcome.attempts,
        errorMessage: outcome.errorMessage,
        payloadSummary: body.slice(0, 400),
      });
    }

    // B. Email Admin
    const adminEmailKey = `${baseKey}:email_admin`;
    const targetAdminEmail = notifRuntimeConfig.adminEmail || INITIAL_ADMIN_EMAIL;
    if (!sentEventKeys.has(adminEmailKey) && targetAdminEmail) {
      const subject = notifRuntimeConfig.adminEmailSubject || 'Bukti Transfer Masuk — Perlu Verifikasi SAKITA';
      const body = renderTemplate(notifRuntimeConfig.adminEmailTemplate, vars);
      const outcome = await sendResendEmail(targetAdminEmail, subject, body);
      if (outcome.status === 'sent') sentEventKeys.add(adminEmailKey);
      results.push({
        channel: 'email_admin',
        recipient: targetAdminEmail,
        subject,
        status: outcome.status,
        attempts: outcome.attempts,
        errorMessage: outcome.errorMessage,
        payloadSummary: body.slice(0, 400),
      });
    }

    // C. WhatsApp Admin
    const adminWaKey = `${baseKey}:whatsapp_admin`;
    const targetAdminWa = notifRuntimeConfig.adminWhatsapp || DEFAULT_ADMIN_WHATSAPP;
    if (!sentEventKeys.has(adminWaKey) && targetAdminWa) {
      const body = renderTemplate(notifRuntimeConfig.adminWhatsappTemplate, vars);
      const outcome = await sendWhatsAppMessage(targetAdminWa, body);
      if (outcome.status === 'sent') sentEventKeys.add(adminWaKey);
      results.push({
        channel: 'whatsapp_admin',
        recipient: normalizeIndonesianPhone(targetAdminWa),
        subject: 'WhatsApp Notifikasi Bukti Transfer Masuk',
        status: outcome.status,
        attempts: outcome.attempts,
        errorMessage: outcome.errorMessage,
        payloadSummary: body.slice(0, 400),
      });
    }

    res.json({ results });
  });

  // 9. Notification Dispatch (On Admin Payment Verification LUNAS)
  app.post('/api/notifications/dispatch-verified', requireAdminAuth, async (req, res) => {
    const {
      registrationNumber,
      fullName,
      email,
      programName,
      dateLabel,
      location,
    } = req.body as Record<string, unknown>;

    if (typeof registrationNumber !== 'string' || typeof email !== 'string' || typeof fullName !== 'string') {
      res.status(400).json({ error: 'Data verifikasi notifikasi tidak lengkap.' });
      return;
    }

    const eventKey = `verified:${registrationNumber}:email_verified`;
    if (sentEventKeys.has(eventKey)) {
      res.json({
        result: {
          channel: 'email_verified',
          recipient: email,
          subject: notifRuntimeConfig.verifiedEmailSubject,
          status: 'sent',
          attempts: 0,
          errorMessage: 'Notifikasi sudah pernah terkirim sebelumnya (deduplikasi aktif).',
          payloadSummary: '',
        },
      });
      return;
    }

    const vars: Record<string, string> = {
      nama: String(fullName),
      registrasi: String(registrationNumber),
      program: String(programName || ''),
      tanggal: String(dateLabel || '28–31 Desember 2026'),
      lokasi: String(location || 'Hotel Grand Makmur, Jambi'),
    };
    const subject = notifRuntimeConfig.verifiedEmailSubject || 'Pembayaran Terverifikasi (LUNAS) - Sekolah AI Kita';
    const body = renderTemplate(notifRuntimeConfig.verifiedEmailTemplate, vars);
    const outcome = await sendResendEmail(email, subject, body);
    if (outcome.status === 'sent') sentEventKeys.add(eventKey);

    res.json({
      result: {
        channel: 'email_verified',
        recipient: email,
        subject,
        status: outcome.status,
        attempts: outcome.attempts,
        errorMessage: outcome.errorMessage,
        payloadSummary: body.slice(0, 400),
      },
    });
  });

  // 10. Admin Notification Retry Endpoint
  app.post('/api/notifications/retry', requireAdminAuth, async (req, res) => {
    const { channel, recipient, subject, payloadSummary } = req.body as {
      channel?: string;
      recipient?: string;
      subject?: string;
      payloadSummary?: string;
    };
    if (!channel || !recipient) {
      res.status(400).json({ error: 'Parameter pengiriman ulang tidak lengkap.' });
      return;
    }

    if (channel === 'whatsapp_admin') {
      const outcome = await sendWhatsAppMessage(recipient, payloadSummary || 'Notifikasi SAKITA');
      res.json(outcome);
      return;
    }

    const outcome = await sendResendEmail(recipient, subject || 'Notifikasi SAKITA', payloadSummary || 'Notifikasi SAKITA');
    res.json(outcome);
  });

  // =========================================================================
  // VITE DEV MIDDLEWARE OR PRODUCTION STATIC SERVING
  // =========================================================================
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SAKITA Smart Registration System server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
