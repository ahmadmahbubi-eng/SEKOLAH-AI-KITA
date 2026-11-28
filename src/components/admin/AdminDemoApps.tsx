import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookMarked,
  BookOpen,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  ImagePlus,
  Layers,
  LayoutDashboard,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import { ResolvedAssetImage } from '../ResolvedAssetImage';
import { useToast } from '../../context/ToastContext';
import { DEFAULT_DEMO_APPS, DEMO_APP_STATUS_META } from '../../lib/defaults';
import {
  deleteDemoApp,
  isSafeHttpUrl,
  saveDemoApp,
  seedDefaultDemoApps,
  uploadAdminAsset,
} from '../../lib/sakitaService';
import type { DemoAppItem, DemoAppStatus } from '../../types';

interface AdminDemoAppsProps {
  demoApps: DemoAppItem[];
}

const ICON_OPTIONS: Array<{
  value: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'UserPlus', label: 'PPDB / Pendaftaran', Icon: UserPlus },
  { value: 'Wallet', label: 'Keuangan & SPP', Icon: Wallet },
  { value: 'BookOpen', label: 'Akademik & Rapor', Icon: BookOpen },
  { value: 'ClipboardCheck', label: 'Ujian CBT', Icon: ClipboardCheck },
  { value: 'CalendarCheck', label: 'Absensi QR/WA', Icon: CalendarCheck },
  { value: 'BookMarked', label: 'Tahfizh Al-Qur’an', Icon: BookMarked },
  { value: 'Building2', label: 'Asrama & Perizinan', Icon: Building2 },
  { value: 'Utensils', label: 'Katering & Dapur', Icon: Utensils },
  { value: 'LayoutDashboard', label: 'Dashboard Eksekutif', Icon: LayoutDashboard },
  { value: 'Globe', label: 'Website & Portal', Icon: Globe },
  { value: 'GraduationCap', label: 'Pendidikan', Icon: GraduationCap },
  { value: 'Layers', label: 'Modul Sistem', Icon: Layers },
  { value: 'ShieldCheck', label: 'Keamanan & Audit', Icon: ShieldCheck },
  { value: 'Sparkles', label: 'Inovasi AI', Icon: Sparkles },
];

function renderAppIcon(iconKey: string, className = 'h-4 w-4') {
  const found = ICON_OPTIONS.find((item) => item.value === iconKey);
  const IconComp = found?.Icon || LayoutDashboard;
  return <IconComp className={className} />;
}

