import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  Bell,
  BookOpen,
  CheckSquare,
  ExternalLink,
  FileBarChart2,
  Globe,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquareHeart,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { AdminFinanceReports } from '../components/admin/AdminFinanceReports';
import { AdminOverview } from '../components/admin/AdminOverview';
import { AdminParticipants } from '../components/admin/AdminParticipants';
import { AdminPrograms } from '../components/admin/AdminPrograms';
import { AdminSettingsPanels } from '../components/admin/AdminSettingsPanels';
import { AdminVerification } from '../components/admin/AdminVerification';
import { AdminWebsiteCMS } from '../components/admin/AdminWebsiteCMS';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_BANK_SETTINGS,
  DEFAULT_COMMUNITY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_WEBSITE_SETTINGS,
} from '../lib/defaults';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  AuditLog,
  BankSettings,
  CommunitySettings,
  NotificationLog,
  NotificationSettings,
  Payment,
  Program,
  Registration,
  WebsiteSettings,
} from '../types';

interface AdminDashboardPageProps {
  navigate: (path: string) => void;
}

type AdminSection =
  | 'overview'
  | 'peserta'
  | 'verifikasi'
  | 'keuangan'
  | 'komunitas'
  | 'program'
  | 'website'
  | 'notifikasi'
  | 'laporan'
  | 'pengaturan';

const SIDEBAR_ITEMS: Array<{
  id: AdminSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'peserta', label: 'Data Peserta', icon: Users },
  { id: 'verifikasi', label: 'Verifikasi Pembayaran', icon: CheckSquare },
  { id: 'keuangan', label: 'Keuangan', icon: Wallet },
  { id: 'komunitas', label: 'Komunitas', icon: MessageSquareHeart },
  { id: 'program', label: 'Program Pelatihan', icon: BookOpen },
  { id: 'website', label: 'Kelola Website', icon: Globe },
  { id: 'notifikasi', label: 'Notifikasi', icon: Bell },
  { id: 'laporan', label: 'Laporan', icon: FileBarChart2 },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
];

export function AdminDashboardPage({ navigate }: AdminDashboardPageProps) {
  const { user, isAdmin, loading, logout } = useAuth();
  const [section, setSection] = useState<AdminSection>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');

  const [programs, setPrograms] = useState<Program[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [bankSettings, setBankSettings] = useState<BankSettings>(DEFAULT_BANK_SETTINGS);
  const [communitySettings, setCommunitySettings] = useState<CommunitySettings>(DEFAULT_COMMUNITY_SETTINGS);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [loading, user, isAdmin, navigate]);

  // Attach real-time Firestore listeners ONLY after verified admin auth is ready
  useEffect(() => {
    if (loading || !user || !isAdmin) return;

    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        collection(db, 'programs'),
        (snap) => {
          setPrograms(snap.docs.map((d) => ({ ...(d.data() as Program), id: d.id })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'programs'),
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'registrations'), orderBy('createdAt', 'desc')),
        (snap) => {
          setRegistrations(snap.docs.map((d) => ({ ...(d.data() as Registration), id: d.id })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'registrations'),
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'payments'), orderBy('createdAt', 'desc')),
        (snap) => {
          setPayments(snap.docs.map((d) => ({ ...(d.data() as Payment), id: d.id })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'payments'),
      ),
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'website_settings', 'default'),
        (snap) => {
          if (snap.exists()) {
            setWebsiteSettings({ ...DEFAULT_WEBSITE_SETTINGS, ...(snap.data() as WebsiteSettings) });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'website_settings/default'),
      ),
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'bank_settings', 'default'),
        (snap) => {
          if (snap.exists()) {
            setBankSettings({ ...DEFAULT_BANK_SETTINGS, ...(snap.data() as BankSettings) });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'bank_settings/default'),
      ),
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'community_settings', 'default'),
        (snap) => {
          if (snap.exists()) {
            setCommunitySettings({ ...DEFAULT_COMMUNITY_SETTINGS, ...(snap.data() as CommunitySettings) });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'community_settings/default'),
      ),
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'notification_settings', 'default'),
        (snap) => {
          if (snap.exists()) {
            setNotificationSettings({
              ...DEFAULT_NOTIFICATION_SETTINGS,
              ...(snap.data() as NotificationSettings),
            });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'notification_settings/default'),
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'notification_logs'), orderBy('createdAt', 'desc')),
        (snap) => {
          setNotificationLogs(snap.docs.map((d) => d.data() as NotificationLog));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notification_logs'),
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc')),
        (snap) => {
          setAuditLogs(snap.docs.map((d) => d.data() as AuditLog));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs'),
      ),
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [loading, user, isAdmin]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-800">
        <Loader2 className="h-7 w-7 animate-spin text-slate-900" />
        <p className="mt-3 text-sm text-slate-500">Memuat SAKITA Command Center...</p>
      </div>
    );
  }

  const pendingVerificationCount = payments.filter(
    (p) => p.verificationStatus === 'menunggu_verifikasi',
  ).length;

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const currentNavLabel = SIDEBAR_ITEMS.find((item) => item.id === section)?.label || 'Overview';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div>
            <BrandMark logoUrl={websiteSettings.logoUrl} brandName="SAKITA" variant="light" />
            <p className="mt-0.5 font-mono text-[10px] font-semibold tracking-wider text-slate-400">
              COMMAND CENTER
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'verifikasi' && pendingVerificationCount > 0 && (
                  <span
                    className={`font-mono text-xs font-semibold tabular-nums ${
                      active ? 'text-[#22D3EE]' : 'text-amber-600'
                    }`}
                  >
                    {pendingVerificationCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 px-3 py-1.5">
            <p className="truncate text-xs font-semibold text-slate-900">
              {user.displayName || 'Administrator'}
            </p>
            <p className="truncate text-[11px] text-slate-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex w-64 max-w-[80vw] flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <span className="font-display text-base font-bold text-slate-900">
                SAKITA COMMAND CENTER
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSection(item.id);
                      setMobileOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu admin"
              className="rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="hidden text-slate-400 sm:inline">SAKITA Command Center</span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <span className="font-semibold text-slate-900 truncate">{currentNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <span>Lihat Landing Page</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            {section === 'overview' && (
              <AdminOverview
                programs={programs}
                selectedProgramId={selectedProgramId}
                onSelectProgram={setSelectedProgramId}
                registrations={registrations}
                payments={payments}
                onGoToSection={(s) => setSection(s as AdminSection)}
              />
            )}

            {section === 'peserta' && (
              <AdminParticipants programs={programs} registrations={registrations} />
            )}

            {section === 'verifikasi' && (
              <AdminVerification
                programs={programs}
                registrations={registrations}
                payments={payments}
              />
            )}

            {(section === 'keuangan' || section === 'laporan') && (
              <AdminFinanceReports
                mode={section}
                programs={programs}
                registrations={registrations}
                payments={payments}
                auditLogs={auditLogs}
              />
            )}

            {section === 'program' && (
              <AdminPrograms
                programs={programs}
                onPreviewProgram={(slug) => navigate(`/program/${encodeURIComponent(slug)}`)}
              />
            )}

            {section === 'website' && <AdminWebsiteCMS settings={websiteSettings} />}

            {(section === 'komunitas' || section === 'notifikasi' || section === 'pengaturan') && (
              <AdminSettingsPanels
                section={section}
                bankSettings={bankSettings}
                communitySettings={communitySettings}
                notificationSettings={notificationSettings}
                notificationLogs={notificationLogs}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
