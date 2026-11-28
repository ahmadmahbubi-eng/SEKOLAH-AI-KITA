import { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { saveWebsiteSettings, uploadAdminAsset } from '../../lib/sakitaService';
import { ResolvedAssetImage } from '../ResolvedAssetImage';
import type { WebsiteSettings } from '../../types';

interface AdminWebsiteCMSProps {
  settings: WebsiteSettings;
}

type CmsTab = 'brand' | 'mentor' | 'hotel' | 'materi' | 'faq' | 'legal';

export function AdminWebsiteCMS({ settings }: AdminWebsiteCMSProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<WebsiteSettings>(settings);
  const [tab, setTab] = useState<CmsTab>('brand');
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [hotelCaption, setHotelCaption] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveWebsiteSettings(form);
      toast('success', 'Perubahan website tersimpan', 'Landing page SAKITA langsung diperbarui.');
    } catch (err) {
      toast('error', 'Gagal menyimpan CMS', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (
    file: File | null,
    slot: 'logo' | 'banner' | 'mentor' | 'hotel',
  ) => {
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const url = await uploadAdminAsset(file);
      if (slot === 'logo') {
        setForm((prev) => ({ ...prev, logoUrl: url }));
      } else if (slot === 'banner') {
        setForm((prev) => ({ ...prev, bannerUrl: url }));
      } else if (slot === 'mentor') {
        setForm((prev) => ({ ...prev, mentor: { ...prev.mentor, photoUrl: url } }));
      } else if (slot === 'hotel') {
        setForm((prev) => ({
          ...prev,
          hotelGallery: [
            ...prev.hotelGallery,
            { url, caption: hotelCaption.trim() || 'Hotel Grand Makmur, Jambi' },
          ],
        }));
        setHotelCaption('');
      }
      toast('success', 'Gambar berhasil diunggah', 'Klik "Simpan Perubahan Website" untuk mempublikasikan.');
    } catch (err) {
      toast('error', 'Unggahan gambar gagal', err instanceof Error ? err.message : undefined);
    } finally {
      setUploadingSlot(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Kelola Website (CMS)</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Ubah konten landing page, logo SAKITA, galeri hotel, mentor, materi, dan FAQ secara langsung
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Website'}</span>
        </button>
      </div>

      {/* CMS Sub-navigation */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-200/70 p-1">
        {(
          [
            { id: 'brand', label: 'Brand, Hero & Banner' },
            { id: 'mentor', label: 'Profil Mentor' },
            { id: 'hotel', label: 'Galeri Hotel' },
            { id: 'materi', label: '10 Proyek & Fasilitas' },
            { id: 'faq', label: 'FAQ' },
            { id: 'legal', label: 'Kontak & Legal' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              tab === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {tab === 'brand' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">Nama Brand</label>
                <input
                  type="text"
                  value={form.brandName}
                  onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Tagline</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Logo SAKITA (Unggah PNG/JPG/WEBP)</label>
                <div className="mt-1 flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingSlot === 'logo' ? 'Mengunggah...' : 'Unggah Logo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => handleUploadImage(e.target.files?.[0] || null, 'logo')}
                    />
                  </label>
                  {form.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logoUrl: '' })}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Hapus Logo
                    </button>
                  )}
                </div>
                {form.logoUrl && (
                  <ResolvedAssetImage
                    src={form.logoUrl}
                    alt="Preview logo"
                    className="mt-2 h-10 rounded border border-slate-200 bg-slate-900 p-1.5 object-contain"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Banner Hero Opsional (kosongkan untuk ilustrasi dashboard interaktif)
                </label>
                <div className="mt-1 flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingSlot === 'banner' ? 'Mengunggah...' : 'Unggah Banner'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => handleUploadImage(e.target.files?.[0] || null, 'banner')}
                    />
                  </label>
                  {form.bannerUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, bannerUrl: '' })}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Gunakan Ilustrasi Dashboard
                    </button>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Hero Eyebrow</label>
                <input
                  type="text"
                  value={form.heroEyebrow}
                  onChange={(e) => setForm({ ...form, heroEyebrow: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Headline Utama</label>
                <input
                  type="text"
                  value={form.heroHeadline}
                  onChange={(e) => setForm({ ...form, heroHeadline: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Subheadline</label>
                <input
                  type="text"
                  value={form.heroSubheadline}
                  onChange={(e) => setForm({ ...form, heroSubheadline: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Deskripsi Hero</label>
                <textarea
                  rows={4}
                  value={form.heroDescription}
                  onChange={(e) => setForm({ ...form, heroDescription: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'mentor' && (
          <div className="space-y-5">
            <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-slate-900">
              <input
                type="checkbox"
                checked={form.mentor.enabled}
                onChange={(e) =>
                  setForm({ ...form, mentor: { ...form.mentor, enabled: e.target.checked } })
                }
                className="h-4 w-4 rounded accent-slate-900"
              />
              <span>Tampilkan Section Profil Mentor di Landing Page</span>
            </label>
            <p className="text-xs text-slate-500">
              Jika dinonaktifkan atau nama mentor masih kosong, section mentor otomatis disembunyikan
              dari landing page publik.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">Nama Lengkap Mentor</label>
                <input
                  type="text"
                  value={form.mentor.name}
                  onChange={(e) =>
                    setForm({ ...form, mentor: { ...form.mentor, name: e.target.value } })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Jabatan / Peran</label>
                <input
                  type="text"
                  value={form.mentor.role}
                  onChange={(e) =>
                    setForm({ ...form, mentor: { ...form.mentor, role: e.target.value } })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Ringkasan Pengalaman</label>
                <input
                  type="text"
                  value={form.mentor.experience}
                  onChange={(e) =>
                    setForm({ ...form, mentor: { ...form.mentor, experience: e.target.value } })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Deskripsi Mentor</label>
                <textarea
                  rows={4}
                  value={form.mentor.bio}
                  onChange={(e) =>
                    setForm({ ...form, mentor: { ...form.mentor, bio: e.target.value } })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Foto Mentor</label>
                <div className="mt-1.5 flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingSlot === 'mentor' ? 'Mengunggah...' : 'Unggah Foto Mentor'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => handleUploadImage(e.target.files?.[0] || null, 'mentor')}
                    />
                  </label>
                  {form.mentor.photoUrl && (
                    <ResolvedAssetImage
                      src={form.mentor.photoUrl}
                      alt="Preview mentor"
                      className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'hotel' && (
          <div className="space-y-5">
            <p className="text-xs text-slate-500">
              Unggah foto asli Hotel Grand Makmur, Jambi. Sebelum foto asli diunggah, landing page
              hanya menampilkan placeholder netral.
            </p>
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-700">Keterangan Foto</label>
                <input
                  type="text"
                  value={hotelCaption}
                  onChange={(e) => setHotelCaption(e.target.value)}
                  placeholder="Contoh: Ruang Pelatihan Utama Hotel Grand Makmur"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800">
                <Upload className="h-4 w-4" />
                <span>{uploadingSlot === 'hotel' ? 'Mengunggah...' : 'Unggah Foto Hotel'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleUploadImage(e.target.files?.[0] || null, 'hotel')}
                />
              </label>
            </div>

            {form.hotelGallery.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-xs text-slate-500">
                Belum ada foto hotel yang diunggah.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {form.hotelGallery.map((item, idx) => (
                  <div key={`${item.url}-${idx}`} className="overflow-hidden rounded-xl border border-slate-200">
                    <ResolvedAssetImage
                      src={item.url}
                      alt={item.caption}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-2 p-3 text-xs">
                      <span className="truncate font-medium text-slate-700">{item.caption}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            hotelGallery: form.hotelGallery.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'materi' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Daftar 10 Proyek Aplikasi Digital
              </h2>
              <div className="mt-4 space-y-3">
                {form.projects.map((proj, idx) => (
                  <div key={idx} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-12">
                    <input
                      type="text"
                      value={proj.title}
                      onChange={(e) => {
                        const next = [...form.projects];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setForm({ ...form, projects: next });
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold sm:col-span-4"
                      placeholder="Judul proyek"
                    />
                    <input
                      type="text"
                      value={proj.description}
                      onChange={(e) => {
                        const next = [...form.projects];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setForm({ ...form, projects: next });
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:col-span-4"
                      placeholder="Deskripsi singkat"
                    />
                    <input
                      type="text"
                      value={proj.benefit}
                      onChange={(e) => {
                        const next = [...form.projects];
                        next[idx] = { ...next[idx], benefit: e.target.value };
                        setForm({ ...form, projects: next });
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:col-span-4"
                      placeholder="Manfaat bagi lembaga"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <label className="block text-xs font-semibold text-slate-700">
                Fasilitas Default (satu baris per fasilitas)
              </label>
              <textarea
                rows={5}
                value={form.facilities.join('\n')}
                onChange={(e) =>
                  setForm({
                    ...form,
                    facilities: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  })
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {tab === 'faq' && (
          <div className="space-y-4">
            {form.faqs.map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-slate-500">FAQ #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, faqs: form.faqs.filter((_, i) => i !== idx) })
                    }
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => {
                    const next = [...form.faqs];
                    next[idx] = { ...next[idx], question: e.target.value };
                    setForm({ ...form, faqs: next });
                  }}
                  placeholder="Pertanyaan"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
                />
                <textarea
                  rows={2}
                  value={faq.answer}
                  onChange={(e) => {
                    const next = [...form.faqs];
                    next[idx] = { ...next[idx], answer: e.target.value };
                    setForm({ ...form, faqs: next });
                  }}
                  placeholder="Jawaban"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  faqs: [...form.faqs, { question: 'Pertanyaan baru', answer: '' }],
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Pertanyaan FAQ</span>
            </button>
          </div>
        )}

        {tab === 'legal' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">Nomor WhatsApp Publik</label>
                <input
                  type="text"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Email Kontak Publik</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Kebijakan Privasi</label>
              <textarea
                rows={6}
                value={form.privacyPolicy}
                onChange={(e) => setForm({ ...form, privacyPolicy: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Syarat dan Ketentuan Pendaftaran</label>
              <textarea
                rows={6}
                value={form.termsConditions}
                onChange={(e) => setForm({ ...form, termsConditions: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
