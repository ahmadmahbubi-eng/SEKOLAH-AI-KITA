import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  formatRupiah,
  formatTimestampID,
  formatWhatsappDisplay,
  getPaymentStatusMeta,
} from '../../lib/format';
import { fetchAdminProofObjectUrl, verifyPaymentAction } from '../../lib/sakitaService';
import type { Payment, Program, Registration } from '../../types';

interface AdminVerificationProps {
  programs: Program[];
  registrations: Registration[];
  payments: Payment[];
}

export function AdminVerification({ programs, registrations, payments }: AdminVerificationProps) {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<'menunggu_verifikasi' | 'all' | 'lunas' | 'ditolak' | 'minta_bukti_ulang'>('menunggu_verifikasi');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [proofBlobUrl, setProofBlobUrl] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const [reasonNote, setReasonNote] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const filteredPayments = useMemo(() => {
    if (filterStatus === 'all') return payments;
    return payments.filter((p) => p.verificationStatus === filterStatus);
  }, [payments, filterStatus]);

  const selectedPayment =
    filteredPayments.find((p) => p.id === selectedPaymentId) || filteredPayments[0] || null;
  const selectedReg = selectedPayment
    ? registrations.find((r) => r.id === selectedPayment.registrationId) || null
    : null;
  const selectedProgram = selectedPayment
    ? programs.find((p) => p.id === selectedPayment.programId) || null
    : null;

  // Fetch private proof file securely with Admin Firebase ID token
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function fetchProof() {
      setProofBlobUrl(null);
      if (!selectedPayment?.proofFilePath) return;
      setLoadingProof(true);
      try {
        createdUrl = await fetchAdminProofObjectUrl(selectedPayment.proofFilePath);
        if (active) setProofBlobUrl(createdUrl);
      } catch (err) {
        console.error('Proof load error:', err);
      } finally {
        if (active) setLoadingProof(false);
      }
    }

    void fetchProof();
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [selectedPayment?.id, selectedPayment?.proofFilePath]);

  const handleDecision = async (decision: 'lunas' | 'ditolak' | 'minta_bukti_ulang') => {
    if (!selectedPayment || !selectedReg || !selectedProgram || processingAction) return;
    if ((decision === 'ditolak' || decision === 'minta_bukti_ulang') && reasonNote.trim().length < 5) {
      toast('error', 'Alasan / catatan wajib diisi', 'Tuliskan alasan minimal 5 karakter untuk peserta.');
      return;
    }

    setProcessingAction(decision);
    try {
      await verifyPaymentAction({
        payment: selectedPayment,
        registration: selectedReg,
        program: selectedProgram,
        decision,
        reason: reasonNote,
      });
      setReasonNote('');
      toast(
        'success',
        decision === 'lunas'
          ? 'Pembayaran Dikonfirmasi LUNAS'
          : decision === 'ditolak'
            ? 'Pembayaran Ditolak'
            : 'Permintaan Bukti Ulang Dikirim',
        `Perubahan untuk ${selectedReg.registrationNumber} telah dicatat pada audit log.`,
      );
    } catch (err) {
      toast('error', 'Gagal memproses verifikasi', err instanceof Error ? err.message : undefined);
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Verifikasi Pembayaran</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Periksa bukti transfer privat, cocokkan nominal, dan catat keputusan pada audit log
          </p>
        </div>

        {/* Status segmented filter */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1">
          {(
            [
              { id: 'menunggu_verifikasi', label: 'Menunggu' },
              { id: 'lunas', label: 'Lunas' },
              { id: 'minta_bukti_ulang', label: 'Bukti Ulang' },
              { id: 'ditolak', label: 'Ditolak' },
              { id: 'all', label: 'Semua' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                filterStatus === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredPayments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 font-display text-base font-semibold text-slate-800">
            Tidak Ada Antrean Bukti Transfer
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Belum ada bukti transfer dengan status filter yang dipilih.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Queue List */}
          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white lg:col-span-4">
            {filteredPayments.map((pay) => {
              const active = selectedPayment?.id === pay.id;
              const meta = getPaymentStatusMeta(pay.verificationStatus);
              return (
                <button
                  key={pay.id}
                  type="button"
                  onClick={() => {
                    setSelectedPaymentId(pay.id);
                    setReasonNote('');
                  }}
                  className={`block w-full px-4 py-4 text-left transition-colors ${
                    active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold">
                      {pay.registrationNumber}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        active
                          ? 'text-[#22D3EE]'
                          : meta.tone === 'emerald'
                            ? 'text-emerald-700'
                            : meta.tone === 'amber'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                      }`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>
                    {pay.senderName}
                  </p>
                  <div
                    className={`mt-1 flex items-center justify-between text-xs ${
                      active ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    <span>{pay.senderBank}</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatRupiah(pay.transferAmount)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Inspection Panel */}
          {selectedPayment && (
            <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="font-mono text-xs font-semibold text-indigo-600">
                    {selectedPayment.registrationNumber}
                  </p>
                  <h2 className="mt-0.5 font-display text-xl font-bold text-slate-900">
                    {selectedReg?.fullName || selectedPayment.senderName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedReg ? `${selectedReg.institution} · ${selectedReg.position}` : 'Detail peserta'}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-500">Nominal Transfer Dilaporkan</p>
                  <p className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                    {formatRupiah(selectedPayment.transferAmount)}
                  </p>
                  {selectedProgram && selectedPayment.transferAmount !== selectedProgram.price && (
                    <p className="text-xs font-semibold text-amber-600">
                      Selisih dari biaya program ({formatRupiah(selectedProgram.price)})
                    </p>
                  )}
                </div>
              </div>

              {/* Transfer + Participant Info */}
              <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">Nama Pengirim:</span>
                  <p className="mt-0.5 font-semibold text-slate-900">{selectedPayment.senderName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Bank Pengirim:</span>
                  <p className="mt-0.5 font-semibold text-slate-900">{selectedPayment.senderBank}</p>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal Transfer:</span>
                  <p className="mt-0.5 font-mono font-semibold text-slate-900">
                    {selectedPayment.transferDate}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Diunggah Pada:</span>
                  <p className="mt-0.5 font-mono text-slate-700">
                    {formatTimestampID(selectedPayment.createdAt)}
                  </p>
                </div>
                {selectedReg && (
                  <>
                    <div>
                      <span className="text-slate-500">WhatsApp Peserta:</span>
                      <p className="mt-0.5 font-mono text-slate-900">
                        {formatWhatsappDisplay(selectedReg.whatsapp)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Email Peserta:</span>
                      <p className="mt-0.5 text-slate-900">{selectedReg.email}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Proof Viewer with Zoom */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">
                    Bukti Transfer Privat ({selectedPayment.proofFileName})
                  </p>
                  {proofBlobUrl && selectedPayment.proofMimeType !== 'application/pdf' && (
                    <button
                      type="button"
                      onClick={() => setZoomOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                      <span>Perbesar Gambar</span>
                    </button>
                  )}
                </div>

                <div className="mt-2 flex min-h-[240px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-3">
                  {loadingProof ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Memuat bukti transfer terenkripsi...</span>
                    </div>
                  ) : !proofBlobUrl ? (
                    <p className="text-xs text-slate-500">
                      File bukti transfer tidak ditemukan pada penyimpanan server.
                    </p>
                  ) : selectedPayment.proofMimeType === 'application/pdf' ? (
                    <div className="text-center">
                      <FileText className="mx-auto h-10 w-10 text-slate-500" />
                      <p className="mt-2 text-xs font-medium text-slate-700">
                        Dokumen PDF ({selectedPayment.proofFileName})
                      </p>
                      <a
                        href={proofBlobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white"
                      >
                        <span>Buka Dokumen PDF</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ) : (
                    <img
                      src={proofBlobUrl}
                      alt={`Bukti transfer ${selectedPayment.registrationNumber}`}
                      onClick={() => setZoomOpen(true)}
                      className="max-h-80 cursor-zoom-in rounded-lg object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Decision Controls */}
              <div className="space-y-4 border-t border-slate-200 pt-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Catatan / Alasan (wajib diisi jika menolak atau meminta bukti ulang)
                  </label>
                  <textarea
                    rows={2}
                    value={reasonNote}
                    onChange={(e) => setReasonNote(e.target.value)}
                    placeholder="Contoh: Foto struk terpotong atau nominal belum sesuai Rp2.700.000."
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={Boolean(processingAction) || selectedPayment.verificationStatus === 'lunas'}
                    onClick={() => handleDecision('lunas')}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {processingAction === 'lunas' ? 'Memproses...' : 'Konfirmasi Lunas'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(processingAction)}
                    onClick={() => handleDecision('minta_bukti_ulang')}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Minta Bukti Ulang</span>
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(processingAction)}
                    onClick={() => handleDecision('ditolak')}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Tolak Pembayaran</span>
                  </button>
                </div>

                {selectedPayment.verifiedBy && (
                  <p className="text-xs text-slate-500">
                    Terakhir diverifikasi oleh <strong>{selectedPayment.verifiedBy}</strong> pada{' '}
                    {formatTimestampID(selectedPayment.verifiedAt)}
                    {selectedPayment.rejectionReason ? ` · Catatan: ${selectedPayment.rejectionReason}` : ''}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Image Zoom */}
      {zoomOpen && proofBlobUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Tutup perbesar gambar"
            className="fixed right-5 top-5 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={proofBlobUrl}
            alt="Perbesar bukti transfer"
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
