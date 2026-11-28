import { useState } from 'react';
import {
  Archive,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Layers,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { INITIAL_FACILITIES, INITIAL_PROJECTS } from '../../lib/defaults';
import { computeRemainingSeats, formatRupiah } from '../../lib/format';
import { saveProgram, uploadAdminAsset } from '../../lib/sakitaService';
import { ResolvedAssetImage } from '../ResolvedAssetImage';
import type { Program, ProgramStatus, ProjectItem, TargetAudienceItem } from '../../types';

interface AdminProgramsProps {
  programs: Program[];
  onPreviewProgram?: (slug: string) => void;
}

type EditorTab = 'info' | 'hero' | 'materi' | 'fasilitas';

const ICON_OPTIONS = [
  { value: 'UserPlus', label: 'Pendaftaran / PPDB' },
  { value: 'Wallet', label: 'Keuangan / SPP' },
  { value: 'BookOpen', label: 'Akademik / Modul' },
  { value: 'ClipboardCheck', label: 'Evaluasi / Ujian' },
  { value: 'CalendarCheck', label: 'Absensi / Jadwal' },
  { value: 'BookMarked', label: 'Tahfidz / Literasi' },
  { value: 'Building2', label: 'Manajemen Lembaga' },
  { value: 'Utensils', label: 'Operasional / Layanan' },
  { value: 'LayoutDashboard', label: 'Dashboard / Analitik' },
  { value: 'Globe', label: 'Website / Digital' },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
}

function createEmptyProgram(): Program {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 6);
  const id = `sakita-${year}-${suffix}`;
  return {
    id,
    slug: id,
    name: '',
    batchLabel: `PROGRAM PELATIHAN AI ${year}`,
    description: '',
    dateLabel: '',
    startDateIso: `${year}-12-28T08:00:00+07:00`,
    endDateIso: `${year}-12-31T17:00:00+07:00`,
    durationLabel: '2 Hari Praktik Intensif',
    location: 'Hotel Grand Makmur, Jambi',
    price: 1500000,
    quota: 30,
    confirmedCount: 0,
    reservedCount: 0,
    waitlistCount: 0,
    registrationSeq: 0,
    reservationHours: 48,
    projectCount: 3,
    targetRevenue: 45000000,
    status: 'open',
    isFeatured: false,
    facilities: [...INITIAL_FACILITIES],
    curriculum: [
      {
        number: '01',
        icon: 'BookOpen',
        title: 'Fondasi & Strategi Pemanfaatan AI',
        description: 'Memahami alur kerja AI secara terstruktur untuk mempercepat produktivitas dan solusi nyata.',
        benefit: 'Peserta langsung menguasai pola prompting dan arsitektur kerja yang rapi.',
      },
      {
        number: '02',
        icon: 'LayoutDashboard',
        title: 'Praktik Membangun Sistem & Aplikasi Digital',
        description: 'Langkah demi langkah merancang dan menyusun proyek digital sesuai kebutuhan lembaga.',
        benefit: 'Menghasilkan prototipe fungsional yang siap diterapkan di unit kerja.',
      },
      {
        number: '03',
        icon: 'Globe',
        title: 'Publikasi, Evaluasi & Pendampingan Mandiri',
        description: 'Cara mempublikasikan hasil karya dan mengembangkannya secara mandiri bersama tim.',
        benefit: 'Lembaga memiliki kemandirian teknologi tanpa ketergantungan vendor.',
      },
    ],
    bannerUrl: '',
    headline: '',
    subheadline: '',
    targetAudience: [],
  };
}

function cloneProgramAsTemplate(source: Program): Program {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 6);
  const id = `sakita-${year}-${suffix}`;
  const baseSlug = slugify(source.slug || source.name) || id;
  return {
    ...source,
    id,
    slug: `${baseSlug.slice(0, 80)}-${suffix}`,
    name: `${source.name} (Angkatan Baru)`,
    confirmedCount: 0,
    reservedCount: 0,
    waitlistCount: 0,
    registrationSeq: 0,
    status: 'open',
    isFeatured: false,
    facilities: [...(source.facilities || [])],
    curriculum: (source.curriculum || []).map((item) => ({ ...item })),
    targetAudience: (source.targetAudience || []).map((item) => ({ ...item })),
    bannerUrl: source.bannerUrl || '',
    headline: source.headline || '',
    subheadline: source.subheadline || '',
  };
}

