import type { Timestamp } from 'firebase/firestore';
import type { PaymentStatus, RegistrationStatus } from '../types';

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function normalizeWhatsappID(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

export function formatWhatsappDisplay(normalized: string): string {
  if (!normalized) return '-';
  if (normalized.startsWith('62')) {
    return `0${normalized.slice(2)}`;
  }
  return normalized;
}

export function toWhatsappLink(rawPhone: string, message?: string): string {
  const digits = normalizeWhatsappID(rawPhone || '085121634560');
  const base = `https://wa.me/${digits}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}

export function formatTimestampID(ts: unknown): string {
  if (!ts) return '-';
  let date: Date | null = null;
  if (typeof ts === 'string') {
    const parsed = new Date(ts);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  } else if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as Timestamp).toDate === 'function') {
    date = (ts as Timestamp).toDate();
  } else if (ts instanceof Date) {
    date = ts;
  }
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date) + ' WIB';
}

export function getPaymentStatusMeta(status: PaymentStatus): {
  label: string;
  tone: 'emerald' | 'amber' | 'rose' | 'slate' | 'cyan' | 'indigo';
} {
  switch (status) {
    case 'lunas':
      return { label: 'Lunas', tone: 'emerald' };
    case 'menunggu_verifikasi':
      return { label: 'Menunggu Verifikasi', tone: 'amber' };
    case 'ditolak':
      return { label: 'Pembayaran Ditolak', tone: 'rose' };
    case 'minta_bukti_ulang':
      return { label: 'Minta Bukti Ulang', tone: 'indigo' };
    case 'daftar_tunggu':
      return { label: 'Daftar Tunggu', tone: 'cyan' };
    case 'belum_unggah':
    default:
      return { label: 'Belum Unggah Bukti', tone: 'slate' };
  }
}

export function getRegistrationStatusLabel(status: RegistrationStatus): string {
  switch (status) {
    case 'active':
      return 'Aktif';
    case 'pending_payment':
      return 'Menunggu Pembayaran';
    case 'waitlist':
      return 'Daftar Tunggu';
    case 'cancelled':
      return 'Dibatalkan';
    case 'expired':
      return 'Kedaluwarsa';
    default:
      return status;
  }
}

export function computeRemainingSeats(quota: number, confirmedCount: number, reservedCount: number): number {
  return Math.max(0, quota - confirmedCount - reservedCount);
}
