import { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Download, Printer, Shield, Wallet } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { formatRupiah, formatTimestampID } from '../../lib/format';
import type { AuditLog, Payment, Program, Registration } from '../../types';

interface AdminFinanceReportsProps {
  mode: 'keuangan' | 'laporan';
  programs: Program[];
  registrations: Registration[];
  payments: Payment[];
  auditLogs: AuditLog[];
}

export function AdminFinanceReports({
  mode,
  programs,
  registrations,
  payments,
  auditLogs,
}: AdminFinanceReportsProps) {
  const { toast } = useToast();

  const verifiedPayments = useMemo(
    () => payments.filter((p) => p.verificationStatus === 'lunas'),
    [payments],
  );
  const pendingPayments = useMemo(
    () => payments.filter((p) => p.verificationStatus === 'menunggu_verifikasi'),
    [payments],
  );

  const totalVerified = verifiedPayments.reduce((sum, p) => sum + Number(p.transferAmount || 0), 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + Number(p.transferAmount || 0), 0);
  const totalTarget =
    programs
      .filter((p) => p.status !== 'archived')
      .reduce((sum, p) => sum + Number(p.targetRevenue || p.quota * p.price), 0) || 81000000;

  const handleExportFinanceExcel = () => {
    if (verifiedPayments.length === 0) {
      toast('info', 'Belum ada transaksi terverifikasi untuk diekspor');
      return;
    }
    const rows = verifiedPayments.map((p, idx) => ({
      No: idx + 1,
      'No. Registrasi': p.registrationNumber,
      'Pengirim Transfer': p.senderName,
      'Bank Pengirim': p.senderBank,
      'Tanggal Transfer': p.transferDate,
      'Nominal Terverifikasi': p.transferAmount,
      'Diverifikasi Oleh': p.verifiedBy,
      'Waktu Verifikasi': formatTimestampID(p.verifiedAt),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Keuangan Terverifikasi');
    XLSX.writeFile(wb, `SAKITA-Keuangan-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast('success', 'Laporan keuangan Excel berhasil diunduh');
  };

  if (mode === 'keuangan') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Keuangan</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Rekapitulasi pendapatan aktual dari transaksi yang telah disetujui Lunas oleh admin
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportFinanceExcel}
            className="no-print inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor Laporan Keuangan (.xlsx)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Pendapatan Terverifikasi (Lunas)</p>
            <p className="mt-2 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
              {formatRupiah(totalVerified)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{verifiedPayments.length} transaksi lunas</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Menunggu Verifikasi</p>
            <p className="mt-2 font-mono text-2xl font-bold text-amber-600 tabular-nums">
              {formatRupiah(totalPending)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {pendingPayments.length} transaksi belum dihitung sebagai pendapatan
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Target Pendapatan Aktif</p>
            <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatRupiah(totalTarget)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Realisasi {Math.min(100, Math.round((totalVerified / Math.max(1, totalTarget)) * 100))}%
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <span>Buku Besar Transaksi Terverifikasi</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">No. Registrasi</th>
                  <th className="px-4 py-3">Pengirim</th>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Tgl Transfer</th>
                  <th className="px-4 py-3">Diverifikasi Oleh</th>
                  <th className="px-6 py-3 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {verifiedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                      Belum ada transaksi yang diverifikasi Lunas.
                    </td>
                  </tr>
                ) : (
                  verifiedPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-mono font-semibold text-slate-900">
                        {p.registrationNumber}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-900">{p.senderName}</td>
                      <td className="px-4 py-3.5 text-slate-600">{p.senderBank}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-600">{p.transferDate}</td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {p.verifiedBy} · {formatTimestampID(p.verifiedAt)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        {formatRupiah(p.transferAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Laporan & Audit Log View
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Laporan & Audit Log</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Ringkasan performa program dan rekam jejak audit seluruh tindakan administrator
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" />
          <span>Cetak Laporan</span>
        </button>
      </div>

      {/* Per-Program Summary Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Ringkasan Per Program Pelatihan
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-6 py-3">Program</th>
                <th className="px-4 py-3">Kuota</th>
                <th className="px-4 py-3">Pendaftar</th>
                <th className="px-4 py-3">Lunas</th>
                <th className="px-4 py-3">Reservasi</th>
                <th className="px-4 py-3">Daftar Tunggu</th>
                <th className="px-6 py-3 text-right">Pendapatan Lunas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {programs.map((prog) => {
                const progRegs = registrations.filter(
                  (r) => r.programId === prog.id && r.registrationStatus !== 'cancelled',
                );
                const progRev = verifiedPayments
                  .filter((p) => p.programId === prog.id)
                  .reduce((s, p) => s + Number(p.transferAmount || 0), 0);
                return (
                  <tr key={prog.id}>
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {prog.name}
                      <span className="block text-[11px] text-slate-500">{prog.dateLabel}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums">{prog.quota}</td>
                    <td className="px-4 py-3.5 font-mono tabular-nums">{progRegs.length}</td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-emerald-700 tabular-nums">
                      {prog.confirmedCount}
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums">{prog.reservedCount}</td>
                    <td className="px-4 py-3.5 font-mono tabular-nums">{prog.waitlistCount}</td>
                    <td className="px-6 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatRupiah(progRev)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Audit Log */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
            <Shield className="h-4 w-4 text-indigo-600" />
            <span>Audit Log Aktivitas Admin (Immutable)</span>
          </h2>
          <span className="text-xs text-slate-500">{auditLogs.length} catatan</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-6 py-3">Waktu (WIB)</th>
                <th className="px-4 py-3">Admin Pelaksana</th>
                <th className="px-4 py-3">Tindakan</th>
                <th className="px-6 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    Belum ada catatan audit. Setiap verifikasi pembayaran dan perubahan konfigurasi
                    akan otomatis tercatat di sini.
                  </td>
                </tr>
              ) : (
                auditLogs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono whitespace-nowrap text-slate-500 tabular-nums">
                      {formatTimestampID(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{log.adminEmail}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-indigo-700 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
