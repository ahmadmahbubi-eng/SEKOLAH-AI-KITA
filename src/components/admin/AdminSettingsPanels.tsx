import { useEffect, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  Bell,
  Building,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { db } from '../../lib/firebase';
import { formatTimestampID } from '../../lib/format';
import {
  getAdminAuthHeaders,
  saveBankSettings,
  saveCommunitySettings,
  saveNotificationSettings,
} from '../../lib/sakitaService';
import type {
  BankSettings,
  CommunitySettings,
  NotificationLog,
  NotificationSettings,
} from '../../types';

interface AdminSettingsPanelsProps {
  section: 'komunitas' | 'notifikasi' | 'pengaturan';
  bankSettings: BankSettings;
  communitySettings: CommunitySettings;
  notificationSettings: NotificationSettings;
  notificationLogs: NotificationLog[];
}

export function AdminSettingsPanels({
  section,
  bankSettings,
  communitySettings,
  notificationSettings,
  notificationLogs,
}: AdminSettingsPanelsProps) {
  const { toast } = useToast();

  const [bankForm, setBankForm] = useState<BankSettings>(bankSettings);
  const [commForm, setCommForm] = useState<CommunitySettings>(communitySettings);
  const [notifForm, setNotifForm] = useState<NotificationSettings>(notificationSettings);
  const [saving, setSaving] = useState(false);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  const [integrationStatus, setIntegrationStatus] = useState<{
    email: { provider: string; connected: boolean; statusLabel: string };
    whatsapp: { provider: string; connected: boolean; statusLabel: string };
  }>({
    email: { provider: 'Resend', connected: false, statusLabel: 'Belum Terhubung' },
    whatsapp: { provider: 'WhatsApp Business Cloud API', connected: false, statusLabel: 'Belum Terhubung' },
  });

  useEffect(() => setBankForm(bankSettings), [bankSettings]);
  useEffect(() => setCommForm(communitySettings), [communitySettings]);
  useEffect(() => setNotifForm(notificationSettings), [notificationSettings]);

  useEffect(() => {
    if (section !== 'notifikasi') return;
    let active = true;
    async function loadStatus() {
      try {
        const headers = await getAdminAuthHeaders();
        const resp = await fetch('/api/notifications/status', { headers });
        if (resp.ok && active) {
          const data = (await resp.json()) as typeof integrationStatus;
          setIntegrationStatus(data);
        }
      } catch {
        // default unconfigured
      }
    }
    void loadStatus();
    return () => {
      active = false;
    };
  }, [section]);

  const handleSaveCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await saveCommunitySettings(commForm);
      toast(
        'success',
        'Pengaturan Komunitas Tersimpan',
        'Link komunitas dilindungi di server dan hanya terbuka bagi peserta yang sudah mengunggah bukti transfer.',
      );
    } catch (err) {
      toast('error', 'Gagal menyimpan komunitas', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await saveNotificationSettings(notifForm);
      toast('success', 'Pengaturan Notifikasi Tersimpan');
    } catch (err) {
      toast('error', 'Gagal menyimpan notifikasi', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const configured = Boolean(
        bankForm.bankName.trim() && bankForm.accountNumber.trim() && bankForm.accountHolder.trim(),
      );
      await saveBankSettings({
        ...bankForm,
        isConfigured: configured,
      });
      toast(
        'success',
        'Pengaturan Rekening Tersimpan',
        configured
          ? 'Informasi transfer bank kini aktif tampil pada Step 3 pendaftaran.'
          : 'Rekening dikosongkan. Peserta akan melihat pemberitahuan bahwa rekening belum dikonfigurasi.',
      );
    } catch (err) {
      toast('error', 'Gagal menyimpan rekening', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleRetryNotification = async (log: NotificationLog) => {
    if (retryingLogId) return;
    setRetryingLogId(log.id);
    try {
      const headers = await getAdminAuthHeaders();
      const resp = await fetch('/api/notifications/retry', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: log.channel,
          recipient: log.recipient,
          subject: log.subject,
          payloadSummary: log.payloadSummary,
        }),
      });
      const outcome = (await resp.json()) as {
        status: 'sent' | 'failed' | 'unconfigured';
        attempts: number;
        errorMessage: string;
      };
      await updateDoc(doc(db, 'notification_logs', log.id), {
        status: outcome.status,
        attempts: (log.attempts || 0) + Math.max(1, outcome.attempts || 0),
        errorMessage: outcome.errorMessage || '',
        updatedAt: serverTimestamp(),
      });
      toast(
        outcome.status === 'sent' ? 'success' : 'info',
        outcome.status === 'sent' ? 'Notifikasi berhasil dikirim ulang' : `Status: ${outcome.status}`,
        outcome.errorMessage || undefined,
      );
    } catch (err) {
      toast('error', 'Gagal mengirim ulang notifikasi', err instanceof Error ? err.message : undefined);
    } finally {
      setRetryingLogId(null);
    }
  };

  if (section === 'komunitas') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Pengaturan Komunitas</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Link komunitas WhatsApp bersifat privat dan tidak pernah tampil di halaman publik
          </p>
        </div>

        <form onSubmit={handleSaveCommunity} className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            <span>
              Tautan ini hanya dikirim dari server kepada peserta pada halaman sukses pendaftaran
              segera setelah bukti transfer berhasil diunggah.
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Nama Komunitas</label>
            <input
              type="text"
              required
              value={commForm.communityName}
              onChange={(e) => setCommForm({ ...commForm, communityName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Link Undangan Grup / Komunitas WhatsApp (HTTPS)
            </label>
            <input
              type="url"
              value={commForm.whatsappInviteUrl}
              onChange={(e) => setCommForm({ ...commForm, whatsappInviteUrl: e.target.value })}
              placeholder="https://chat.whatsapp.com/..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Deskripsi Komunitas</label>
            <textarea
              rows={3}
              value={commForm.description}
              onChange={(e) => setCommForm({ ...commForm, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={commForm.isActive}
              onChange={(e) => setCommForm({ ...commForm, isActive: e.target.checked })}
              className="h-4 w-4 rounded accent-slate-900"
            />
            <span>Aktifkan tombol gabung komunitas pada halaman sukses pendaftaran</span>
          </label>

          <div className="border-t border-slate-200 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Simpan Pengaturan Komunitas</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (section === 'notifikasi') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Notifikasi Otomatis</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Status integrasi server-side Resend Email & WhatsApp Business API, template pesan, dan riwayat pengiriman
          </p>
        </div>

        {/* Live Integration Status */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[integrationStatus.email, integrationStatus.whatsapp].map((srv) => (
            <div key={srv.provider} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm font-semibold text-slate-900">{srv.provider}</p>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                    srv.connected ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {srv.connected ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ShieldAlert className="h-4 w-4" />
                  )}
                  <span>{srv.statusLabel}</span>
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {srv.connected
                  ? 'Kredensial server terdeteksi. Pengiriman otomatis aktif saat peserta mengunggah bukti transfer atau diverifikasi Lunas.'
                  : 'Tambahkan environment variable pada server (lihat README.md) untuk mengaktifkan pengiriman otomatis.'}
              </p>
            </div>
          ))}
        </div>

        {/* Templates Form */}
        <form onSubmit={handleSaveNotifications} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
            <Bell className="h-4 w-4 text-indigo-600" />
            <span>Penerima & Template Pesan</span>
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Email Admin Penerima Notifikasi</label>
              <input
                type="email"
                value={notifForm.adminEmail}
                onChange={(e) => setNotifForm({ ...notifForm, adminEmail: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">WhatsApp Admin</label>
              <input
                type="text"
                value={notifForm.adminWhatsapp}
                onChange={(e) => setNotifForm({ ...notifForm, adminWhatsapp: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Template Email Peserta (Bukti Diterima)</label>
              <textarea
                rows={3}
                value={notifForm.participantEmailTemplate}
                onChange={(e) =>
                  setNotifForm({ ...notifForm, participantEmailTemplate: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Template WhatsApp Admin (Pendaftaran Baru)</label>
              <textarea
                rows={4}
                value={notifForm.adminWhatsappTemplate}
                onChange={(e) =>
                  setNotifForm({ ...notifForm, adminWhatsappTemplate: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Template Email Konfirmasi Lunas</label>
              <textarea
                rows={3}
                value={notifForm.verifiedEmailTemplate}
                onChange={(e) =>
                  setNotifForm({ ...notifForm, verifiedEmailTemplate: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>Simpan Template Notifikasi</span>
          </button>
        </form>

        {/* Delivery History */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Riwayat Pengiriman Notifikasi
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Waktu</th>
                  <th className="px-4 py-3">Kanal</th>
                  <th className="px-4 py-3">Penerima</th>
                  <th className="px-4 py-3">Registrasi</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {notificationLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      Belum ada riwayat notifikasi tercatat.
                    </td>
                  </tr>
                ) : (
                  notificationLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-3 font-mono text-slate-500 whitespace-nowrap">
                        {formatTimestampID(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{log.channel}</td>
                      <td className="px-4 py-3 text-slate-600">{log.recipient}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{log.registrationNumber}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            log.status === 'sent'
                              ? 'text-emerald-700'
                              : log.status === 'unconfigured'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                          }`}
                        >
                          {log.status === 'sent'
                            ? 'Terkirim'
                            : log.status === 'unconfigured'
                              ? 'Belum Terhubung'
                              : 'Gagal'}
                        </span>
                        {log.errorMessage && (
                          <span className="block max-w-xs truncate text-[11px] text-slate-500">
                            {log.errorMessage}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {log.status !== 'sent' && (
                          <button
                            type="button"
                            disabled={retryingLogId === log.id}
                            onClick={() => handleRetryNotification(log)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Kirim Ulang</span>
                          </button>
                        )}
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

  // Pengaturan Pembayaran (Rekening Bank Langsung)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Pengaturan Pembayaran</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Konfigurasi rekening transfer bank pribadi resmi yang ditampilkan pada halaman pembayaran peserta
        </p>
      </div>

      <form onSubmit={handleSaveBank} className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
          <Building className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
          <span>
            SAKITA menggunakan transfer bank langsung (tanpa payment gateway atau virtual account).
            Apabila kolom rekening dikosongkan, peserta akan melihat pemberitahuan bahwa rekening
            belum dikonfigurasi.
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">Nama Bank</label>
            <input
              type="text"
              value={bankForm.bankName}
              onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
              placeholder="Contoh: Bank Syariah Indonesia (BSI)"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Nomor Rekening</label>
            <input
              type="text"
              value={bankForm.accountNumber}
              onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
              placeholder="Masukkan nomor rekening resmi"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Nama Pemilik Rekening</label>
            <input
              type="text"
              value={bankForm.accountHolder}
              onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
              placeholder="Nama pemilik rekening sesuai buku tabungan"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Instruksi Transfer</label>
            <textarea
              rows={4}
              value={bankForm.transferInstructions}
              onChange={(e) => setBankForm({ ...bankForm, transferInstructions: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Simpan Pengaturan Rekening</span>
          </button>
        </div>
      </form>
    </div>
  );
}
