import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Check,
  Eye,
  EyeOff,
  FolderKanban,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ResolvedAssetImage } from '../ResolvedAssetImage';
import { TrainerProfileSection } from '../landing/TrainerProfileSection';
import { useToast } from '../../context/ToastContext';
import {
  DEFAULT_PRIMARY_TRAINER,
  DEFAULT_PROGRAM,
  DEFAULT_TRAINER_SECTION_ORDER,
  DEFAULT_TRAINER_SECTION_VISIBILITY,
  OFFICIAL_PRIMARY_TRAINER_PHOTO,
} from '../../lib/defaults';
import {
  deleteTrainerProfile,
  saveTrainerProfile,
  uploadAdminAsset,
} from '../../lib/sakitaService';
import type {
  Program,
  TrainerExpertiseItem,
  TrainerPortfolioItem,
  TrainerProfile,
  TrainerSectionKey,
} from '../../types';

interface AdminTrainersProps {
  trainers: TrainerProfile[];
  activeProgram?: Program;
}

type EditorTab = 'identitas' | 'kompetensi' | 'portofolio' | 'narasi' | 'tampilan';

const ICON_OPTIONS = [
  { value: 'Cpu', label: 'AI / CPU' },
  { value: 'Layers', label: 'Aplikasi / Layers' },
  { value: 'Terminal', label: 'Prompt / Terminal' },
  { value: 'Blocks', label: 'No-Code / Blocks' },
  { value: 'GraduationCap', label: 'Pendidikan' },
  { value: 'Clapperboard', label: 'Konten / Media' },
  { value: 'Briefcase', label: 'Bisnis / Usaha' },
  { value: 'Compass', label: 'Kepemimpinan' },
  { value: 'BookOpen', label: 'Kurikulum / Buku' },
  { value: 'Globe', label: 'Web / Digital' },
  { value: 'Award', label: 'Prestasi' },
  { value: 'FolderKanban', label: 'Proyek' },
];

const SECTION_LABELS: Record<TrainerSectionKey, { title: string; desc: string }> = {
  expertise: {
    title: 'Areas of Expertise',
    desc: 'Kartu bidang kompetensi dan keahlian utama pemateri.',
  },
  background: {
    title: 'Professional Background',
    desc: 'Timeline riwayat aktivitas, peran, dan latar belakang profesional.',
  },
  tools: {
    title: 'Tools & Technologies',
    desc: 'Daftar platform teknologi AI modern yang dipelajari dan digunakan.',
  },
  portfolio: {
    title: 'Portofolio Karya',
    desc: 'Karya aplikasi nyata beserta screenshot dan link demo (otomatis tersembunyi jika kosong).',
  },
  whyLearn: {
    title: 'Mengapa Belajar Bersama Pemateri Ini?',
    desc: 'Lima keunggulan pendekatan pelatihan dan narasi pendukung.',
  },
  statement: {
    title: 'Personal Statement',
    desc: 'Kartu kutipan (quotation card) pemikiran utama pemateri.',
  },
  slogan: {
    title: 'Personal Brand Slogan',
    desc: 'Slogan identitas personal branding pemateri.',
  },
  cta: {
    title: 'Call to Action Pendaftaran',
    desc: 'Ajakan mendaftar yang terhubung langsung ke formulir pendaftaran SAKITA.',
  },
};

