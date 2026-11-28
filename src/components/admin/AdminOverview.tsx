import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BedDouble,
  CheckCircle2,
  Clock,
  FileWarning,
  Layers,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { getParticipantPackageInfo } from '../../lib/defaults';
import { computeRemainingSeats, formatRupiah, formatTimestampID, getPaymentStatusMeta } from '../../lib/format';
import type { Payment, Program, Registration } from '../../types';

interface AdminOverviewProps {
  programs: Program[];
  selectedProgramId: string;
  onSelectProgram: (id: string) => void;
  registrations: Registration[];
  payments: Payment[];
  onGoToSection: (section: string) => void;
}

export function AdminOverview({
  programs,
  selectedProgramId,
  onSelectProgram,
  registrations,
  payments,
  onGoToSection,
}: AdminOverviewProps) {
  const filteredRegs = useMemo(
    () =>
      selectedProgramId === 'all'
        ? registrations
        : registrations.filter((r) => r.programId === selectedProgramId),
    [registrations, selectedProgramId],
  );

  const filteredPayments = useMemo(
    () =>
      selectedProgramId === 'all'
        ? payments
        : payments.filter((p) => p.programId === selectedProgramId),
    [payments, selectedProgramId],
  );

  const activePrograms = useMemo(
    () =>
      selectedProgramId === 'all'
        ? programs.filter((p) => p.status !== 'archived')
        : programs.filter((p) => p.id === selectedProgramId),
    [programs, selectedProgramId],
  );

  const stats = useMemo(() => {
    const activeRegs = filteredRegs.filter((r) => r.registrationStatus !== 'cancelled');
    const total = activeRegs.length;
    const belumUnggah = activeRegs.filter((r) => r.paymentStatus === 'belum_unggah').length;
    const menunggu = activeRegs.filter(
      (r) => r.paymentStatus === 'menunggu_verifikasi' || r.paymentStatus === 'minta_bukti_ulang',
    ).length;
    const lunas = activeRegs.filter((r) => r.paymentStatus === 'lunas').length;
    const ditolak = activeRegs.filter((r) => r.paymentStatus === 'ditolak').length;

    const totalQuota = activePrograms.reduce((acc, p) => acc + p.quota, 0);
    const totalConfirmed = activePrograms.reduce((acc, p) => acc + p.confirmedCount, 0);
    const totalReserved = activePrograms.reduce((acc, p) => acc + p.reservedCount, 0);
    const sisaKuota = computeRemainingSeats(totalQuota, totalConfirmed, totalReserved);

    const paketHematCount = activeRegs.filter((r) => r.packageCode === 'paket_hemat').length;
    const paketPremiumCount = activeRegs.filter((r) => r.packageCode === 'paket_premium').length;
    const legacyPackageCount = activeRegs.filter((r) => !r.packageCode).length;
    const lodgingNeededCount = activeRegs.filter((r) => r.includesLodging === true).length;

    const totalRegistrationValue = activeRegs.reduce((acc, r) => acc + Number(r.amount || 0), 0);

    // Verified revenue strictly from payments verified as 'lunas' by admin
    const verifiedRevenue = filteredPayments
      .filter((p) => p.verificationStatus === 'lunas')
      .reduce((acc, p) => acc + Number(p.transferAmount || 0), 0);

    const remainingPayment = Math.max(0, totalRegistrationValue - verifiedRevenue);
    const targetRevenue = activePrograms.reduce((acc, p) => acc + Number(p.targetRevenue || p.quota * p.price), 0) || 81000000;

    return {
      total,
      belumUnggah,
      menunggu,
      lunas,
      ditolak,
      sisaKuota,
      totalQuota,
      paketHematCount,
      paketPremiumCount,
      legacyPackageCount,
      lodgingNeededCount,
      totalRegistrationValue,
      verifiedRevenue,
      remainingPayment,
      targetRevenue,
    };
  }, [filteredRegs, filteredPayments, activePrograms]);

  // Registration trend by date (actual data)
  const registrationChartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const reg of filteredRegs) {
      const label = formatTimestampID(reg.createdAt).split(',')[0] || 'Hari ini';
      map.set(label, (map.get(label) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([date, jumlah]) => ({ date, jumlah }))
      .slice(-10);
  }, [filteredRegs]);

  const paymentStatusChartData = useMemo(
    () =>
      [
        { name: 'Lunas', value: stats.lunas, color: '#10B981' },
        { name: 'Menunggu Verifikasi', value: stats.menunggu, color: '#F59E0B' },
        { name: 'Belum Unggah', value: stats.belumUnggah, color: '#64748B' },
        { name: 'Ditolak', value: stats.ditolak, color: '#EF4444' },
      ].filter((item) => item.value > 0),
    [stats],
  );

  const revenuePct = Math.min(100, Math.round((stats.verifiedRevenue / Math.max(1, stats.targetRevenue)) * 100));
  const recentRegs = filteredRegs.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Program filter header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Ringkasan Operasional</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Data aktual real-time dari Firestore · Tanpa angka simulasi
          </p>
        </div>
        <select
          value={selectedProgramId}
          onChange={(e) => onSelectProgram(e.target.value)}
          aria-label="Filter program"
          className="h-10 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 focus:border-slate-900 focus:outline-none"
        >
          <option value="all">Semua Program Aktif</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.dateLabel})
            </option>
          ))}
        </select>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Pendaftar', value: String(stats.total), sub: `Kuota total ${stats.totalQuota} kursi`, icon: Users, tone: 'text-slate-900' },
          { label: 'Menunggu Verifikasi', value: String(stats.menunggu), sub: 'Perlu pemeriksaan bukti transfer', icon: Clock, tone: 'text-amber-600' },
          { label: 'Peserta Lunas', value: String(stats.lunas), sub: `Sisa kuota aktual: ${stats.sisaKuota} kursi`, icon: CheckCircle2, tone: 'text-emerald-600' },
          { label: 'Belum Unggah / Ditolak', value: `${stats.belumUnggah} / ${stats.ditolak}`, sub: 'Belum unggah · Ditolak', icon: FileWarning, tone: 'text-slate-700' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>{card.label}</span>
                <Icon className="h-4 w-4 text-slate-400" />
              </div>
              <p className={`mt-2 font-mono text-2xl font-bold tabular-nums ${card.tone}`}>
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Package & Accommodation Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Peserta Paket Hemat</span>
            <Layers className="h-4 w-4 text-cyan-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {stats.paketHematCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Rp1.950.000 · Tanpa fasilitas penginapan</p>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-5">
          <div className="flex items-center justify-between text-xs font-medium text-amber-800">
            <span>Peserta Paket Premium</span>
            <Layers className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {stats.paketPremiumCount}
          </p>
          <p className="mt-1 text-xs text-amber-900/75">Rp2.700.000 · Dengan fasilitas penginapan</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Kebutuhan Penginapan Hotel</span>
            <BedDouble className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-indigo-700 tabular-nums">
            {stats.lodgingNeededCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.legacyPackageCount > 0
              ? `Termasuk ${stats.legacyPackageCount} data lama tanpa kode paket`
              : 'Peserta dengan fasilitas penginapan aktif'}
          </p>
        </div>
      </div>

      {/* Revenue Progress Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Wallet className="h-4 w-4 text-emerald-600" />
              Total Pembayaran Terverifikasi (Lunas)
            </p>
            <p className="mt-2 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
              {formatRupiah(stats.verifiedRevenue)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Nilai Pendaftaran</p>
            <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatRupiah(stats.totalRegistrationValue)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Sisa pembayaran: <strong className="font-mono text-amber-700">{formatRupiah(stats.remainingPayment)}</strong>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-500">Target Pendapatan Program</p>
            <p className="mt-2 font-mono text-lg font-semibold text-slate-700 tabular-nums">
              {formatRupiah(stats.targetRevenue)} ({revenuePct}%)
            </p>
          </div>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${revenuePct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Dihitung eksklusif dari pembayaran yang telah disetujui Lunas oleh admin. Kuota 30 kursi berlaku gabungan seluruh paket.</span>
          {stats.menunggu > 0 && (
            <button
              type="button"
              onClick={() => onGoToSection('verifikasi')}
              className="font-semibold text-indigo-600 hover:underline"
            >
              Verifikasi {stats.menunggu} bukti menunggu →
            </button>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Grafik Pendaftaran Peserta
              </h2>
              <p className="text-xs text-slate-500">Jumlah pendaftar masuk berdasarkan tanggal</p>
            </div>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-5 h-60 w-full">
            {registrationChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
                Belum ada data pendaftaran untuk ditampilkan pada grafik.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={registrationChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar dataKey="jumlah" name="Pendaftar" fill="#0F172A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Grafik Status Pembayaran
          </h2>
          <p className="text-xs text-slate-500">Proporsi status pembayaran aktual</p>
          <div className="mt-5 h-60 w-full">
            {paymentStatusChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
                Belum ada transaksi pembayaran tercatat.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStatusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                  >
                    {paymentStatusChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {paymentStatusChartData.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
              {paymentStatusChartData.map((d) => (
                <span key={d.name} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span>
                    {d.name}: <strong className="font-mono tabular-nums">{d.value}</strong>
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Registrations Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Pendaftaran Terbaru
            </h2>
            <p className="text-xs text-slate-500">Diperbarui otomatis secara real-time</p>
          </div>
          <button
            type="button"
            onClick={() => onGoToSection('peserta')}
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            Lihat Semua Peserta →
          </button>
        </div>

        {recentRegs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            <XCircle className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-2 font-medium text-slate-700">Belum Ada Peserta Terdaftar</p>
            <p className="mt-1 text-xs">
              Data peserta baru akan langsung muncul di sini segera setelah formulir pendaftaran dikirim.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-6 py-3">No. Registrasi</th>
                  <th className="px-4 py-3">Nama Peserta</th>
                  <th className="px-4 py-3">Paket</th>
                  <th className="px-4 py-3">Lembaga</th>
                  <th className="px-4 py-3">Tanggal Daftar</th>
                  <th className="px-6 py-3 text-right">Status Pembayaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentRegs.map((reg) => {
                  const meta = getPaymentStatusMeta(reg.paymentStatus);
                  const pkg = getParticipantPackageInfo(reg);
                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-900">
                        {reg.registrationNumber}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-900">{reg.fullName}</td>
                      <td className="px-4 py-3.5 text-xs">
                        <span
                          className={`font-semibold ${
                            pkg.code === 'paket_premium'
                              ? 'text-amber-700'
                              : pkg.code === 'paket_hemat'
                                ? 'text-cyan-700'
                                : 'text-slate-500'
                          }`}
                        >
                          {pkg.label}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {pkg.lodgingShortLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{reg.institution}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">
                        {formatTimestampID(reg.createdAt)}
                      </td>
                      <td className="px-6 py-3.5 text-right text-xs font-semibold">
                        <span
                          className={
                            meta.tone === 'emerald'
                              ? 'text-emerald-700'
                              : meta.tone === 'amber'
                                ? 'text-amber-700'
                                : meta.tone === 'rose'
                                  ? 'text-rose-700'
                                  : 'text-slate-600'
                          }
                        >
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