export function AdminPrograms({ programs, onPreviewProgram }: AdminProgramsProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<{ program: Program; isNew: boolean; autoSlug: boolean } | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>('info');
  const [facilitiesText, setFacilitiesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openEditor = (program: Program, isNew: boolean, autoSlug = false) => {
    setEditing({
      program: {
        ...program,
        facilities: [...(program.facilities || [])],
        curriculum: (program.curriculum || []).map((item) => ({ ...item })),
        targetAudience: (program.targetAudience || []).map((item) => ({ ...item })),
        bannerUrl: program.bannerUrl || '',
        headline: program.headline || '',
        subheadline: program.subheadline || '',
      },
      isNew,
      autoSlug,
    });
    setFacilitiesText((program.facilities || []).join('\n'));
    setEditorTab('info');
  };

  const updateProgramField = <K extends keyof Program>(key: K, value: Program[K]) => {
    setEditing((prev) => (prev ? { ...prev, program: { ...prev.program, [key]: value } } : null));
  };

  const handleCopyLink = async (program: Program) => {
    const shareUrl = `${window.location.origin}/program/${encodeURIComponent(program.slug || program.id)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(program.id);
      toast('success', 'Link halaman pelatihan disalin', shareUrl);
      setTimeout(() => setCopiedId((prev) => (prev === program.id ? null : prev)), 2500);
    } catch {
      toast('info', 'Salin link pelatihan secara manual', shareUrl);
    }
  };

  const handleUploadBanner = async (file: File | null) => {
    if (!file || !editing) return;
    setUploadingBanner(true);
    try {
      const url = await uploadAdminAsset(file);
      updateProgramField('bannerUrl', url);
      toast('success', 'Banner pelatihan berhasil diunggah', 'Jangan lupa klik Simpan Program.');
    } catch (err) {
      toast('error', 'Unggahan banner gagal', err instanceof Error ? err.message : undefined);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleAddCurriculumItem = () => {
    if (!editing) return;
    const nextNum = String(editing.program.curriculum.length + 1).padStart(2, '0');
    const nextItem: ProjectItem = {
      number: nextNum,
      icon: 'LayoutDashboard',
      title: '',
      description: '',
      benefit: '',
    };
    const nextList = [...editing.program.curriculum, nextItem];
    setEditing({
      ...editing,
      program: {
        ...editing.program,
        curriculum: nextList,
        projectCount: Math.max(1, nextList.length),
      },
    });
  };

  const handleUpdateCurriculumItem = (idx: number, field: keyof ProjectItem, value: string) => {
    if (!editing) return;
    const nextList = editing.program.curriculum.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    );
    updateProgramField('curriculum', nextList);
  };

  const handleRemoveCurriculumItem = (idx: number) => {
    if (!editing) return;
    const nextList = editing.program.curriculum
      .filter((_, i) => i !== idx)
      .map((item, i) => ({ ...item, number: String(i + 1).padStart(2, '0') }));
    setEditing({
      ...editing,
      program: {
        ...editing.program,
        curriculum: nextList,
        projectCount: Math.max(1, nextList.length),
      },
    });
  };

  const handleAddTargetAudience = () => {
    if (!editing) return;
    const current = editing.program.targetAudience || [];
    if (current.length >= 12) return;
    const next: TargetAudienceItem[] = [...current, { role: '', desc: '' }];
    updateProgramField('targetAudience', next);
  };

  const handleUpdateTargetAudience = (idx: number, field: keyof TargetAudienceItem, value: string) => {
    if (!editing) return;
    const next = (editing.program.targetAudience || []).map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    );
    updateProgramField('targetAudience', next);
  };

  const handleRemoveTargetAudience = (idx: number) => {
    if (!editing) return;
    const next = (editing.program.targetAudience || []).filter((_, i) => i !== idx);
    updateProgramField('targetAudience', next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || saving) return;

    const p = editing.program;
    if (p.name.trim().length < 3 || p.description.trim().length < 10) {
      setEditorTab('info');
      toast('error', 'Nama program (min. 3 karakter) dan deskripsi (min. 10 karakter) wajib diisi.');
      return;
    }
    if (p.dateLabel.trim().length < 3 || p.location.trim().length < 3) {
      setEditorTab('info');
      toast('error', 'Tanggal tampil dan lokasi pelatihan wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const facilities = facilitiesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 30);

      const cleanedCurriculum = (p.curriculum || [])
        .filter((item) => item.title.trim().length > 0)
        .map((item, idx) => ({
          ...item,
          number: item.number.trim() || String(idx + 1).padStart(2, '0'),
        }));

      const rawSlug = slugify(p.slug || p.name) || p.id.toLowerCase();
      const slugConflict = programs.some((other) => other.id !== p.id && other.slug === rawSlug);
      const finalSlug = slugConflict ? `${rawSlug}-${p.id.slice(-4)}` : rawSlug;

      await saveProgram(
        {
          ...p,
          slug: finalSlug,
          price: Number(p.price),
          quota: Math.max(1, Number(p.quota)),
          reservationHours: Math.max(1, Number(p.reservationHours)),
          projectCount: Math.max(1, Number(p.projectCount) || cleanedCurriculum.length || 1),
          targetRevenue: Number(p.price) * Math.max(1, Number(p.quota)),
          facilities,
          curriculum: cleanedCurriculum,
        },
        editing.isNew,
        programs,
      );
      toast(
        'success',
        editing.isNew ? 'Pelatihan baru berhasil dipublikasikan' : 'Program pelatihan diperbarui',
        `Halaman otomatis tersedia di /program/${finalSlug}`,
      );
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
            Tambah pelatihan baru kapan saja — halaman katalog, materi, jadwal, dan formulir pendaftaran langsung terbentuk otomatis
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor(createEmptyProgram(), true, true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Pelatihan Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {programs.map((p) => {
          const remaining = computeRemainingSeats(p.quota, p.confirmedCount, p.reservedCount);
          const moduleCount = p.curriculum?.length || p.projectCount;
          const sharePath = `/program/${p.slug || p.id}`;
          return (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
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
                    {p.dateLabel} · {p.location} · {p.durationLabel} · {moduleCount} Materi Praktik
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-slate-500">
                    URL Halaman Khusus: <span className="text-slate-800">{sharePath}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditor(p, false, false)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditor(cloneProgramAsTemplate(p), true, false)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Duplikat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyLink(p)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {copiedId === p.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedId === p.id ? 'Tersalin' : 'Salin Link'}</span>
                  </button>
                  {onPreviewProgram && p.status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => onPreviewProgram(p.slug || p.id)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Lihat Halaman</span>
                    </button>
                  )}
                  {p.status === 'open' ? (
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(p, 'closed')}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Tutup</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(p, 'open')}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      <span>Buka</span>
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

      {/* Create / Edit Tabbed Program Studio Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {editing.isNew ? 'Buat Pelatihan Baru' : `Edit Pelatihan · ${editing.program.id}`}
                </h2>
                <p className="text-xs text-slate-500">
                  Halaman publik & formulir pendaftaran otomatis terbentuk dari data di bawah ini
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Segmented Editor Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-6 py-2.5">
              {(
                [
                  { id: 'info', label: '1. Info & Jadwal' },
                  { id: 'hero', label: '2. Tampilan & Target' },
                  { id: 'materi', label: `3. Materi (${editing.program.curriculum.length})` },
                  { id: 'fasilitas', label: '4. Fasilitas' },
                ] as { id: EditorTab; label: string }[]
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEditorTab(t.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    editorTab === t.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* TAB 1: INFO, JADWAL & BIAYA */}
              {editorTab === 'info' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">Nama Pelatihan *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Workshop AI Pembuatan Bahan Ajar Interaktif untuk Guru"
                      value={editing.program.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setEditing((prev) => {
                          if (!prev) return null;
                          const nextSlug = prev.autoSlug ? slugify(name) || prev.program.id : prev.program.slug;
                          return { ...prev, program: { ...prev.program, name, slug: nextSlug } };
                        });
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Link Halaman Khusus (Slug URL)
                    </label>
                    <div className="mt-1 flex items-center overflow-hidden rounded-lg border border-slate-300 bg-slate-50">
                      <span className="border-r border-slate-300 px-3 py-2 font-mono text-xs text-slate-500">
                        /program/
                      </span>
                      <input
                        type="text"
                        required
                        value={editing.program.slug}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            autoSlug: false,
                            program: { ...editing.program, slug: slugify(e.target.value) },
                          })
                        }
                        placeholder="workshop-ai-guru-2026"
                        className="w-full bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Kategori / Label Program
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="WORKSHOP AI GURU 2026"
                      value={editing.program.batchLabel}
                      onChange={(e) => updateProgramField('batchLabel', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Tanggal Tampil *</label>
                    <input
                      type="text"
                      required
                      placeholder="15–16 Januari 2027"
                      value={editing.program.dateLabel}
                      onChange={(e) => updateProgramField('dateLabel', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Waktu Mulai (untuk Hitung Mundur, ISO WIB)
                    </label>
                    <input
                      type="text"
                      required
                      value={editing.program.startDateIso}
                      onChange={(e) => updateProgramField('startDateIso', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Durasi Pelatihan *</label>
                    <input
                      type="text"
                      required
                      placeholder="2 Hari Praktik Intensif"
                      value={editing.program.durationLabel}
                      onChange={(e) => updateProgramField('durationLabel', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">Lokasi Pelatihan *</label>
                    <input
                      type="text"
                      required
                      placeholder="Hotel Grand Makmur, Jambi atau Online via Zoom"
                      value={editing.program.location}
                      onChange={(e) => updateProgramField('location', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Biaya Pelatihan (Rp)</label>
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
                    <label className="block text-xs font-medium text-slate-700">
                      Masa Reservasi Kursi (Jam)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      required
                      value={editing.program.reservationHours}
                      onChange={(e) => updateProgramField('reservationHours', Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Jumlah Materi / Proyek
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={editing.program.projectCount}
                      onChange={(e) => updateProgramField('projectCount', Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">Deskripsi Pelatihan *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Jelaskan secara singkat manfaat, metode praktik, dan hasil akhir pelatihan ini..."
                      value={editing.program.description}
                      onChange={(e) => updateProgramField('description', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={editing.program.isFeatured}
                        onChange={(e) => updateProgramField('isFeatured', e.target.checked)}
                        className="h-4 w-4 rounded accent-slate-900"
                      />
                      <span>Jadikan Program Utama (tampil pertama di halaman beranda)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: TAMPILAN HERO & TARGET PESERTA */}
              {editorTab === 'hero' && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-800">
                      Poster / Banner Khusus Pelatihan (Opsional)
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Jika dikosongkan, halaman pelatihan otomatis menampilkan pratinjau visual SAKITA yang rapi.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                        {uploadingBanner ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span>{uploadingBanner ? 'Mengunggah...' : 'Unggah Banner / Poster'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => void handleUploadBanner(e.target.files?.[0] || null)}
                        />
                      </label>
                      {editing.program.bannerUrl && (
                        <button
                          type="button"
                          onClick={() => updateProgramField('bannerUrl', '')}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Hapus Banner
                        </button>
                      )}
                    </div>
                    {editing.program.bannerUrl && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <ResolvedAssetImage
                          src={editing.program.bannerUrl}
                          alt="Pratinjau banner pelatihan"
                          className="max-h-48 w-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Judul Utama (Hero Headline) — Opsional
                      </label>
                      <input
                        type="text"
                        placeholder="Kosongkan agar otomatis memakai Nama Pelatihan"
                        value={editing.program.headline || ''}
                        onChange={(e) => updateProgramField('headline', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Sub-Judul Singkat (Tagline Hero) — Opsional
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Praktik Langsung Membuat Bahan Ajar & Media Interaktif Berbasis AI"
                        value={editing.program.subheadline || ''}
                        onChange={(e) => updateProgramField('subheadline', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          Target Peserta Khusus Pelatihan Ini (Opsional)
                        </p>
                        <p className="text-xs text-slate-500">
                          Jika kosong, halaman otomatis menggunakan daftar target peserta umum SAKITA.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddTargetAudience}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Tambah Target</span>
                      </button>
                    </div>

                    {(editing.program.targetAudience || []).length > 0 && (
                      <div className="mt-3 space-y-3">
                        {(editing.program.targetAudience || []).map((item, idx) => (
                          <div
                            key={`ta-${idx}`}
                            className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-12"
                          >
                            <input
                              type="text"
                              placeholder="Peran (misal: Guru & Wali Kelas)"
                              value={item.role}
                              onChange={(e) => handleUpdateTargetAudience(idx, 'role', e.target.value)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold sm:col-span-4"
                            />
                            <input
                              type="text"
                              placeholder="Penjelasan singkat manfaat untuk peran ini"
                              value={item.desc}
                              onChange={(e) => handleUpdateTargetAudience(idx, 'desc', e.target.value)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:col-span-7"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveTargetAudience(idx)}
                              aria-label="Hapus target peserta"
                              className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50 sm:col-span-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: MATERI / KURIKULUM KHUSUS PELATIHAN */}
              {editorTab === 'materi' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-600">
                      Setiap materi yang ditambahkan di sini otomatis tampil dalam kartu rapi di halaman pelatihan ini.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            program: {
                              ...editing.program,
                              curriculum: INITIAL_PROJECTS.map((item) => ({ ...item })),
                              projectCount: INITIAL_PROJECTS.length,
                            },
                          })
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <span>Muat Template 10 Proyek</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCurriculumItem}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Tambah Materi</span>
                      </button>
                    </div>
                  </div>

                  {editing.program.curriculum.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                      Belum ada materi khusus. Jika dikosongkan, halaman otomatis menampilkan daftar materi default SAKITA.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editing.program.curriculum.map((item, idx) => (
                        <div
                          key={`curr-${idx}`}
                          className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600">
                              Materi #{String(idx + 1).padStart(2, '0')}
                            </span>
                            <div className="flex items-center gap-2">
                              <select
                                value={item.icon || 'LayoutDashboard'}
                                onChange={(e) => handleUpdateCurriculumItem(idx, 'icon', e.target.value)}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
                              >
                                {ICON_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    Ikon: {opt.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleRemoveCurriculumItem(idx)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            placeholder="Judul Materi / Proyek Praktik"
                            value={item.title}
                            onChange={(e) => handleUpdateCurriculumItem(idx, 'title', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                          />
                          <textarea
                            rows={2}
                            placeholder="Penjelasan materi atau proyek yang dipraktikkan"
                            value={item.description}
                            onChange={(e) => handleUpdateCurriculumItem(idx, 'description', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Manfaat utama bagi peserta / lembaga"
                            value={item.benefit}
                            onChange={(e) => handleUpdateCurriculumItem(idx, 'benefit', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FASILITAS */}
              {editorTab === 'fasilitas' && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-700">
                    Daftar Fasilitas yang Didapat Peserta (tulis 1 fasilitas per baris)
                  </label>
                  <textarea
                    rows={8}
                    value={facilitiesText}
                    onChange={(e) => setFacilitiesText(e.target.value)}
                    placeholder={'Modul pelatihan lengkap\nSertifikat resmi SAKITA\nPendampingan praktik langsung\nAkses Komunitas Sekolah AI Kita'}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm leading-relaxed"
                  />
                  <p className="text-xs text-slate-500">
                    Total fasilitas terdeteksi:{' '}
                    <strong className="text-slate-800">
                      {facilitiesText.split('\n').filter((l) => l.trim()).length} poin
                    </strong>{' '}
                    (maks. 30 poin).
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-6 py-4">
              <span className="font-mono text-[11px] text-slate-500 truncate">
                URL: /program/{editing.program.slug || editing.program.id}
              </span>
              <div className="flex items-center gap-2 shrink-0">
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
                  {saving ? 'Menyimpan...' : editing.isNew ? 'Publikasikan Pelatihan' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