function createBlankTrainer(nextOrder: number): TrainerProfile {
  const suffix = Math.random().toString(36).slice(2, 6);
  return {
    id: `pemateri-${suffix}`,
    isPrimary: false,
    isPublished: false,
    displayOrder: nextOrder,
    eyebrow: 'MEET YOUR TRAINER',
    sectionSubtitle: 'Kenali Pemateri SAKITA',
    roleBadge: 'TRAINER SAKITA',
    fullName: '',
    titlePrimary: 'AI Practitioner & Trainer',
    titleSecondary: 'Tim Pengajar Sekolah AI Kita (SAKITA)',
    pillarsLabel: 'Education • Technology • Innovation',
    photoUrl: '',
    headline: '',
    subheadline: '',
    bio: '',
    expertiseTitle: 'Areas of Expertise',
    expertiseSubtitle: 'Kompetensi dan Bidang Keahlian',
    expertise: [
      {
        id: `exp-${suffix}-1`,
        icon: 'Cpu',
        title: 'Artificial Intelligence & Generative AI',
        description: 'Pemanfaatan kecerdasan buatan untuk produktivitas dan inovasi.',
      },
    ],
    backgroundTitle: 'Professional Background',
    backgroundSubtitle: 'Riwayat Aktivitas & Peran Profesional',
    background: ['Pemateri Sekolah AI Kita (SAKITA)'],
    toolsTitle: 'Powered by Modern AI Technologies',
    toolsDisclaimer: DEFAULT_PRIMARY_TRAINER.toolsDisclaimer,
    tools: ['ChatGPT', 'Google Gemini', 'Google AI Studio'],
    portfolioTitle: 'From Knowledge to Real Innovation',
    portfolioSubtitle: 'Bukan Sekadar Teori, tetapi Karya Nyata.',
    portfolio: [],
    whyLearnTitle: 'Belajar dari Praktisi yang Memahami Kebutuhan Anda',
    whyLearnPoints: [...DEFAULT_PRIMARY_TRAINER.whyLearnPoints],
    whyLearnNarrative: DEFAULT_PRIMARY_TRAINER.whyLearnNarrative,
    personalStatement: '',
    personalStatementAuthor: '',
    sloganLines: [...DEFAULT_PRIMARY_TRAINER.sloganLines],
    sloganEnglish: DEFAULT_PRIMARY_TRAINER.sloganEnglish,
    ctaHeadline: DEFAULT_PRIMARY_TRAINER.ctaHeadline,
    ctaSubheadline: DEFAULT_PRIMARY_TRAINER.ctaSubheadline,
    ctaButtonLabel: DEFAULT_PRIMARY_TRAINER.ctaButtonLabel,
    sectionVisibility: { ...DEFAULT_TRAINER_SECTION_VISIBILITY },
    sectionOrder: [...DEFAULT_TRAINER_SECTION_ORDER],
  };
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

function formatTrainerError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : '';
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as {
      error?: string;
      path?: string;
      operationType?: string;
      authInfo?: { email?: string | null; emailVerified?: boolean | null };
    };
    const inner = (parsed.error || '').toLowerCase();
    const loc = parsed.path ? ` (${parsed.operationType || 'write'} ${parsed.path})` : '';
    const who = parsed.authInfo?.email ? ` [Akun: ${parsed.authInfo.email}]` : '';
    if (inner.includes('permission') || inner.includes('insufficient')) {
      return `Izin penulisan ke database ditolak${loc}${who}. Pastikan Anda login dengan akun admin terverifikasi lalu muat ulang halaman.`;
    }
    if (inner.includes('quota')) {
      return 'Kuota harian database tercapai. Silakan coba lagi besok atau periksa kuota Firebase.';
    }
    if (parsed.error) return `${parsed.error}${loc}`;
  } catch {
    // Plain error message
  }
  return raw;
}

