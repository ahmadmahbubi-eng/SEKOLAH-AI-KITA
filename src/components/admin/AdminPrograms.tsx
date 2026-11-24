import { useState } from 'react';
import { Archive, Edit3, Lock, Plus, Unlock, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { INITIAL_FACILITIES, INITIAL_PROJECTS } from '../../lib/defaults';
import { computeRemainingSeats, formatRupiah } from '../../lib/format';
import { saveProgram } from '../../lib/sakitaService';
import type { Program, ProgramStatus } from '../../types';

interface AdminProgramsProps {
  programs: Program[];
}

function createEmptyProgram(): Program {
  const id = `sakita-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    slug: id,
    name: '',
    batchLabel: 'INTENSIVE AI BOOTCAMP 2026',
    description: '',
    dateLabel: '',
    startDateIso: '2026-12-21T08:00:00+07:00',
    endDateIso: '2026-12-24T17:00:00+07:00',
    durationLabel: '4 Hari Pelatihan Intensif',
    location: 'Hotel Grand Makmur, Jambi',
    price: 2700000,
    quota: 30,
    confirmedCount: 0,
    reservedCount: 0,
    waitlistCount: 0,
    registrationSeq: 0,
    reservationHours: 48,
    projectCount: 10,
    targetRevenue: 81000000,
    status: 'open',
    isFeatured: false,
    facilities: [...INITIAL_FACILITIES],
    curriculum: [...INITIAL_PROJECTS],
  };
}

export function AdminPrograms({ programs }: AdminProgramsProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<{ program: Program; isNew: boolean } | null>(null);
  const [facilitiesText, setFacilitiesText] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditor = (program: Program, isNew: boolean) => {
    setEditing({ program: { ...program }, isNew });
    setFacilitiesText((program.facilities || []).join('\n'));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || saving) return;

    const p = editing.program;
    if (p.name.trim().length < 3 || p.description.trim().length < 10) {
      toast('error', 'Nama program (min. 3 karakter) dan deskripsi (min. 10 karakter) wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const facilities = facilitiesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 30);

      await saveProgram(
        {
          ...p,
          slug: p.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
          price: Number(p.price),
          quota: Math.max(1, Number(p.quota)),
          reservationHours: Math.max(1, Number(p.reservationHours)),
          projectCount: Math.max(1, Number(p.projectCount)),
          targetRevenue: Number(p.targetRevenue) || Number(p.price) * Number(p.quota),
          facilities,
        },
        editing.isNew,
      );
      toast('success', editing.isNew ? 'Program baru berhasil dibuat' : 'Program berhasil diperbarui');
      setEditing(null);
    } catch (err) {
      toast('error', 'Gagal menyimpan program', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (program: Program, nextStatus: ProgramStatus) => {
    try {
      await saveProgram({ ...program, status: nextStatus }, false);
      toast('success', `Status program diubah menjadi ${nextStatus.toUpperCase()}`);
    } catch (err) {
      toast('error', 'Gagal mengubah status program', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Program Pelatihan</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Kelola banyak program dan angkatan pelatihan SAKITA secara terpisah
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor(createEmptyProgram(), true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Program Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {programs.map((p) => {
          const remaining = computeRemainingSeats(p.quota, p.confirmedCount, p.reservedCount);
          return (
            <div
              key={p.id}
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-indigo-600">{p.id}</span>
                    <span>·</span>
                    <span>{p.batchLabel}</span>
                    <span>·</span>
                    <span
                      className={`font-semibold ${
                        p.status === 'open'
                          ? 'text-emerald-700'
                          : p.status === 'closed'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                      }`}
                    >
                      {p.status === 'open'
                        ? 'Pendaftaran Dibuka'
                        : p.status === 'closed'
                          ? 'Pendaftaran Ditutup'
                          : 'Diarsipkan'}
                    </span>
                    {p.isFeatured && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-slate-900">Program Utama</span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-1.5 font-display text-lg font-bold text-slate-900">{p.name}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {p.dateLabel} · {p.location} · {p.durationLabel}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditor(p, false)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  {p.status === 'open' ? (
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(p, 'closed')}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Tutup Pendaftaran</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(p, 'open')}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      <span>Buka Pendaftaran</span>
                    </button>
                  )}
                  {p.status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(p, 'archived')}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      <span>Arsipkan</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs sm:grid-cols-5">
                <div>
                  <span className="text-slate-500">Biaya</span>
                  <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                    {formatRupiah(p.price)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Kuota Total</span>
                  <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                    {p.quota} kursi
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Lunas / Reservasi</span>
                  <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                    {p.confirmedCount} / {p.reservedCount}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Sisa Kuota</span>
                  <p className="mt-0.5 font-mono font-semibold text-emerald-700 tabular-nums">
                    {remaining} kursi
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Daftar Tunggu / TTL</span>
                  <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                    {p.waitlistCount} · {p.reservationHours} jam
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {editing.isNew ? 'Buat Program Pelatihan Baru' : `Edit Program · ${editing.program.id}`}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Nama Program</label>
                  <input
                    type="text"
                    required
                    value={editing.program.name}
                    onChange={(e) =>
                      setEditing({ ...editing, program: { ...editing.program, name: e.target.value } })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Label Angkatan / Eyebrow</label>
                  <input
                    type="text"
                    required
                    value={editing.program.batchLabel}
                    onChange={(e) =>
                      setEditing({ ...editing, program: { ...editing.program, batchLabel: e.target.value } })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Tanggal Tampil</label>
                  <input
                    type="text"
                    required
                    placeholder="21–24 Desember 2026"
                    value={editing.program.dateLabel}
                    onChange={(e) =>
                      setEditing({ ...editing, program: { ...editing.program, dateLabel: e.target.value } })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Waktu Mulai (ISO WIB)</label>
                  <input
                    type="text"
                    required
                    value={editing.program.startDateIso}
                    onChange={(e) =>
                      setEditing({ ...editing, program: { ...editing.program, startDateIso: e.target.value } })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Durasi</label>
                  <input
                    type="text"
                    required
                    value={editing.program.durationLabel}
                    onChange={(e) =>
                      setEditing({ ...editing, program: { ...editing.program, durationLabel: e.target.value } })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Lokasi Pelatihan</label>
                  <input
                    type="text"
                    required
                    value={editing.program.location}
                    onChange={(e) =>
                      setEditing({ ...editing, program: { ...editing.program, location: e.target.value } })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Harga (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editing.program.price}
                    onChange={(e) => {
                      const price = Number(e.target.value);
                      setEditing({
                        ...editing,
                        program: {
                          ...editing.program,
                          price,
                          targetRevenue: price * editing.program.quota,
                        },
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Kuota Peserta</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editing.program.quota}
                    onChange={(e) => {
                      const quota = Number(e.target.value);
                      setEditing({
                        ...editing,
                        program: {
                          ...editing.program,
                          quota,
                          targetRevenue: editing.program.price * quota,
                        },
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Masa Reservasi Kursi (Jam)</label>
                  <input
                    type="number"
                    min={1}
                    max={720}
                    required
                    value={editing.program.reservationHours}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        program: { ...editing.program, reservationHours: Number(e.target.value) },
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Jumlah Proyek</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editing.program.projectCount}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        program: { ...editing.program, projectCount: Number(e.target.value) },
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Deskripsi Program</label>
                  <textarea
                    rows={3}
                    required
                    value={editing.program.description}
                    onChange={(e) =>
                      setEditing({ ...editing, program: { ...editing.program, description: e.target.value } })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Daftar Fasilitas (satu baris per fasilitas)
                  </label>
                  <textarea
                    rows={4}
                    value={facilitiesText}
                    onChange={(e) => setFacilitiesText(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-6">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={editing.program.isFeatured}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          program: { ...editing.program, isFeatured: e.target.checked },
                        })
                      }
                      className="h-4 w-4 rounded accent-slate-900"
                    />
                    <span>Jadikan Program Utama di Landing Page</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Program'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
