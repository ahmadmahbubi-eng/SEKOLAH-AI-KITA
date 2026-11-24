import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowUpDown,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  MessageCircle,
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  formatRupiah,
  formatTimestampID,
  formatWhatsappDisplay,
  getPaymentStatusMeta,
  getRegistrationStatusLabel,
  normalizeWhatsappID,
  toWhatsappLink,
} from '../../lib/format';
import { cancelRegistrationAction, updateParticipantDetails } from '../../lib/sakitaService';
import type { PaymentStatus, Program, Registration } from '../../types';

interface AdminParticipantsProps {
  programs: Program[];
  registrations: Registration[];
}

const PAGE_SIZE = 10;

export function AdminParticipants({ programs, registrations }: AdminParticipantsProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [sortField, setSortField] = useState<'createdAt' | 'fullName' | 'registrationNumber'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [detailTarget, setDetailTarget] = useState<Registration | null>(null);
  const [editTarget, setEditTarget] = useState<Registration | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    gender: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    whatsapp: '',
    email: '',
    institution: '',
    position: '',
    city: '',
    province: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = registrations.filter((r) => {
      if (programFilter !== 'all' && r.programId !== programFilter) return false;
      if (statusFilter !== 'all' && r.paymentStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        r.registrationNumber.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        r.institution.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.whatsapp.includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.province.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'fullName') {
        cmp = a.fullName.localeCompare(b.fullName);
      } else if (sortField === 'registrationNumber') {
        cmp = a.registrationNumber.localeCompare(b.registrationNumber);
      } else {
        const ta = formatTimestampID(a.createdAt);
        const tb = formatTimestampID(b.createdAt);
        cmp = ta.localeCompare(tb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [registrations, search, programFilter, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const buildExportRows = () =>
    filtered.map((r, idx) => ({
      No: idx + 1,
      'Nomor Registrasi': r.registrationNumber,
      'Nama Lengkap': r.fullName,
      'Jenis Kelamin': r.gender,
      WhatsApp: formatWhatsappDisplay(r.whatsapp),
      Email: r.email,
      'Nama Lembaga': r.institution,
      Jabatan: r.position,
      'Kabupaten/Kota': r.city,
      Provinsi: r.province,
      Program: r.programName,
      Nominal: r.amount,
      'Tanggal Mendaftar': formatTimestampID(r.createdAt),
      'Status Pendaftaran': getRegistrationStatusLabel(r.registrationStatus),
      'Status Pembayaran': getPaymentStatusMeta(r.paymentStatus).label,
    }));

  const handleExportExcel = () => {
    const rows = buildExportRows();
    if (rows.length === 0) {
      toast('info', 'Tidak ada data untuk diekspor');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Peserta SAKITA');
    XLSX.writeFile(wb, `SAKITA-Peserta-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast('success', 'File Excel berhasil diunduh');
  };

  const handleExportCsv = () => {
    const rows = buildExportRows();
    if (rows.length === 0) {
      toast('info', 'Tidak ada data untuk diekspor');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAKITA-Peserta-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('success', 'File CSV berhasil diunduh');
  };

  const openEditModal = (r: Registration) => {
    setEditTarget(r);
    setEditForm({
      fullName: r.fullName,
      gender: r.gender,
      whatsapp: formatWhatsappDisplay(r.whatsapp),
      email: r.email,
      institution: r.institution,
      position: r.position,
      city: r.city,
      province: r.province,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || savingEdit) return;
    setSavingEdit(true);
    try {
      const normalizedWa = normalizeWhatsappID(editForm.whatsapp);
      if (!/^62[0-9]{8,15}$/.test(normalizedWa)) {
        toast('error', 'Format nomor WhatsApp tidak valid');
        return;
      }
      await updateParticipantDetails(editTarget, {
        ...editForm,
        whatsapp: normalizedWa,
      });
      toast('success', 'Data peserta diperbarui');
      setEditTarget(null);
    } catch (err) {
      toast('error', 'Gagal menyimpan perubahan', err instanceof Error ? err.message : undefined);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelRegistration = async (r: Registration) => {
    if (r.registrationStatus === 'cancelled') return;
    setCancellingId(r.id);
    try {
      await cancelRegistrationAction(r);
      toast('success', 'Pendaftaran dibatalkan', `Kursi untuk ${r.registrationNumber} telah dilepaskan.`);
    } catch (err) {
      toast('error', 'Gagal membatalkan pendaftaran', err instanceof Error ? err.message : undefined);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Data Peserta</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Menampilkan {filtered.length} dari {registrations.length} pendaftar secara real-time
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Daftar</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="no-print grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-12">
        <div className="relative sm:col-span-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, no. registrasi, lembaga, email, kota..."
            className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>
        <select
          value={programFilter}
          onChange={(e) => {
            setProgramFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:col-span-4 focus:border-slate-900 focus:outline-none"
        >
          <option value="all">Semua Program</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | PaymentStatus);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:col-span-3 focus:border-slate-900 focus:outline-none"
        >
          <option value="all">Semua Status Pembayaran</option>
          <option value="belum_unggah">Belum Unggah Bukti</option>
          <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
          <option value="lunas">Lunas</option>
          <option value="minta_bukti_ulang">Minta Bukti Ulang</option>
          <option value="ditolak">Pembayaran Ditolak</option>
          <option value="daftar_tunggu">Daftar Tunggu</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-3">No</th>
                <th className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort('registrationNumber')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>No. Registrasi</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort('fullName')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Nama Lengkap</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-3">L/P</th>
                <th className="px-3 py-3">WhatsApp</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Nama Lembaga</th>
                <th className="px-3 py-3">Jabatan</th>
                <th className="px-3 py-3">Kab/Kota</th>
                <th className="px-3 py-3">Provinsi</th>
                <th className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort('createdAt')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Tgl Daftar</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-3">Status Pembayaran</th>
                <th className="no-print px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-sm text-slate-500">
                    Tidak ada data peserta yang sesuai dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                paginated.map((r, index) => {
                  const rowNum = (safePage - 1) * PAGE_SIZE + index + 1;
                  const statusMeta = getPaymentStatusMeta(r.paymentStatus);
                  const isCancelled = r.registrationStatus === 'cancelled';
                  return (
                    <tr key={r.id} className={`hover:bg-slate-50 ${isCancelled ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-3 font-mono tabular-nums text-slate-500">{rowNum}</td>
                      <td className="px-3 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {r.registrationNumber}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900 min-w-[150px]">
                        {r.fullName}
                        {isCancelled && (
                          <span className="ml-1.5 text-[10px] font-semibold text-rose-600">
                            (Dibatalkan)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {r.gender === 'Laki-laki' ? 'L' : 'P'}
                      </td>
                      <td className="px-3 py-3 font-mono tabular-nums whitespace-nowrap">
                        {formatWhatsappDisplay(r.whatsapp)}
                      </td>
                      <td className="px-3 py-3 max-w-[160px] truncate">{r.email}</td>
                      <td className="px-3 py-3 min-w-[150px]">{r.institution}</td>
                      <td className="px-3 py-3">{r.position}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{r.city}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{r.province}</td>
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums text-slate-500">
                        {formatTimestampID(r.createdAt)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-semibold">
                        <span
                          className={
                            statusMeta.tone === 'emerald'
                              ? 'text-emerald-700'
                              : statusMeta.tone === 'amber'
                                ? 'text-amber-700'
                                : statusMeta.tone === 'rose'
                                  ? 'text-rose-700'
                                  : statusMeta.tone === 'indigo'
                                    ? 'text-indigo-700'
                                    : 'text-slate-600'
                          }
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="no-print px-3 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailTarget(r)}
                            title="Lihat detail"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(r)}
                            title="Edit biodata"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <a
                            href={toWhatsappLink(
                              r.whatsapp,
                              `Halo ${r.fullName}, kami dari Admin Sekolah AI Kita (SAKITA) terkait pendaftaran ${r.registrationNumber}.`,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Hubungi via WhatsApp"
                            className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                          {!isCancelled && (
                            <button
                              type="button"
                              disabled={cancellingId === r.id}
                              onClick={() => handleCancelRegistration(r)}
                              title="Batalkan pendaftaran"
                              className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="no-print flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
          <span>
            Halaman {safePage} dari {totalPages} · Total {filtered.length} baris
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="font-mono text-xs font-semibold text-indigo-600">
                  {detailTarget.registrationNumber}
                </p>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {detailTarget.fullName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Program</dt>
                <dd className="font-medium text-slate-900">{detailTarget.programName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Nominal Biaya</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {formatRupiah(detailTarget.amount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Lembaga & Jabatan</dt>
                <dd className="font-medium text-slate-900">
                  {detailTarget.institution} · {detailTarget.position}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Domisili</dt>
                <dd className="font-medium text-slate-900">
                  {detailTarget.city}, {detailTarget.province}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Kontak</dt>
                <dd className="font-medium text-slate-900">
                  {formatWhatsappDisplay(detailTarget.whatsapp)} · {detailTarget.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Status</dt>
                <dd className="font-semibold text-slate-900">
                  {getPaymentStatusMeta(detailTarget.paymentStatus).label} (
                  {getRegistrationStatusLabel(detailTarget.registrationStatus)})
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Pengalaman AI</dt>
                <dd className="mt-0.5 text-slate-700">{detailTarget.aiExperience || '-'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Harapan Pelatihan</dt>
                <dd className="mt-0.5 text-slate-700">{detailTarget.expectations || '-'}</dd>
              </div>
            </dl>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
              <a
                href={`/status/${encodeURIComponent(detailTarget.accessToken)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Buka Halaman Status / E-Tiket
              </a>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Edit Biodata · {editTarget.registrationNumber}
              </h2>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Jenis Kelamin</label>
                <select
                  value={editForm.gender}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      gender: e.target.value as 'Laki-laki' | 'Perempuan',
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">WhatsApp</label>
                <input
                  type="text"
                  required
                  value={editForm.whatsapp}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Jabatan</label>
                <input
                  type="text"
                  required
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Nama Lembaga</label>
                <input
                  type="text"
                  required
                  value={editForm.institution}
                  onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Kabupaten/Kota</label>
                <input
                  type="text"
                  required
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Provinsi</label>
                <input
                  type="text"
                  required
                  value={editForm.province}
                  onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