function slugifyId(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

interface EditorDraft {
  isNew: boolean;
  id: string;
  orderNumber: number;
  name: string;
  subtitle: string;
  category: string;
  description: string;
  featuresText: string;
  icon: string;
  status: DemoAppStatus;
  demoUrl: string;
  screenshotUrl: string;
  isVisible: boolean;
}

export function AdminDemoApps({ demoApps }: AdminDemoAppsProps) {
  const { toast } = useToast();
  const isUsingFallbackCatalog = demoApps.length === 0;

  const displayList = useMemo(() => {
    const source = demoApps.length > 0 ? demoApps : DEFAULT_DEMO_APPS;
    return [...source].sort(
      (a, b) => a.orderNumber - b.orderNumber || a.name.localeCompare(b.name),
    );
  }, [demoApps]);

  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [uploadingShot, setUploadingShot] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = displayList.length;
    const available = displayList.filter(
      (app) => app.isVisible && app.status === 'demo_tersedia' && isSafeHttpUrl(app.demoUrl),
    ).length;
    const upcoming = displayList.filter(
      (app) => app.isVisible && app.status !== 'demo_tersedia',
    ).length;
    const hidden = displayList.filter((app) => !app.isVisible).length;
    return { total, available, upcoming, hidden };
  }, [displayList]);

  const handleSeedDefaults = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const count = await seedDefaultDemoApps();
      toast(
        'success',
        'Katalog awal berhasil disimpan ke database',
        `${count} aplikasi SAKITA kini siap dikelola secara real-time.`,
      );
    } catch (err) {
      toast(
        'error',
        'Gagal menginisialisasi katalog',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSeeding(false);
    }
  };

  const openCreateModal = () => {
    const maxOrder = displayList.reduce((max, item) => Math.max(max, item.orderNumber), 0);
    setDraft({
      isNew: true,
      id: '',
      orderNumber: maxOrder + 1,
      name: '',
      subtitle: '',
      category: '',
      description: '',
      featuresText: '',
      icon: 'LayoutDashboard',
      status: 'segera_hadir',
      demoUrl: '',
      screenshotUrl: '',
      isVisible: true,
    });
  };

  const openEditModal = (app: DemoAppItem) => {
    setDraft({
      isNew: false,
      id: app.id,
      orderNumber: app.orderNumber,
      name: app.name,
      subtitle: app.subtitle,
      category: app.category,
      description: app.description,
      featuresText: app.features.join('\n'),
      icon: app.icon || 'LayoutDashboard',
      status: app.status,
      demoUrl: app.demoUrl || '',
      screenshotUrl: app.screenshotUrl || '',
      isVisible: app.isVisible,
    });
  };

  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !draft) return;

    setUploadingShot(true);
    try {
      const assetRef = await uploadAdminAsset(file);
      setDraft((prev) => (prev ? { ...prev, screenshotUrl: assetRef } : prev));
      toast(
        'success',
        'Screenshot berhasil diunggah',
        'Klik "Simpan Perubahan" untuk menayangkan screenshot pada Galeri Aplikasi.',
      );
    } catch (err) {
      toast(
        'error',
        'Gagal mengunggah screenshot',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setUploadingShot(false);
    }
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || saving) return;

    const cleanId = draft.isNew
      ? slugifyId(draft.id || draft.name)
      : draft.id.trim();
    if (cleanId.length < 2) {
      toast('error', 'Nama/ID aplikasi minimal 2 karakter');
      return;
    }

    const cleanDemoUrl = draft.demoUrl.trim();
    if (draft.status === 'demo_tersedia' && !isSafeHttpUrl(cleanDemoUrl)) {
      toast(
        'error',
        'URL demo wajib valid untuk status Demo Tersedia',
        'Masukkan tautan https:// yang benar sebelum mengaktifkan status Demo Tersedia.',
      );
      return;
    }

    const features = draft.featuresText
      .split('\n')
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 15);

    setSaving(true);
    try {
      // If Firestore collection is still completely unseeded, seed defaults first so the other 9 apps remain visible!
      if (isUsingFallbackCatalog) {
        await seedDefaultDemoApps();
      }
      await saveDemoApp(
        {
          id: cleanId,
          orderNumber: Math.max(1, Math.min(1000, Math.round(Number(draft.orderNumber) || 1))),
          name: draft.name.trim(),
          subtitle: draft.subtitle.trim(),
          category: draft.category.trim(),
          description: draft.description.trim(),
          features,
          icon: draft.icon,
          status: draft.status,
          demoUrl: cleanDemoUrl,
          screenshotUrl: draft.screenshotUrl.trim(),
          isVisible: draft.isVisible,
        },
        draft.isNew,
      );
      toast(
        'success',
        draft.isNew ? 'Aplikasi berhasil ditambahkan' : 'Perubahan aplikasi tersimpan',
        `"${draft.name.trim()}" langsung diperbarui pada Galeri Aplikasi SAKITA.`,
      );
      setDraft(null);
    } catch (err) {
      toast(
        'error',
        'Gagal menyimpan aplikasi',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (app: DemoAppItem) => {
    if (busyId) return;
    setBusyId(app.id);
    try {
      if (isUsingFallbackCatalog) {
        await seedDefaultDemoApps();
      }
      await saveDemoApp({ ...app, isVisible: !app.isVisible }, false);
      toast(
        'success',
        !app.isVisible ? 'Aplikasi ditampilkan di website' : 'Aplikasi disembunyikan',
      );
    } catch (err) {
      toast(
        'error',
        'Gagal mengubah visibilitas',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveOrder = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (busyId || targetIdx < 0 || targetIdx >= displayList.length) return;
    const current = displayList[index];
    const neighbor = displayList[targetIdx];
    setBusyId(current.id);
    try {
      if (isUsingFallbackCatalog) {
        await seedDefaultDemoApps();
      }
      const nextCurrentOrder = neighbor.orderNumber === current.orderNumber
        ? Math.max(1, current.orderNumber + direction)
        : neighbor.orderNumber;
      const nextNeighborOrder = current.orderNumber;
      await Promise.all([
        saveDemoApp({ ...current, orderNumber: nextCurrentOrder }, false),
        saveDemoApp({ ...neighbor, orderNumber: nextNeighborOrder }, false),
      ]);
      toast('success', 'Urutan aplikasi diperbarui');
    } catch (err) {
      toast(
        'error',
        'Gagal mengubah urutan',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (app: DemoAppItem) => {
    if (busyId) return;
    setBusyId(app.id);
    try {
      if (isUsingFallbackCatalog) {
        await seedDefaultDemoApps();
      }
      await deleteDemoApp(app);
      setConfirmDeleteId(null);
      toast('success', 'Aplikasi dihapus dari galeri', `"${app.name}" telah dihapus.`);
    } catch (err) {
      toast(
        'error',
        'Gagal menghapus aplikasi',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Galeri Aplikasi SAKITA
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Kelola katalog demo aplikasi, screenshot asli, status ketersediaan, dan urutan tampil
            secara langsung tanpa edit kode atau deployment ulang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isUsingFallbackCatalog && (
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedDefaults}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              <span>Simpan 10 Katalog Awal ke Database</span>
            </button>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Aplikasi</span>
          </button>
        </div>
      </div>

      {/* Sync Info Notice if collection not yet seeded */}
      {isUsingFallbackCatalog && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-xs text-amber-900">
          <p>
            <strong>Mode Katalog Bawaan:</strong> 10 aplikasi awal SAKITA sudah tampil di landing
            page. Klik tombol edit pada salah satu aplikasi atau klik{' '}
            <strong>Simpan 10 Katalog Awal ke Database</strong> untuk menyimpannya ke Firestore.
          </p>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Katalog Aplikasi</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-slate-500">Proyek terdaftar di galeri</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
          <p className="text-xs font-medium text-emerald-800">Demo Tersedia (Publik)</p>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {stats.available}
          </p>
          <p className="mt-1 text-xs text-emerald-800/80">
            Otomatis dihitung pada indikator landing page
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Segera Hadir / Pengembangan</p>
          <p className="mt-2 font-mono text-2xl font-bold text-amber-600 tabular-nums">
            {stats.upcoming}
          </p>
          <p className="mt-1 text-xs text-slate-500">Tampil di Proyek Aplikasi Berikutnya</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Disembunyikan</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-600 tabular-nums">
            {stats.hidden}
          </p>
          <p className="mt-1 text-xs text-slate-500">Tidak tampil pada halaman publik</p>
        </div>
      </div>

      {/* Applications Management List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Urutan</th>
                <th className="px-4 py-3">Aplikasi</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Status & Tautan Demo</th>
                <th className="px-4 py-3">Screenshot</th>
                <th className="px-4 py-3">Visibilitas</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {displayList.map((app, index) => {
                const statusMeta =
                  DEMO_APP_STATUS_META[app.status] || DEMO_APP_STATUS_META.segera_hadir;
                const hasUrl = isSafeHttpUrl(app.demoUrl);
                const isBusy = busyId === app.id;

                return (
                  <tr
                    key={app.id}
                    className={`hover:bg-slate-50 ${!app.isVisible ? 'opacity-65 bg-slate-50/60' : ''}`}
                  >
                    {/* Order Controls */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900 tabular-nums w-6">
                          {String(app.orderNumber).padStart(2, '0')}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={index === 0 || Boolean(busyId)}
                            onClick={() => handleMoveOrder(index, -1)}
                            title="Pindah ke atas"
                            className="rounded border border-slate-200 p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === displayList.length - 1 || Boolean(busyId)}
                            onClick={() => handleMoveOrder(index, 1)}
                            title="Pindah ke bawah"
                            className="rounded border border-slate-200 p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Name & Subtitle */}
                    <td className="px-4 py-3.5 min-w-[200px]">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                          {renderAppIcon(app.icon, 'h-4 w-4')}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{app.name}</p>
                          <p className="text-[11px] text-slate-500">{app.subtitle || '-'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5 text-slate-600">{app.category}</td>

                    {/* Status & URL */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          statusMeta.tone === 'emerald'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : statusMeta.tone === 'amber'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {statusMeta.label}
                      </span>
                      {hasUrl ? (
                        <a
                          href={app.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline max-w-[210px] truncate"
                        >
                          <span className="truncate">{app.demoUrl.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="mt-1 block text-[11px] text-slate-400">
                          Belum ada URL demo
                        </span>
                      )}
                    </td>

                    {/* Screenshot Thumbnail */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {app.screenshotUrl ? (
                        <div className="flex items-center gap-2">
                          <ResolvedAssetImage
                            src={app.screenshotUrl}
                            alt={app.name}
                            className="h-9 w-14 rounded border border-slate-200 object-cover"
                          />
                          <span className="text-[11px] font-medium text-emerald-700">Asli</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Ilustrasi</span>
                      )}
                    </td>

                    {/* Visibility */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleVisibility(app)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          app.isVisible
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {app.isVisible ? (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>Tampil</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" />
                            <span>Tersembunyi</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(app)}
                          title="Edit aplikasi"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        {confirmDeleteId === app.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDelete(app)}
                              className="rounded-md bg-rose-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700"
                            >
                              Ya, Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-600"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(app.id)}
                            title="Hapus aplikasi"
                            className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveDraft}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {draft.isNew ? 'Tambah Aplikasi ke Galeri' : `Edit ${draft.name}`}
                </h2>
                <p className="text-xs text-slate-500">
                  Perubahan otomatis sinkron ke halaman utama Galeri Aplikasi SAKITA
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-7">
                  <label className="block text-xs font-medium text-slate-700">
                    Nama Aplikasi *
                  </label>
                  <input
                    type="text"
                    required
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        name: e.target.value,
                        id: draft.isNew ? slugifyId(e.target.value) : draft.id,
                      })
                    }
                    placeholder="Contoh: SAKITA ACADEMIC"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-700">Ikon</label>
                  <select
                    value={draft.icon}
                    onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Urutan *</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={draft.orderNumber}
                    onChange={(e) =>
                      setDraft({ ...draft, orderNumber: Number(e.target.value) || 1 })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Subtitle Aplikasi
                  </label>
                  <input
                    type="text"
                    value={draft.subtitle}
                    onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                    placeholder="Contoh: Smart Admission System"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Kategori *</label>
                  <input
                    type="text"
                    required
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    placeholder="Contoh: Penerimaan Peserta Didik Baru"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Status Aplikasi *
                  </label>
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({ ...draft, status: e.target.value as DemoAppStatus })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  >
                    <option value="demo_tersedia">Demo Tersedia</option>
                    <option value="dalam_pengembangan">Dalam Pengembangan</option>
                    <option value="segera_hadir">Segera Hadir</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    URL Demo {draft.status === 'demo_tersedia' ? '*' : '(Opsional)'}
                  </label>
                  <input
                    type="url"
                    required={draft.status === 'demo_tersedia'}
                    value={draft.demoUrl}
                    onChange={(e) => setDraft({ ...draft, demoUrl: e.target.value })}
                    placeholder="https://demo-aplikasi-sakita.vercel.app/"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Jelaskan manfaat dan fungsi utama aplikasi ini..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Fitur Unggulan (satu fitur per baris, maks. 15)
                </label>
                <textarea
                  rows={5}
                  value={draft.featuresText}
                  onChange={(e) => setDraft({ ...draft, featuresText: e.target.value })}
                  placeholder={'Pendaftaran online\nDashboard administrator\nVerifikasi berkas'}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              {/* Screenshot Upload */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Screenshot Asli Aplikasi (Opsional)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Jika kosong, website menampilkan ilustrasi dashboard berlabel &ldquo;Ilustrasi&rdquo;.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                      {uploadingShot ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5" />
                      )}
                      <span>{uploadingShot ? 'Mengunggah...' : 'Unggah Screenshot'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleUploadScreenshot}
                        disabled={uploadingShot}
                        className="hidden"
                      />
                    </label>
                    {draft.screenshotUrl && (
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, screenshotUrl: '' })}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
                {draft.screenshotUrl && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <ResolvedAssetImage
                      src={draft.screenshotUrl}
                      alt="Preview screenshot aplikasi"
                      className="max-h-48 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Visibility Toggle */}
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={draft.isVisible}
                  onChange={(e) => setDraft({ ...draft, isVisible: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900"
                />
                <span>Tampilkan aplikasi ini pada Galeri Aplikasi SAKITA di halaman utama</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || uploadingShot}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