export function AdminTrainers({ trainers, activeProgram }: AdminTrainersProps) {
  const { toast } = useToast();
  const effectiveList = trainers.length > 0 ? trainers : [DEFAULT_PRIMARY_TRAINER];

  const [selectedId, setSelectedId] = useState<string>(effectiveList[0].id);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [draft, setRawDraft] = useState<TrainerProfile>(effectiveList[0]);
  const [activeTab, setActiveTab] = useState<EditorTab>('identitas');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPortfolioId, setUploadingPortfolioId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const setDraft = useCallback(
    (updater: TrainerProfile | ((prev: TrainerProfile) => TrainerProfile)) => {
      setIsDirty(true);
      setRawDraft(updater);
    },
    [],
  );

  useEffect(() => {
    if (isCreatingNew || isDirty) return;
    const found = effectiveList.find((t) => t.id === selectedId) || effectiveList[0];
    if (found) {
      setSelectedId(found.id);
      setRawDraft(found);
    }
  }, [trainers, selectedId, isCreatingNew, isDirty]);

  const handleSelectTrainer = (trainer: TrainerProfile) => {
    setIsCreatingNew(false);
    setIsDirty(false);
    setSelectedId(trainer.id);
    setRawDraft(trainer);
    setShowPreview(false);
  };

  const handleCreateNew = () => {
    const nextOrder = effectiveList.length + 1;
    const blank = createBlankTrainer(nextOrder);
    setIsCreatingNew(true);
    setIsDirty(true);
    setSelectedId(blank.id);
    setRawDraft(blank);
    setActiveTab('identitas');
    setShowPreview(false);
  };

  const handleSave = async () => {
    if (draft.fullName.trim().length < 2) {
      toast('error', 'Nama pemateri wajib diisi', 'Masukkan nama lengkap beserta gelar pemateri.');
      setActiveTab('identitas');
      return;
    }

    setActionError(null);
    setSaving(true);
    try {
      const existsInDb = trainers.some((t) => t.id === draft.id);
      await saveTrainerProfile(draft, isCreatingNew && !existsInDb, trainers);
      setIsCreatingNew(false);
      setIsDirty(false);
      toast(
        'success',
        'Profil Pemateri Tersimpan',
        `Perubahan untuk ${draft.fullName} telah disimpan permanen ke database.`,
      );
    } catch (err) {
      const msg = formatTrainerError(err, 'Terjadi kesalahan saat menyimpan ke Firestore.');
      setActionError(msg);
      toast('error', 'Gagal Menyimpan Profil Pemateri', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (draft.isPrimary) {
      toast(
        'error',
        'Pemateri utama tidak dapat dihapus',
        'Tetapkan pemateri lain sebagai Pemateri Utama terlebih dahulu jika ingin menghapus profil ini.',
      );
      return;
    }
    if (isCreatingNew) {
      handleSelectTrainer(effectiveList[0]);
      return;
    }
    setDeleting(true);
    try {
      await deleteTrainerProfile(draft);
      toast('success', 'Pemateri dihapus', `${draft.fullName} berhasil dihapus dari database.`);
      const remaining = effectiveList.filter((t) => t.id !== draft.id);
      if (remaining[0]) handleSelectTrainer(remaining[0]);
    } catch (err) {
      toast(
        'error',
        'Gagal menghapus pemateri',
        formatTrainerError(err, 'Terjadi kesalahan saat menghapus data.'),
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleUploadTrainerPhoto = async (file: File | null, inputEl?: HTMLInputElement | null) => {
    if (!file) return;
    setActionError(null);
    setUploadingPhoto(true);
    try {
      const url = await uploadAdminAsset(file);
      const updatedDraft: TrainerProfile = { ...draft, photoUrl: url };
      setRawDraft(updatedDraft);

      // Auto-persist immediately for existing trainers with valid name so photo is live right away
      if (!isCreatingNew && updatedDraft.fullName.trim().length >= 2) {
        const existsInDb = trainers.some((t) => t.id === updatedDraft.id);
        await saveTrainerProfile(updatedDraft, !existsInDb, trainers);
        setIsDirty(false);
        toast(
          'success',
          'Foto pemateri berhasil diunggah & disimpan',
          'Foto asli pemateri kini langsung tampil di halaman utama SAKITA.',
        );
      } else {
        setIsDirty(true);
        toast(
          'success',
          'Foto pemateri berhasil diunggah',
          'Lengkapi nama pemateri lalu klik "Simpan & Publikasikan".',
        );
      }
    } catch (err) {
      const msg = formatTrainerError(err, 'Pastikan format JPG/PNG/WEBP maksimal 15 MB.');
      setActionError(msg);
      toast('error', 'Gagal mengunggah foto pemateri', msg);
    } finally {
      setUploadingPhoto(false);
      if (inputEl) inputEl.value = '';
    }
  };

  const handleUploadPortfolioScreenshot = async (
    portfolioId: string,
    file: File | null,
    inputEl?: HTMLInputElement | null,
  ) => {
    if (!file) return;
    setActionError(null);
    setUploadingPortfolioId(portfolioId);
    try {
      const url = await uploadAdminAsset(file);
      setDraft((prev) => ({
        ...prev,
        portfolio: prev.portfolio.map((item) =>
          item.id === portfolioId ? { ...item, screenshotUrl: url } : item,
        ),
      }));
      toast('success', 'Screenshot portofolio diunggah', 'Klik "Simpan & Publikasikan" untuk menyimpan.');
    } catch (err) {
      const msg = formatTrainerError(err, 'Pastikan format JPG/PNG/WEBP maksimal 15 MB.');
      setActionError(msg);
      toast('error', 'Gagal mengunggah screenshot', msg);
    } finally {
      setUploadingPortfolioId(null);
      if (inputEl) inputEl.value = '';
    }
  };

  const addExpertise = () => {
    const newItem: TrainerExpertiseItem = {
      id: `exp-${Date.now().toString(36)}`,
      icon: 'Cpu',
      title: '',
      description: '',
    };
    setDraft((prev) => ({ ...prev, expertise: [...prev.expertise, newItem] }));
  };

  const addPortfolio = () => {
    const newItem: TrainerPortfolioItem = {
      id: `port-${Date.now().toString(36)}`,
      name: '',
      category: 'Aplikasi Pendidikan',
      description: '',
      mainFeatures: [],
      status: 'Aktif / Live',
      demoUrl: '',
      screenshotUrl: '',
    };
    setDraft((prev) => ({ ...prev, portfolio: [...prev.portfolio, newItem] }));
  };

  const previewProgram = activeProgram || DEFAULT_PROGRAM;
  const previewModuleCount = previewProgram.curriculum?.length || previewProgram.projectCount || 10;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Manajemen Pemateri SAKITA
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Kelola foto asli pemateri, biodata, kompetensi, riwayat profesional, tools, portofolio
            karya nyata, visibilitas subsection, hingga penambahan pemateri baru.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{showPreview ? 'Tutup Preview' : 'Preview Sebelum Publikasi'}</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? 'Menyimpan...' : 'Simpan & Publikasikan'}</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <div>
            <p className="font-bold text-rose-900">Terjadi Kendala Saat Memproses Data Pemateri</p>
            <p className="mt-0.5 leading-relaxed">{actionError}</p>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Tutup pesan error"
            className="rounded-md p-1 text-rose-600 hover:bg-rose-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Multi-Trainer Selector Strip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {effectiveList.map((t) => {
              const active = !isCreatingNew && t.id === draft.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTrainer(t)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t.isPrimary && <Star className="h-3.5 w-3.5 text-amber-400" />}
                  <span>{t.fullName || 'Pemateri Baru'}</span>
                  <span
                    className={`text-[10px] font-medium ${
                      active ? 'text-slate-300' : t.isPublished ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    · {t.isPublished ? 'Publik' : 'Draft'}
                  </span>
                </button>
              );
            })}
            {isCreatingNew && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-600 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700">
                <Award className="h-3.5 w-3.5" />
                <span>Draft Pemateri Baru</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Pemateri Baru</span>
          </button>
        </div>
      </div>

      {/* Live Preview Panel */}
      {showPreview && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#07152D] shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#040D1E] px-5 py-3 text-xs text-slate-300">
            <span className="font-semibold text-white">
              Pratinjau Langsung Tampilan Landing Page (Belum Dipublikasikan hingga Anda Klik Simpan)
            </span>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
              <span>Tutup</span>
            </button>
          </div>
          <TrainerProfileSection
            trainers={[draft]}
            activeProgram={previewProgram}
            moduleCount={previewModuleCount}
            onRegister={() =>
              toast('info', 'Tombol CTA aktif', 'Pada halaman publik, tombol ini mengarah langsung ke formulir pendaftaran SAKITA.')
            }
            previewMode
          />
        </div>
      )}

      {/* Editor Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap gap-1 border-b border-slate-200 p-2">
          {[
            { id: 'identitas', label: '1. Foto, Identitas & Biodata' },
            { id: 'kompetensi', label: '2. Kompetensi, Riwayat & Tools' },
            { id: 'portofolio', label: `3. Portofolio Karya (${draft.portfolio.length})` },
            { id: 'narasi', label: '4. Keunggulan, Kutipan, Slogan & CTA' },
            { id: 'tampilan', label: '5. Visibilitas & Urutan Tampilan' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as EditorTab)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ===============================================================
              TAB 1: FOTO, IDENTITAS & BIODATA
             =============================================================== */}
          {activeTab === 'identitas' && (
            <div className="space-y-6">
              {/* Photo Uploader Box */}
              <div className="grid grid-cols-1 gap-6 rounded-xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-12">
                <div className="md:col-span-4 lg:col-span-3">
                  <div className="aspect-[4/5] w-full overflow-hidden rounded-xl border border-slate-200 bg-[#07152D]">
                    <ResolvedAssetImage
                      src={draft.photoUrl}
                      alt={draft.fullName || 'Foto pemateri'}
                      className="h-full w-full object-cover object-top"
                      fallback={
                        <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-slate-400">
                          <ImageIcon className="h-8 w-8 text-slate-500" />
                          <p className="mt-2 text-[11px]">Belum ada foto diunggah</p>
                        </div>
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-4 md:col-span-8 lg:col-span-9">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Foto Profesional Pemateri</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Unggah foto asli pemateri (JPG, PNG, atau WEBP maks. 15 MB). Foto otomatis
                      dioptimasi lalu disimpan permanen di Firebase agar langsung tampil di{' '}
                      <strong>sekolahaikita.my.id</strong> tanpa mengubah wajah asli.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800">
                        {uploadingPhoto ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span>{uploadingPhoto ? 'Mengunggah Foto...' : 'Unggah Foto Pemateri'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={uploadingPhoto}
                          onChange={(e) => {
                            const inputEl = e.currentTarget;
                            const file = inputEl.files?.[0] || null;
                            void handleUploadTrainerPhoto(file, inputEl);
                          }}
                        />
                      </label>

                      {draft.id === DEFAULT_PRIMARY_TRAINER.id &&
                        draft.photoUrl !== OFFICIAL_PRIMARY_TRAINER_PHOTO && (
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                photoUrl: OFFICIAL_PRIMARY_TRAINER_PHOTO,
                              }))
                            }
                            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            <span>Gunakan Foto Resmi Pemateri</span>
                          </button>
                        )}

                      {draft.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setDraft((prev) => ({ ...prev, photoUrl: '' }))}
                          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus Foto</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Atau URL Foto Langsung (Opsional)
                    </label>
                    <input
                      type="text"
                      value={draft.photoUrl}
                      onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })}
                      placeholder="https://... atau otomatis terisi setelah unggah file"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Multi-Trainer Controls */}
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700">ID Pemateri</label>
                  <input
                    type="text"
                    value={draft.id}
                    disabled={!isCreatingNew}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Urutan Tampil</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={draft.displayOrder}
                    onChange={(e) =>
                      setDraft({ ...draft, displayOrder: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs tabular-nums"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 pt-5 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={draft.isPublished}
                    onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })}
                    className="h-4 w-4 rounded accent-slate-900"
                  />
                  <span>Tampilkan di Landing Page</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 pt-5 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={draft.isPrimary}
                    onChange={(e) => setDraft({ ...draft, isPrimary: e.target.checked })}
                    className="h-4 w-4 rounded accent-slate-900"
                  />
                  <span>Jadikan Pemateri Utama</span>
                </label>
              </div>

              {/* Identity Fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={draft.fullName}
                    onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                    placeholder="AHMAD MAHBUBI AN, S.H., M.Pd."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Jabatan / Positioning Utama
                  </label>
                  <input
                    type="text"
                    value={draft.titlePrimary}
                    onChange={(e) => setDraft({ ...draft, titlePrimary: e.target.value })}
                    placeholder="AI Practitioner & Education Innovator"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Jabatan Sekunder / Afiliasi
                  </label>
                  <input
                    type="text"
                    value={draft.titleSecondary}
                    onChange={(e) => setDraft({ ...draft, titleSecondary: e.target.value })}
                    placeholder="Founder Sekolah AI Kita (SAKITA)"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Pilar Personal Branding
                  </label>
                  <input
                    type="text"
                    value={draft.pillarsLabel}
                    onChange={(e) => setDraft({ ...draft, pillarsLabel: e.target.value })}
                    placeholder="Education • Technology • Innovation"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Label Pemateri (Badge)
                  </label>
                  <input
                    type="text"
                    value={draft.roleBadge}
                    onChange={(e) => setDraft({ ...draft, roleBadge: e.target.value })}
                    placeholder="MAIN TRAINER"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Eyebrow Section</label>
                  <input
                    type="text"
                    value={draft.eyebrow}
                    onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })}
                    placeholder="MEET YOUR TRAINER"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Subjudul Section</label>
                  <input
                    type="text"
                    value={draft.sectionSubtitle}
                    onChange={(e) => setDraft({ ...draft, sectionSubtitle: e.target.value })}
                    placeholder="Kenali Pemateri Utama Anda"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Headline Personal Branding
                  </label>
                  <input
                    type="text"
                    value={draft.headline}
                    onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Subheadline Personal Branding
                  </label>
                  <textarea
                    rows={2}
                    value={draft.subheadline}
                    onChange={(e) => setDraft({ ...draft, subheadline: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Profil Profesional / Biodata Lengkap (Pisahkan paragraf dengan Enter)
                  </label>
                  <textarea
                    rows={8}
                    value={draft.bio}
                    onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed"
                  />
                </div>
              </div>

              {!draft.isPrimary && (
                <div className="flex justify-end border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    <span>Hapus Pemateri Ini</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ===============================================================
              TAB 2: KOMPETENSI, RIWAYAT PROFESIONAL & TOOLS
             =============================================================== */}
          {activeTab === 'kompetensi' && (
            <div className="space-y-8">
              {/* Areas of Expertise */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Bidang Kompetensi ({draft.expertise.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tambah, edit, hapus, atau atur urutan bidang keahlian pemateri.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addExpertise}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Kompetensi</span>
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={draft.expertiseTitle}
                    onChange={(e) => setDraft({ ...draft, expertiseTitle: e.target.value })}
                    placeholder="Judul Inggris (Areas of Expertise)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    value={draft.expertiseSubtitle}
                    onChange={(e) => setDraft({ ...draft, expertiseSubtitle: e.target.value })}
                    placeholder="Subjudul (Kompetensi dan Bidang Keahlian)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>

                <div className="mt-4 space-y-3">
                  {draft.expertise.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                expertise: moveItem(prev.expertise, idx, idx - 1),
                              }))
                            }
                            aria-label="Geser ke atas"
                            className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === draft.expertise.length - 1}
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                expertise: moveItem(prev.expertise, idx, idx + 1),
                              }))
                            }
                            aria-label="Geser ke bawah"
                            className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                expertise: prev.expertise.filter((_, i) => i !== idx),
                              }))
                            }
                            aria-label="Hapus kompetensi"
                            className="rounded-md border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-3">
                          <select
                            value={item.icon}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                expertise: prev.expertise.map((ex, i) =>
                                  i === idx ? { ...ex, icon: e.target.value } : ex,
                                ),
                              }))
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                          >
                            {ICON_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-9">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                expertise: prev.expertise.map((ex, i) =>
                                  i === idx ? { ...ex, title: e.target.value } : ex,
                                ),
                              }))
                            }
                            placeholder="Nama kompetensi"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                          />
                        </div>
                        <div className="sm:col-span-12">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                expertise: prev.expertise.map((ex, i) =>
                                  i === idx ? { ...ex, description: e.target.value } : ex,
                                ),
                              }))
                            }
                            placeholder="Deskripsi singkat kompetensi"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Professional Background */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Riwayat Aktivitas Profesional ({draft.background.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Daftar pengalaman dan peran profesional yang ditampilkan pada timeline.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, background: [...prev.background, ''] }))
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Aktivitas</span>
                  </button>
                </div>

                <div className="mt-4 space-y-2.5">
                  {draft.background.map((role, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 font-mono text-xs text-slate-400 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <input
                        type="text"
                        value={role}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            background: prev.background.map((b, i) =>
                              i === idx ? e.target.value : b,
                            ),
                          }))
                        }
                        placeholder="Jabatan atau peran profesional"
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            background: moveItem(prev.background, idx, idx - 1),
                          }))
                        }
                        className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === draft.background.length - 1}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            background: moveItem(prev.background, idx, idx + 1),
                          }))
                        }
                        className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            background: prev.background.filter((_, i) => i !== idx),
                          }))
                        }
                        className="rounded-md border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tools & Technologies */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Tools & Technologies ({draft.tools.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Teknologi AI yang dipelajari dan digunakan pemateri.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, tools: [...prev.tools, ''] }))}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Tool</span>
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <input
                    type="text"
                    value={draft.toolsTitle}
                    onChange={(e) => setDraft({ ...draft, toolsTitle: e.target.value })}
                    placeholder="Judul section tools"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {draft.tools.map((tool, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={tool}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              tools: prev.tools.map((t, i) => (i === idx ? e.target.value : t)),
                            }))
                          }
                          placeholder="Nama platform"
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              tools: prev.tools.filter((_, i) => i !== idx),
                            }))
                          }
                          className="rounded-md border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Catatan Independen (Disclaimer Platform)
                    </label>
                    <textarea
                      rows={2}
                      value={draft.toolsDisclaimer}
                      onChange={(e) => setDraft({ ...draft, toolsDisclaimer: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              TAB 3: PORTOFOLIO KARYA
             =============================================================== */}
          {activeTab === 'portofolio' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Portofolio Aplikasi Nyata</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Jika daftar ini kosong, section portofolio otomatis disembunyikan dari halaman
                    publik agar tidak menampilkan karya fiktif.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPortfolio}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Portofolio Aplikasi</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={draft.portfolioTitle}
                  onChange={(e) => setDraft({ ...draft, portfolioTitle: e.target.value })}
                  placeholder="From Knowledge to Real Innovation"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={draft.portfolioSubtitle}
                  onChange={(e) => setDraft({ ...draft, portfolioSubtitle: e.target.value })}
                  placeholder="Bukan Sekadar Teori, tetapi Karya Nyata."
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              {draft.portfolio.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <FolderKanban className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Belum Ada Portofolio Aplikasi
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                    Section portofolio saat ini disembunyikan secara otomatis di landing page. Klik{' '}
                    <strong>Tambah Portofolio Aplikasi</strong> apabila Anda sudah siap menampilkan
                    karya nyata beserta screenshot dan link demo.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {draft.portfolio.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Portofolio #{idx + 1}: {item.name || 'Aplikasi Baru'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                portfolio: moveItem(prev.portfolio, idx, idx - 1),
                              }))
                            }
                            className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 disabled:opacity-40"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === draft.portfolio.length - 1}
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                portfolio: moveItem(prev.portfolio, idx, idx + 1),
                              }))
                            }
                            className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 disabled:opacity-40"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                portfolio: prev.portfolio.filter((p) => p.id !== item.id),
                              }))
                            }
                            className="rounded-md border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        {/* Screenshot preview & uploader */}
                        <div className="space-y-2 lg:col-span-4">
                          <div className="aspect-[16/10] w-full overflow-hidden rounded-lg border border-slate-200 bg-[#07152D]">
                            <ResolvedAssetImage
                              src={item.screenshotUrl}
                              alt={item.name || 'Screenshot aplikasi'}
                              className="h-full w-full object-cover"
                              fallback={
                                <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center text-slate-400">
                                  <ImageIcon className="h-6 w-6 text-slate-500" />
                                  <span className="mt-1 text-[11px]">Screenshot belum diunggah</span>
                                </div>
                              }
                            />
                          </div>
                          <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                            {uploadingPortfolioId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {uploadingPortfolioId === item.id
                                ? 'Mengunggah...'
                                : 'Unggah Screenshot'}
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={uploadingPortfolioId === item.id}
                              onChange={(e) => {
                                const inputEl = e.currentTarget;
                                const file = inputEl.files?.[0] || null;
                                void handleUploadPortfolioScreenshot(item.id, file, inputEl);
                              }}
                            />
                          </label>
                        </div>

                        {/* Portfolio Form Fields */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-8">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600">
                              Nama Aplikasi
                            </label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  portfolio: prev.portfolio.map((p) =>
                                    p.id === item.id ? { ...p, name: e.target.value } : p,
                                  ),
                                }))
                              }
                              placeholder="Contoh: Sistem PPDB & SPP Pesantren"
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600">
                              Kategori Aplikasi
                            </label>
                            <input
                              type="text"
                              value={item.category}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  portfolio: prev.portfolio.map((p) =>
                                    p.id === item.id ? { ...p, category: e.target.value } : p,
                                  ),
                                }))
                              }
                              placeholder="Manajemen Sekolah / Pesantren"
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600">
                              Status Pengembangan
                            </label>
                            <select
                              value={item.status}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  portfolio: prev.portfolio.map((p) =>
                                    p.id === item.id ? { ...p, status: e.target.value } : p,
                                  ),
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                            >
                              <option value="Aktif / Live">Aktif / Live</option>
                              <option value="Beta">Beta</option>
                              <option value="Dalam Pengembangan">Dalam Pengembangan</option>
                              <option value="Prototipe">Prototipe</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600">
                              Deskripsi Singkat
                            </label>
                            <textarea
                              rows={2}
                              value={item.description}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  portfolio: prev.portfolio.map((p) =>
                                    p.id === item.id ? { ...p, description: e.target.value } : p,
                                  ),
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600">
                              Fitur Utama (Satu fitur per baris)
                            </label>
                            <textarea
                              rows={3}
                              value={item.mainFeatures.join('\n')}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  portfolio: prev.portfolio.map((p) =>
                                    p.id === item.id
                                      ? {
                                          ...p,
                                          mainFeatures: e.target.value.split('\n'),
                                        }
                                      : p,
                                  ),
                                }))
                              }
                              placeholder="Pendaftaran online otomatis&#10;Laporan SPP real-time&#10;Dashboard pimpinan"
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600">
                              Link Demo Aplikasi (diawali https://)
                            </label>
                            <input
                              type="url"
                              value={item.demoUrl}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  portfolio: prev.portfolio.map((p) =>
                                    p.id === item.id ? { ...p, demoUrl: e.target.value } : p,
                                  ),
                                }))
                              }
                              placeholder="https://contoh-aplikasi.my.id"
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===============================================================
              TAB 4: KEUNGGULAN, PERSONAL STATEMENT, SLOGAN & CTA
             =============================================================== */}
          {activeTab === 'narasi' && (
            <div className="space-y-8">
              {/* Why Learn */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Bagian "Mengapa Belajar Bersama Pemateri Ini?"
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Judul Bagian</label>
                  <input
                    type="text"
                    value={draft.whyLearnTitle}
                    onChange={(e) => setDraft({ ...draft, whyLearnTitle: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Poin Keunggulan (Satu poin per baris)
                  </label>
                  <textarea
                    rows={5}
                    value={draft.whyLearnPoints.join('\n')}
                    onChange={(e) =>
                      setDraft({ ...draft, whyLearnPoints: e.target.value.split('\n') })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Narasi Pendukung</label>
                  <textarea
                    rows={3}
                    value={draft.whyLearnNarrative}
                    onChange={(e) => setDraft({ ...draft, whyLearnNarrative: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed"
                  />
                </div>
              </div>

              {/* Personal Statement */}
              <div className="space-y-3 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-bold text-slate-900">Personal Statement (Kutipan)</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Isi Kutipan</label>
                  <textarea
                    rows={3}
                    value={draft.personalStatement}
                    onChange={(e) => setDraft({ ...draft, personalStatement: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Nama Penulis Kutipan</label>
                  <input
                    type="text"
                    value={draft.personalStatementAuthor}
                    onChange={(e) =>
                      setDraft({ ...draft, personalStatementAuthor: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Personal Brand Slogan */}
              <div className="space-y-3 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-bold text-slate-900">Personal Brand Slogan</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Baris Slogan Bahasa Indonesia (Satu baris per item)
                  </label>
                  <textarea
                    rows={3}
                    value={draft.sloganLines.join('\n')}
                    onChange={(e) =>
                      setDraft({ ...draft, sloganLines: e.target.value.split('\n') })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Slogan Bahasa Inggris
                  </label>
                  <input
                    type="text"
                    value={draft.sloganEnglish}
                    onChange={(e) => setDraft({ ...draft, sloganEnglish: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Call to Action */}
              <div className="space-y-3 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-bold text-slate-900">Call to Action (CTA)</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Headline CTA</label>
                  <input
                    type="text"
                    value={draft.ctaHeadline}
                    onChange={(e) => setDraft({ ...draft, ctaHeadline: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Subheadline CTA</label>
                  <textarea
                    rows={2}
                    value={draft.ctaSubheadline}
                    onChange={(e) => setDraft({ ...draft, ctaSubheadline: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Teks Tombol CTA</label>
                  <input
                    type="text"
                    value={draft.ctaButtonLabel}
                    onChange={(e) => setDraft({ ...draft, ctaButtonLabel: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              TAB 5: VISIBILITAS & URUTAN SUBSECTION
             =============================================================== */}
          {activeTab === 'tampilan' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Atur Visibilitas & Urutan Tampilan Subsection
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Aktifkan atau sembunyikan setiap subsection serta atur urutan tampilnya di landing
                  page.
                </p>
              </div>

              <div className="space-y-2.5">
                {draft.sectionOrder.map((key, idx) => {
                  const meta = SECTION_LABELS[key];
                  const visible = Boolean(draft.sectionVisibility[key]);
                  return (
                    <div
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400 tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              sectionVisibility: {
                                ...prev.sectionVisibility,
                                [key]: !prev.sectionVisibility[key],
                              },
                            }))
                          }
                          className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                            visible
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {visible ? <Check className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          <span>{visible ? 'Tampil' : 'Disembunyikan'}</span>
                        </button>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{meta.title}</p>
                          <p className="text-[11px] text-slate-500">{meta.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              sectionOrder: moveItem(prev.sectionOrder, idx, idx - 1),
                            }))
                          }
                          aria-label="Naikkan urutan"
                          className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === draft.sectionOrder.length - 1}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              sectionOrder: moveItem(prev.sectionOrder, idx, idx + 1),
                            }))
                          }
                          aria-label="Turunkan urutan"
                          className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
