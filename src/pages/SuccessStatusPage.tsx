import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Lock,
  MessageCircle,
  RefreshCw,
  Users,
} from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { useToast } from '../context/ToastContext';
import { DEFAULT_WEBSITE_SETTINGS, getParticipantPackageInfo } from '../lib/defaults';
import { formatRupiah, getPaymentStatusMeta, toWhatsappLink } from '../lib/format';
import { trackMetaContact, trackMetaPurchase } from '../lib/metaPixel';
import {
  fetchRegistrationTicket,
  fetchUnlockedCommunityLink,
  fetchWebsiteSettings,
} from '../lib/sakitaService';
import type { RegistrationTicket, WebsiteSettings } from '../types';

interface SuccessStatusPageProps {
  token: string;
  mode: 'success' | 'status';
  navigate: (path: string) => void;
}

export function SuccessStatusPage({ token, mode, navigate }: SuccessStatusPageProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<RegistrationTicket | null>(null);
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [communityInfo, setCommunityInfo] = useState<{
    unlocked: boolean;
    configured: boolean;
    communityName?: string;
    description?: string;
    whatsappInviteUrl?: string;
  }>({ unlocked: false, configured: false });
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [foundTicket, webSet] = await Promise.all([
          fetchRegistrationTicket(token),
          fetchWebsiteSettings(),
        ]);
        if (!active) return;
        setTicket(foundTicket);
        setSettings(webSet);

        // STRICT SECURITY: Unlock community link & fire Meta Purchase ONLY when payment is verified LUNAS by admin
        if (foundTicket && foundTicket.paymentStatus === 'lunas') {
          trackMetaPurchase({
            registrationId: foundTicket.registrationId,
            registrationNumber: foundTicket.registrationNumber,
            programId: foundTicket.programId,
            programName: foundTicket.programName,
            amount: foundTicket.amount,
            paymentStatus: foundTicket.paymentStatus,
          });
          const comm = await fetchUnlockedCommunityLink(token);
          if (active) setCommunityInfo(comm);
        } else {
          if (active) setCommunityInfo({ unlocked: false, configured: false });
        }
      } catch (err) {
        console.error('Error loading registration ticket:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [token]);

  const statusUrl = `${window.location.origin}/status/${encodeURIComponent(token)}`;
  const adminDashboardUrl = `${window.location.origin}/admin`;
  const packageInfo = ticket ? getParticipantPackageInfo(ticket) : null;
  const waAdminLink = toWhatsappLink(
    settings.whatsappNumber || '085121634560',
    ticket
      ? ticket.paymentStatus === 'menunggu_verifikasi'
        ? `Halo Admin SAKITA, saya sudah membayar & mengunggah bukti transfer. Mohon verifikasi pendaftaran saya:\n\n• No. Registrasi: ${ticket.registrationNumber}\n• Nama: ${ticket.fullName}\n• Lembaga: ${ticket.institution}\n• Program: ${ticket.programName}\n• Paket: ${packageInfo?.label || '-'} (${packageInfo?.lodgingShortLabel || '-'})\n• Nominal: ${formatRupiah(ticket.amount)}\n• Status: Menunggu Verifikasi\n\nCek verifikasi di Dashboard Admin:\n${adminDashboardUrl}`
        : `Halo Admin SAKITA, saya ${ticket.fullName} (No. Registrasi: ${ticket.registrationNumber}${packageInfo && !packageInfo.isLegacy ? ` — ${packageInfo.label}` : ''}) ingin mengonfirmasi status pendaftaran saya.`
      : 'Halo Admin SAKITA, saya ingin bertanya mengenai status pendaftaran saya.',
  );

  const handleCopyStatusUrl = async () => {
    try {
      await navigator.clipboard.writeText(statusUrl);
      setCopiedUrl(true);
      toast('success', 'Tautan status pribadi disalin', 'Simpan tautan ini untuk mengecek status pembayaran Anda kapan saja.');
      window.setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      toast('error', 'Gagal menyalin tautan');
    }
  };

  const handleDownloadProofReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#080F1D] text-[#F8FAFC]">
        <Loader2 className="h-7 w-7 animate-spin text-[#22D3EE]" />
        <p className="mt-3 text-sm text-[#94A3B8]">Memuat data pendaftaran Anda...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080F1D] px-4 text-[#F8FAFC]">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0F172A] p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-400" />
          <h1 className="mt-4 font-display text-xl font-bold">Data Pendaftaran Tidak Ditemukan</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Tautan status pendaftaran tidak valid atau sudah tidak tersedia. Pastikan Anda membuka
            tautan resmi yang diberikan setelah pendaftaran.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[#22D3EE] px-5 text-sm font-semibold text-[#080F1D]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const statusMeta = getPaymentStatusMeta(ticket.paymentStatus);
  const isWaitlist = ticket.paymentStatus === 'daftar_tunggu';
  const isLunas = ticket.paymentStatus === 'lunas';
  const needsReupload =
    ticket.paymentStatus === 'minta_bukti_ulang' ||
    ticket.paymentStatus === 'ditolak' ||
    ticket.paymentStatus === 'belum_unggah';

  const statusColorClass =
    statusMeta.tone === 'emerald'
      ? 'border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]'
      : statusMeta.tone === 'amber'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
        : statusMeta.tone === 'rose'
          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          : statusMeta.tone === 'indigo'
            ? 'border-[#6366F1]/40 bg-[#6366F1]/15 text-indigo-300'
            : 'border-slate-700 bg-slate-800/80 text-slate-300';

  return (
    <div className="min-h-screen bg-[#080F1D] text-[#F8FAFC]">
      <header className="no-print border-b border-slate-800/80 bg-[#080F1D]/90">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <button type="button" onClick={() => navigate('/')}>
            <BrandMark logoUrl={settings.logoUrl} brandName={settings.brandName || 'SAKITA'} variant="dark" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-slate-800 bg-[#0F172A] p-6 sm:p-10 print:border-slate-300 print:bg-white print:text-slate-900"
        >
          {/* Animated Success / Status Icon */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border ${
                isLunas
                  ? 'border-[#10B981]/40 bg-[#10B981]/15 text-[#10B981]'
                  : 'border-[#22D3EE]/40 bg-[#22D3EE]/10 text-[#22D3EE]'
              }`}
            >
              <CheckCircle2 className="h-7 w-7" />
            </motion.div>

            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {isWaitlist
                ? 'Anda Terdaftar di Daftar Tunggu SAKITA'
                : isLunas
                  ? 'Pembayaran Terverifikasi — E-Tiket Resmi SAKITA'
                  : mode === 'success'
                    ? 'Selamat Datang di Keluarga Besar SAKITA!'
                    : 'Status Pendaftaran Peserta SAKITA'}
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#94A3B8] print:text-slate-600">
              {isWaitlist
                ? 'Data Anda telah tercatat dalam daftar tunggu resmi tanpa perlu melakukan transfer saat ini. Tim admin akan menghubungi Anda melalui WhatsApp apabila kursi tersedia atau angkatan baru dibuka.'
                : isLunas
                  ? 'Pembayaran Anda telah diverifikasi oleh administrator SAKITA dan berstatus LUNAS. Simpan halaman atau cetak bukti ini sebagai e-tiket kehadiran pelatihan Anda.'
                  : 'Selamat! Anda telah mengambil langkah pertama menuju transformasi digital lembaga pendidikan. Pendaftaran dan bukti pembayaran Anda telah berhasil kami terima. Tim kami akan melakukan verifikasi pembayaran.'}
            </p>
          </div>

          {/* Printable Registration Summary / Receipt */}
          <div className="mt-8 rounded-xl border border-slate-800 bg-[#080F1D]/80 p-6 print:border-slate-300 print:bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 print:border-slate-300">
              <div>
                <p className="text-xs text-[#94A3B8] print:text-slate-600">
                  {isLunas ? 'E-Tiket Resmi Peserta' : 'Bukti Pendaftaran Peserta'}
                </p>
                <p className="mt-0.5 font-mono text-lg font-bold text-[#22D3EE] print:text-slate-900">
                  {ticket.registrationNumber}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${statusColorClass}`}
              >
                Status: {statusMeta.label}
              </span>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[#94A3B8] print:text-slate-500">Nama Peserta</dt>
                <dd className="mt-0.5 font-semibold">{ticket.fullName}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#94A3B8] print:text-slate-500">Lembaga</dt>
                <dd className="mt-0.5 font-medium">{ticket.institution}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#94A3B8] print:text-slate-500">Nama Program</dt>
                <dd className="mt-0.5 font-semibold">{ticket.programName}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#94A3B8] print:text-slate-500">Paket yang Dipilih</dt>
                <dd className="mt-0.5 font-semibold text-[#F8FAFC] print:text-slate-900">
                  {packageInfo?.label || 'Paket Pelatihan SAKITA'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#94A3B8] print:text-slate-500">Informasi Penginapan</dt>
                <dd className="mt-0.5 text-xs font-medium leading-relaxed text-[#E2E8F0] print:text-slate-800">
                  {packageInfo?.lodgingDetailLabel || 'Sesuai ketentuan paket terdaftar'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#94A3B8] print:text-slate-500">Jadwal Pelatihan</dt>
                <dd className="mt-0.5 font-medium">{ticket.programDates}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#94A3B8] print:text-slate-500">Lokasi Pelatihan</dt>
                <dd className="mt-0.5 font-medium">{ticket.programLocation}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#94A3B8] print:text-slate-500">Biaya Pelatihan</dt>
                <dd className="mt-0.5 font-mono font-bold text-[#22D3EE] tabular-nums print:text-slate-900">
                  {isWaitlist ? 'Belum ada tagihan (Daftar Tunggu)' : formatRupiah(ticket.amount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#94A3B8] print:text-slate-500">Keterangan Status</dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-[#94A3B8] print:text-slate-700">
                  {isLunas
                    ? 'Pembayaran telah diverifikasi Lunas oleh admin SAKITA.'
                    : isWaitlist
                      ? 'Terdaftar dalam antrean daftar tunggu tanpa pembayaran.'
                      : 'Bukti pendaftaran ini menyatakan bahwa pembayaran masih menunggu verifikasi oleh admin SAKITA.'}
                </dd>
              </div>
            </dl>

            {ticket.rejectionReason && (
              <div className="mt-4 rounded-lg border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                <p className="font-semibold">Catatan Verifikasi Admin:</p>
                <p className="mt-1">{ticket.rejectionReason}</p>
              </div>
            )}
          </div>

          {/* Action if Re-upload / Continue payment needed */}
          {needsReupload && !isWaitlist && (
            <div className="no-print mt-6 rounded-xl border border-amber-500/35 bg-amber-500/10 p-5">
              <p className="text-sm font-semibold text-amber-200">
                {ticket.paymentStatus === 'belum_unggah'
                  ? 'Anda Belum Mengunggah Bukti Transfer'
                  : 'Diperlukan Pengunggahan Ulang Bukti Transfer'}
              </p>
              <p className="mt-1 text-xs text-amber-100/80">
                Silakan lanjutkan ke halaman pembayaran untuk mengunggah bukti transfer yang jelas
                agar kursi Anda dapat segera diproses.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/daftar?token=${encodeURIComponent(ticket.accessToken)}`)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#22D3EE] px-4 py-2 text-xs font-semibold text-[#080F1D]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Unggah Bukti Transfer Sekarang</span>
              </button>
            </div>
          )}

          {/* =================================================================
              KONFIRMASI CEPAT KE WHATSAPP ADMIN (Appears right after proof upload)
             ================================================================= */}
          {!isWaitlist && ticket.paymentStatus === 'menunggu_verifikasi' && (
            <div className="no-print mt-6 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#10B981]/40 bg-[#10B981]/15 text-[#10B981]">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#F8FAFC]">
                      Konfirmasi Cepat ke WhatsApp Admin
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                      Klik tombol di bawah agar notifikasi bukti transfer Anda langsung masuk ke
                      WhatsApp Admin ({settings.whatsappNumber || '0851-2163-4560'}) dan dapat
                      segera diverifikasi.
                    </p>
                  </div>
                </div>
                <a
                  href={waAdminLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackMetaContact({
                      source: 'status_page_confirm_wa',
                      programName: ticket.programName,
                    })
                  }
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#10B981] px-5 text-xs font-bold text-[#080F1D] transition-colors hover:bg-[#10B981]/90 whitespace-nowrap"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Konfirmasi ke WA Admin</span>
                </a>
              </div>
            </div>
          )}

          {/* =================================================================
              SECTION KHUSUS KOMUNITAS (STRICTLY Unlocked ONLY after Admin verifies LUNAS)
             ================================================================= */}
          {!isWaitlist && ticket.paymentStatus !== 'belum_unggah' && (
            <div className="no-print mt-8 rounded-2xl border border-[#22D3EE]/30 bg-gradient-to-br from-[#080F1D] to-[#6366F1]/12 p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#22D3EE]/30 bg-[#22D3EE]/10 text-[#22D3EE]">
                  {isLunas ? <Users className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-[#F8FAFC]">
                    {isLunas
                      ? 'Akses Resmi Komunitas Sekolah AI Kita Terbuka'
                      : 'Akses Komunitas Menunggu Verifikasi Pembayaran'}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">
                    {isLunas
                      ? communityInfo.description ||
                        'Pembayaran Anda telah terverifikasi LUNAS. Bergabunglah dengan Komunitas Sekolah AI Kita untuk mendapatkan informasi persiapan pelatihan, berdiskusi, dan terhubung dengan peserta lainnya.'
                      : 'Demi menjaga keamanan dan privasi komunitas peserta, tautan resmi Komunitas Sekolah AI Kita hanya dibuka setelah pembayaran Anda diverifikasi dan berstatus LUNAS oleh admin SAKITA.'}
                  </p>
                </div>
              </div>

              {isLunas ? (
                communityInfo.unlocked && communityInfo.configured && communityInfo.whatsappInviteUrl ? (
                  <div className="mt-5">
                    <a
                      href={communityInfo.whatsappInviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10B981] px-6 text-sm font-bold tracking-wide text-[#080F1D] transition-colors hover:bg-[#10B981]/90"
                    >
                      <span>GABUNG KOMUNITAS SEKOLAH AI KITA</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <p className="mt-2 text-center text-[11px] text-[#94A3B8]">
                      Tautan eksklusif peserta terverifikasi LUNAS · Mohon tidak disebarluaskan ke publik.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-slate-700 bg-[#0F172A]/90 p-4 text-xs leading-relaxed text-[#94A3B8]">
                    Tautan undangan grup Komunitas Sekolah AI Kita saat ini sedang disiapkan oleh
                    administrator. Silakan hubungi admin melalui tombol <strong>Hubungi Admin</strong>{' '}
                    di bawah untuk mendapatkan akses langsung ke komunitas peserta.
                  </div>
                )
              ) : (
                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-700/80 bg-[#0F172A]/90 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-[#94A3B8]">
                    Simpan tautan status pribadi Anda di bawah ini. Setelah admin memverifikasi
                    transfer Anda menjadi <strong className="text-[#10B981]">LUNAS</strong>, tombol
                    gabung komunitas akan aktif otomatis di halaman ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-600 px-3.5 text-xs font-semibold text-[#F8FAFC] transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE] whitespace-nowrap"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Cek Ulang Status</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Save Private Status Link */}
          <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#080F1D]/60 px-4 py-3 text-xs">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#F8FAFC]">Tautan Status Pribadi Anda</p>
              <p className="truncate font-mono text-[11px] text-[#94A3B8]">{statusUrl}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyStatusUrl}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 font-medium text-[#F8FAFC] hover:border-[#22D3EE]"
            >
              {copiedUrl ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#10B981]" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Tautan</span>
                </>
              )}
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="no-print mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-6">
            <button
              type="button"
              onClick={handleDownloadProofReceipt}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#22D3EE] px-5 text-sm font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90"
            >
              <Download className="h-4 w-4" />
              <span>{isLunas ? 'Unduh / Cetak E-Tiket' : 'Unduh Bukti Pendaftaran'}</span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={waAdminLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackMetaContact({
                    source: 'status_page_footer_wa',
                    programName: ticket.programName,
                  })
                }
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-medium text-[#F8FAFC] hover:border-[#10B981] hover:text-[#10B981]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Hubungi Admin</span>
              </a>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-800 px-4 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
