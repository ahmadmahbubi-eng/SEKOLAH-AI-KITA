import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Globe,
  GraduationCap,
  ImageIcon,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageCircle,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { CountdownTimer } from '../components/landing/CountdownTimer';
import { HeroDashboardPreview } from '../components/landing/HeroDashboardPreview';
import { LegalModal } from '../components/landing/LegalModal';
import { DEFAULT_PROGRAM, DEFAULT_WEBSITE_SETTINGS } from '../lib/defaults';
import { computeRemainingSeats, formatRupiah, toWhatsappLink } from '../lib/format';
import { fetchPublicPrograms, fetchWebsiteSettings } from '../lib/sakitaService';
import type { Program, WebsiteSettings } from '../types';

interface LandingPageProps {
  navigate: (path: string) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UserPlus,
  Wallet,
  BookOpen,
  ClipboardCheck,
  CalendarCheck,
  BookMarked,
  Building2,
  Utensils,
  LayoutDashboard,
  Globe,
};

const PROBLEMS = [
  {
    title: 'Biaya pembuatan aplikasi yang mahal',
    detail: 'Pengembangan sistem sekolah khusus melalui vendor sering kali membutuhkan anggaran puluhan hingga ratusan juta rupiah.',
  },
  {
    title: 'Ketergantungan terhadap vendor eksternal',
    detail: 'Setiap perubahan kebutuhan administrasi harus menunggu antrean vendor dengan biaya pemeliharaan berkelanjutan.',
  },
  {
    title: 'Administrasi lembaga masih manual',
    detail: 'Pencatatan PPDB, SPP, absensi, dan laporan bulanan di kertas atau file terpisah menyita waktu staf setiap pekan.',
  },
  {
    title: 'Data pendidikan belum terintegrasi',
    detail: 'Data akademik, keuangan, kepengasuhan asrama, dan tahfidz tersebar di berbagai divisi tanpa satu sumber data.',
  },
  {
    title: 'Keterbatasan tenaga IT internal',
    detail: 'Banyak sekolah dan pesantren unggulan belum memiliki tim programmer penuh waktu untuk membangun sistem digital sendiri.',
  },
  {
    title: 'Sulit memantau perkembangan lembaga',
    detail: 'Pimpinan membutuhkan waktu lama untuk menghimpun laporan aktual sebelum mengambil keputusan strategis.',
  },
];

const TARGET_AUDIENCE = [
  { role: 'Kepala Sekolah', desc: 'Merancang modernisasi layanan akademik dan tata kelola unit sekolah.' },
  { role: 'Pimpinan Pesantren', desc: 'Mengintegrasikan administrasi santri, tahfidz, asrama, dan kepengasuhan.' },
  { role: 'Ketua Yayasan', desc: 'Memantau keuangan, pertumbuhan unit, dan efisiensi anggaran teknologi.' },
  { role: 'Pengelola Lembaga Pendidikan', desc: 'Membangun kemandirian sistem digital yang relevan dengan kebutuhan internal.' },
  { role: 'Guru dan Ustadz/Ustadzah', desc: 'Mempermudah pencatatan nilai, ujian digital, absensi, dan setoran hafalan.' },
  { role: 'Operator dan Tenaga Administrasi', desc: 'Mengotomatisasi alur PPDB, pencatatan SPP, dan pelaporan operasional.' },
];

export function LandingPage({ navigate }: LandingPageProps) {
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [programs, setPrograms] = useState<Program[]>([DEFAULT_PROGRAM]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(DEFAULT_PROGRAM.id);
  const [hasLiveDbProgram, setHasLiveDbProgram] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [legalDialog, setLegalDialog] = useState<'privacy' | 'terms' | null>(null);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [webSettings, dbPrograms] = await Promise.all([
          fetchWebsiteSettings(),
          fetchPublicPrograms(),
        ]);
        if (!active) return;
        setSettings(webSettings);
        const visiblePrograms = dbPrograms.filter((p) => p.status !== 'archived');
        if (visiblePrograms.length > 0) {
          setPrograms(visiblePrograms);
          setHasLiveDbProgram(true);
          const featured = visiblePrograms.find((p) => p.isFeatured) || visiblePrograms[0];
          setSelectedProgramId(featured.id);
        }
      } catch (err) {
        console.warn('Menggunakan konten bawaan sementara:', err);
      }
    }
    void loadData();
    return () => {
      active = false;
    };
  }, []);

  const activeProgram = programs.find((p) => p.id === selectedProgramId) || programs[0] || DEFAULT_PROGRAM;
  const remainingSeats = computeRemainingSeats(
    activeProgram.quota,
    activeProgram.confirmedCount,
    activeProgram.reservedCount,
  );
  const isProgramFull = remainingSeats <= 0;
  const isProgramClosed = activeProgram.status !== 'open';
  const waLink = toWhatsappLink(
    settings.whatsappNumber || '085769427335',
    `Halo Admin SAKITA, saya ingin bertanya mengenai program ${activeProgram.name}.`,
  );

  const projects = settings.projects?.length ? settings.projects : DEFAULT_WEBSITE_SETTINGS.projects;
  const facilities = activeProgram.facilities?.length ? activeProgram.facilities : settings.facilities;
  const faqs = settings.faqs?.length ? settings.faqs : DEFAULT_WEBSITE_SETTINGS.faqs;

  const showMentorSection = Boolean(
    settings.mentor && settings.mentor.enabled && settings.mentor.name.trim().length > 0,
  );

  const goToRegister = (programId?: string) => {
    const target = programId || activeProgram.id;
    navigate(`/daftar?program=${encodeURIComponent(target)}`);
  };

  return (
    <div id="beranda" className="min-h-screen bg-[#080F1D] text-[#F8FAFC]">
      {/* =====================================================================
          TOP NAVIGATION (Strict 3-Zone Contract, Sticky, Responsive)
         ===================================================================== */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#080F1D]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <a href="#beranda" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] rounded-lg">
            <BrandMark logoUrl={settings.logoUrl} brandName={settings.brandName || 'SAKITA'} variant="dark" />
          </a>

          <nav aria-label="Navigasi Utama" className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#94A3B8]">
            <a href="#beranda" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#F8FAFC]">
              Beranda
            </a>
            <a href="#tentang" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#F8FAFC]">
              Tentang SAKITA
            </a>
            <a href="#program" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#F8FAFC]">
              Program Pelatihan
            </a>
            <a href="#materi" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#F8FAFC]">
              Materi
            </a>
            <a href="#fasilitas" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#F8FAFC]">
              Fasilitas
            </a>
            <a href="#faq" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#F8FAFC]">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => goToRegister()}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#22D3EE] px-4 text-sm font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90 whitespace-nowrap shrink-0"
            >
              Daftar Sekarang
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Buka menu navigasi"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 text-[#F8FAFC] lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-800 bg-[#0F172A] px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-1 text-sm font-medium text-[#F8FAFC]">
              {[
                { href: '#beranda', label: 'Beranda' },
                { href: '#tentang', label: 'Tentang SAKITA' },
                { href: '#program', label: 'Program Pelatihan' },
                { href: '#materi', label: 'Materi' },
                { href: '#fasilitas', label: 'Fasilitas' },
                { href: '#faq', label: 'FAQ' },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-[#F8FAFC]"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* ===================================================================
            A. HERO SECTION
           =================================================================== */}
        <section className="relative overflow-hidden border-b border-slate-800/80 sakita-grid-bg">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-[#6366F1]/12 via-[#22D3EE]/5 to-transparent"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
            <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Left Copy Column */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col justify-center lg:col-span-6"
              >
                <p className="font-mono text-xs font-medium tracking-[0.14em] text-[#22D3EE]">
                  {settings.heroEyebrow || 'INTENSIVE AI BOOTCAMP 2026'}
                </p>

                <h1
                  className="mt-4 font-display font-bold tracking-tight text-[#F8FAFC] [text-wrap:balance]"
                  style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.5rem)', lineHeight: 1.1 }}
                >
                  {settings.heroHeadline}
                </h1>

                <p className="mt-5 font-display text-lg font-medium text-[#22D3EE] sm:text-xl [text-wrap:balance]">
                  {settings.heroSubheadline}
                </p>

                <p className="mt-5 max-w-xl text-base leading-relaxed text-[#94A3B8]">
                  {settings.heroDescription}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => goToRegister()}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#22D3EE] px-6 text-sm font-semibold text-[#080F1D] transition-all hover:bg-[#22D3EE]/90 whitespace-nowrap shrink-0"
                  >
                    <span>{isProgramFull ? 'Masuk Daftar Tunggu' : 'Daftar Sekarang'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href="#program"
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 bg-[#0F172A]/80 px-6 text-sm font-semibold text-[#F8FAFC] transition-colors hover:border-slate-500 hover:bg-[#0F172A] whitespace-nowrap shrink-0"
                  >
                    Lihat Program Pelatihan
                  </a>
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#94A3B8]">
                  <span>{activeProgram.dateLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeProgram.location}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#F8FAFC] font-medium">
                    {settings.brandSubtitle || 'SEKOLAH AI KITA'}
                  </span>
                </div>
              </motion.div>

              {/* Right Visual Column */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-6"
              >
                {settings.bannerUrl ? (
                  <div className="relative h-full min-h-[360px] overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A]">
                    <img
                      src={settings.bannerUrl}
                      alt="Banner Program Sekolah AI Kita"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080F1D]/90 via-[#080F1D]/40 to-transparent p-5">
                      <p className="text-xs font-medium text-[#F8FAFC]">
                        Ilustrasi Program — {activeProgram.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <HeroDashboardPreview />
                )}
              </motion.div>
            </div>

            {/* Three Key Statistics Strip (Full-Width Row Below Split) */}
            <div className="mt-14 grid grid-cols-1 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-[#0F172A]/90 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="p-6 sm:p-7">
                <p className="font-mono text-2xl font-bold text-[#F8FAFC] tabular-nums sm:text-3xl">
                  4 HARI
                </p>
                <p className="mt-1 text-sm font-medium text-[#94A3B8]">Praktik Intensif</p>
              </div>
              <div className="p-6 sm:p-7">
                <p className="font-mono text-2xl font-bold text-[#22D3EE] tabular-nums sm:text-3xl">
                  {activeProgram.projectCount} PROYEK
                </p>
                <p className="mt-1 text-sm font-medium text-[#94A3B8]">Aplikasi Digital</p>
              </div>
              <div className="p-6 sm:p-7">
                <p className="font-mono text-2xl font-bold text-[#F8FAFC] tabular-nums sm:text-3xl">
                  {activeProgram.quota} PESERTA
                </p>
                <p className="mt-1 text-sm font-medium text-[#94A3B8]">Kelas Eksklusif</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            B. PROBLEM & SOLUTION SECTION
           =================================================================== */}
        <section id="tentang" className="border-b border-slate-800/80 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-medium tracking-wide text-[#22D3EE]">
                Tantangan & Pendekatan SAKITA
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl [text-wrap:balance]">
                Teknologi Tidak Harus Mahal dan Rumit.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#94A3B8]">
                Banyak pengelola sekolah dan pesantren memiliki visi besar untuk menata lembaga secara
                modern, namun terhambat oleh biaya pengembangan perangkat lunak dan keterbatasan teknis.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
                {PROBLEMS.map((item, idx) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-slate-800 bg-[#0F172A]/70 p-5"
                  >
                    <p className="font-mono text-xs text-[#94A3B8] tabular-nums">
                      0{idx + 1}
                    </p>
                    <h3 className="mt-2 font-display text-base font-semibold text-[#F8FAFC]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{item.detail}</p>
                  </div>
                ))}
              </div>

              {/* Solution Column */}
              <div className="flex flex-col justify-between rounded-2xl border border-[#22D3EE]/25 bg-gradient-to-b from-[#0F172A] to-[#080F1D] p-7 lg:col-span-5">
                <div>
                  <p className="text-xs font-medium text-[#22D3EE]">Pendekatan Praktis dengan AI</p>
                  <h3 className="mt-3 font-display text-2xl font-bold leading-snug text-[#F8FAFC]">
                    Belajar Membangun Solusi Digital Secara Mandiri dan Bertahap
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">
                    Dengan kecerdasan buatan (AI), pengelola pendidikan dapat menerjemahkan alur kerja
                    sekolah dan pesantren menjadi rancangan aplikasi nyata menggunakan bahasa sehari-hari—tanpa
                    harus memulai dari nol sebagai programmer.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-[#F8FAFC]">
                    {[
                      'Memahami cara merancang alur data sekolah dan pesantren secara sistematis.',
                      'Mempraktikkan langsung pembuatan 10 fondasi proyek aplikasi menggunakan alat bantu AI.',
                      'Mampu menyesuaikan dan mengembangkan fitur secara mandiri setelah pelatihan selesai.',
                      'Terhubung dengan komunitas praktisi pengelola pendidikan untuk pendampingan lanjutan.',
                    ].map((point) => (
                      <li key={point} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                        <span className="text-[#94A3B8]">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-8 border-t border-slate-800 pt-4 text-xs leading-relaxed text-[#94A3B8]">
                  Catatan jujur: Dalam 4 hari intensif, peserta dibimbing membangun prototipe fungsional
                  dan pola kerja untuk 10 proyek aplikasi yang dapat terus disempurnakan sesuai kebutuhan
                  operasional masing-masing lembaga.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            C. TENTANG PROGRAM
           =================================================================== */}
        <section id="program" className="border-b border-slate-800/80 bg-[#0F172A]/40 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="text-xs font-medium tracking-wide text-[#22D3EE]">Tentang Program</p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl [text-wrap:balance]">
                  Bukan Sekadar Belajar AI. Saatnya Menciptakan Solusi Nyata.
                </h2>
                <p className="mt-6 text-base leading-relaxed text-[#94A3B8]">
                  Ini bukan seminar yang hanya membuat peserta duduk mendengarkan teori. Peserta akan
                  dibimbing secara intensif untuk mempraktikkan pembuatan berbagai proyek aplikasi
                  digital yang dapat dikembangkan untuk kebutuhan lembaga pendidikan masing-masing.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-7 lg:col-span-5">
                <p className="font-mono text-xs text-[#22D3EE]">{activeProgram.batchLabel}</p>
                <h3 className="mt-2 font-display text-xl font-bold uppercase tracking-tight text-[#F8FAFC]">
                  {activeProgram.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
                  {activeProgram.description}
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-5 text-sm">
                  <span className="text-[#94A3B8]">Durasi Program</span>
                  <span className="font-semibold text-[#F8FAFC]">{activeProgram.durationLabel}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-[#94A3B8]">Fokus Praktik</span>
                  <span className="font-semibold text-[#F8FAFC]">
                    {activeProgram.projectCount} Proyek Aplikasi Digital
                  </span>
                </div>
              </div>
            </div>

            {/* Multi-program selector if admin added more programs */}
            {programs.length > 1 && (
              <div className="mt-10 border-t border-slate-800 pt-8">
                <p className="text-xs font-medium text-[#94A3B8]">Pilih Program / Angkatan Tersedia</p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {programs.map((prog) => {
                    const active = prog.id === activeProgram.id;
                    return (
                      <button
                        key={prog.id}
                        type="button"
                        onClick={() => setSelectedProgramId(prog.id)}
                        className={`rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                          active
                            ? 'border-[#22D3EE] bg-[#22D3EE]/10 text-[#F8FAFC]'
                            : 'border-slate-800 bg-[#0F172A] text-[#94A3B8] hover:border-slate-700 hover:text-[#F8FAFC]'
                        }`}
                      >
                        <span className="block font-semibold">{prog.name}</span>
                        <span className="mt-0.5 block text-xs text-[#94A3B8]">
                          {prog.dateLabel} · {prog.location}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ===================================================================
            D. 10 PROYEK APLIKASI DIGITAL
           =================================================================== */}
        <section id="materi" className="border-b border-slate-800/80 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-medium tracking-wide text-[#22D3EE]">Kurikulum Praktik</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl [text-wrap:balance]">
                10 Proyek Aplikasi Digital yang Dipraktikkan
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#94A3B8]">
                Setiap modul dirancang langsung dari kebutuhan operasional nyata sekolah dan pesantren
                di Indonesia.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
              {projects.map((project, index) => {
                const Icon = ICON_MAP[project.icon] || LayoutDashboard;
                const num = project.number || String(index + 1).padStart(2, '0');
                return (
                  <div
                    key={`${num}-${project.title}`}
                    className="group rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6 transition-colors hover:border-[#22D3EE]/35"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-[#080F1D] text-[#22D3EE]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-mono text-sm font-semibold text-[#94A3B8] tabular-nums">
                        {num}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold text-[#F8FAFC]">
                      {num}. {project.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
                      {project.description}
                    </p>
                    <p className="mt-4 border-t border-slate-800/80 pt-3 text-xs leading-relaxed text-[#F8FAFC]/85">
                      <span className="font-semibold text-[#10B981]">Manfaat: </span>
                      {project.benefit}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            E. TARGET PESERTA
           =================================================================== */}
        <section className="border-b border-slate-800/80 bg-[#0F172A]/35 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-medium tracking-wide text-[#22D3EE]">Target Peserta</p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl">
                  Dirancang untuk Pengambil Keputusan & Penggerak Lembaga
                </h2>
              </div>
              <div className="rounded-xl border border-[#22D3EE]/25 bg-[#080F1D] px-5 py-3.5 text-sm font-medium text-[#F8FAFC]">
                Tidak harus memiliki latar belakang IT atau pengalaman coding.
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TARGET_AUDIENCE.map((item) => (
                <div
                  key={item.role}
                  className="rounded-xl border border-slate-800 bg-[#0F172A]/80 p-6"
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-5 w-5 text-[#22D3EE] shrink-0" />
                    <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
                      {item.role}
                    </h3>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================================
            F. PROFIL MENTOR (Hidden automatically when not configured by admin)
           =================================================================== */}
        {showMentorSection && (
          <section className="border-b border-slate-800/80 py-20 lg:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <p className="text-xs font-medium tracking-wide text-[#22D3EE]">Profil Mentor</p>
              <div className="mt-6 grid grid-cols-1 items-center gap-8 rounded-2xl border border-slate-800 bg-[#0F172A] p-7 lg:grid-cols-12 lg:p-10">
                <div className="lg:col-span-4">
                  {settings.mentor.photoUrl ? (
                    <img
                      src={settings.mentor.photoUrl}
                      alt={settings.mentor.name}
                      referrerPolicy="no-referrer"
                      className="aspect-[4/4] w-full rounded-xl object-cover border border-slate-800"
                    />
                  ) : (
                    <div className="flex aspect-square w-full flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#080F1D] text-[#94A3B8]">
                      <UserCheck className="h-10 w-10 text-[#22D3EE]/60" />
                      <span className="mt-2 text-xs">Foto mentor belum diunggah</span>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-8">
                  <h2 className="font-display text-2xl font-bold text-[#F8FAFC] sm:text-3xl">
                    {settings.mentor.name}
                  </h2>
                  {settings.mentor.role && (
                    <p className="mt-1.5 text-sm font-medium text-[#22D3EE]">
                      {settings.mentor.role}
                    </p>
                  )}
                  {settings.mentor.experience && (
                    <p className="mt-3 text-sm font-medium text-[#F8FAFC]/90">
                      {settings.mentor.experience}
                    </p>
                  )}
                  {settings.mentor.bio && (
                    <p className="mt-4 text-sm leading-relaxed text-[#94A3B8] whitespace-pre-line">
                      {settings.mentor.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================
            G. JADWAL, LOKASI & GALERI HOTEL
           =================================================================== */}
        <section id="jadwal" className="border-b border-slate-800/80 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <p className="text-xs font-medium tracking-wide text-[#22D3EE]">Jadwal & Lokasi</p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl">
                  Pelaksanaan Tatap Muka yang Fokus & Kondusif
                </h2>

                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
                    <Calendar className="h-5 w-5 text-[#22D3EE]" />
                    <p className="mt-3 text-xs text-[#94A3B8]">Tanggal Pelaksanaan</p>
                    <p className="mt-1 font-display text-base font-semibold text-[#F8FAFC]">
                      {activeProgram.dateLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
                    <Clock className="h-5 w-5 text-[#22D3EE]" />
                    <p className="mt-3 text-xs text-[#94A3B8]">Durasi</p>
                    <p className="mt-1 font-display text-base font-semibold text-[#F8FAFC]">
                      {activeProgram.durationLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
                    <MapPin className="h-5 w-5 text-[#22D3EE]" />
                    <p className="mt-3 text-xs text-[#94A3B8]">Lokasi</p>
                    <p className="mt-1 font-display text-base font-semibold text-[#F8FAFC]">
                      {activeProgram.location}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
                    <Users className="h-5 w-5 text-[#22D3EE]" />
                    <p className="mt-3 text-xs text-[#94A3B8]">Kuota Kelas</p>
                    <p className="mt-1 font-display text-base font-semibold text-[#F8FAFC] tabular-nums">
                      Maksimal {activeProgram.quota} Peserta
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <CountdownTimer targetIso={activeProgram.startDateIso || '2026-12-21T08:00:00+07:00'} />
                </div>
              </div>

              {/* Hotel Gallery (Admin Uploadable, Neutral Placeholder Before Upload) */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0F172A] p-6 lg:col-span-6">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-[#F8FAFC]">
                      Galeri Lokasi — {activeProgram.location}
                    </h3>
                    <span className="text-xs text-[#94A3B8]">
                      {settings.hotelGallery.length > 0
                        ? `${settings.hotelGallery.length} foto`
                        : 'Menunggu foto resmi'}
                    </span>
                  </div>

                  {settings.hotelGallery.length > 0 ? (
                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {settings.hotelGallery.map((photo, idx) => (
                        <figure
                          key={`${photo.url}-${idx}`}
                          className="overflow-hidden rounded-xl border border-slate-800 bg-[#080F1D]"
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption || `Foto ${activeProgram.location}`}
                            referrerPolicy="no-referrer"
                            className="aspect-[4/3] w-full object-cover"
                          />
                          {photo.caption && (
                            <figcaption className="px-3 py-2 text-xs text-[#94A3B8]">
                              {photo.caption}
                            </figcaption>
                          )}
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {['Ruang Pelatihan & Auditorium', 'Akomodasi Kamar Peserta', 'Area Diskusi & Kolaborasi', 'Fasilitas Hotel Grand Makmur'].map(
                        (slotLabel) => (
                          <div
                            key={slotLabel}
                            className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/80 bg-[#080F1D]/70 p-4 text-center"
                          >
                            <ImageIcon className="h-6 w-6 text-slate-600" />
                            <p className="mt-2.5 text-xs font-medium text-[#94A3B8]">{slotLabel}</p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Placeholder netral · Foto asli dikelola admin
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                <p className="mt-5 border-t border-slate-800 pt-4 text-xs leading-relaxed text-[#94A3B8]">
                  Seluruh dokumentasi ruang pelatihan dan akomodasi Hotel Grand Makmur, Jambi
                  diunggah langsung oleh tim administrasi Sekolah AI Kita.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            H. INVESTASI PENDIDIKAN & FASILITAS
           =================================================================== */}
        <section id="fasilitas" className="border-b border-slate-800/80 bg-[#0F172A]/40 py-20 lg:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-medium tracking-wide text-[#22D3EE]">
                Investasi Pendidikan & Fasilitas
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl">
                Satu Investasi untuk Kemandirian Digital Lembaga
              </h2>
            </div>

            <div className="mt-12 rounded-2xl border border-[#22D3EE]/30 bg-[#0F172A] p-7 sm:p-10">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <div className="flex flex-col justify-between lg:col-span-6 lg:border-r lg:border-slate-800 lg:pr-8">
                  <div>
                    <p className="text-xs font-medium text-[#94A3B8]">{activeProgram.name}</p>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="font-mono text-4xl font-bold tracking-tight text-[#F8FAFC] tabular-nums sm:text-5xl">
                        {formatRupiah(activeProgram.price)}
                      </span>
                      <span className="text-sm text-[#94A3B8]">/ peserta</span>
                    </div>

                    {/* Actual Database Quota Display */}
                    <div className="mt-6 rounded-xl border border-slate-800 bg-[#080F1D] p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#94A3B8]">Status Kuota Aktual</span>
                        <span
                          className={`font-semibold ${
                            isProgramClosed || isProgramFull ? 'text-amber-400' : 'text-[#10B981]'
                          }`}
                        >
                          {isProgramClosed
                            ? 'Pendaftaran Ditutup'
                            : isProgramFull
                              ? 'Pendaftaran Penuh'
                              : `Tersedia ${remainingSeats} dari ${activeProgram.quota} kursi`}
                        </span>
                      </div>
                      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#6366F1] transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                ((activeProgram.confirmedCount + activeProgram.reservedCount) /
                                  Math.max(1, activeProgram.quota)) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#94A3B8] tabular-nums">
                        <span>Terverifikasi Lunas: {activeProgram.confirmedCount}</span>
                        <span>Reservasi Menunggu: {activeProgram.reservedCount}</span>
                      </div>
                      {!hasLiveDbProgram && (
                        <p className="mt-2 text-[11px] text-slate-500">
                          Menampilkan kuota awal program sebelum sinkronisasi admin pertama.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      type="button"
                      disabled={isProgramClosed}
                      onClick={() => goToRegister()}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#22D3EE] px-6 text-sm font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>
                        {isProgramClosed
                          ? 'Pendaftaran Ditutup'
                          : isProgramFull
                            ? 'Daftar Tunggu Tanpa Transfer'
                            : 'Amankan Kursi Anda'}
                      </span>
                      {!isProgramClosed && <ArrowRight className="h-4 w-4" />}
                    </button>
                    <p className="mt-3 text-center text-xs text-[#94A3B8]">
                      Pembayaran melalui transfer bank langsung · Verifikasi resmi oleh admin SAKITA
                    </p>
                  </div>
                </div>

                {/* Facilities Checklist */}
                <div className="lg:col-span-6">
                  <h3 className="font-display text-lg font-semibold text-[#F8FAFC]">
                    Fasilitas Lengkap yang Anda Dapatkan
                  </h3>
                  <ul className="mt-5 space-y-3.5">
                    {facilities.map((fac) => (
                      <li key={fac} className="flex items-start gap-3 text-sm text-[#F8FAFC]">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#10B981]/15 text-[#10B981]">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span>{fac}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-7 flex items-start gap-3 rounded-xl border border-slate-800 bg-[#080F1D]/70 p-4 text-xs leading-relaxed text-[#94A3B8]">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#22D3EE]" />
                    <span>
                      Akses Komunitas Sekolah AI Kita langsung terbuka setelah Anda mengunggah bukti
                      transfer pada halaman pendaftaran.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            I. FAQ ACCORDION
           =================================================================== */}
        <section id="faq" className="border-b border-slate-800/80 py-20 lg:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-medium tracking-wide text-[#22D3EE]">Pertanyaan Umum</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl">
                Hal yang Sering Ditanyakan Calon Peserta
              </h2>
            </div>

            <div className="mt-12 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-[#0F172A]/70">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={faq.question}>
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      <span className="font-display text-base font-semibold text-[#F8FAFC]">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-[#94A3B8] transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#22D3EE]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 text-sm leading-relaxed text-[#94A3B8]">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            J. FINAL CALL TO ACTION
           =================================================================== */}
        <section className="py-20 lg:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#6366F1]/15 p-8 text-center sm:p-14">
              <h2 className="mx-auto max-w-3xl font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl [text-wrap:balance]">
                Jangan Hanya Menjadi Pengguna Teknologi. Jadilah Pencipta Solusi.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#94A3B8]">
                Di era AI, kemajuan lembaga pendidikan tidak selalu ditentukan oleh besarnya anggaran,
                tetapi juga oleh kemampuan pengelolanya untuk belajar dan beradaptasi.
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => goToRegister()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#22D3EE] px-7 text-sm font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90 whitespace-nowrap shrink-0"
                >
                  <span>Daftar Sekarang</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#080F1D] px-6 text-sm font-semibold text-[#F8FAFC] transition-colors hover:border-[#10B981]/60 hover:text-[#10B981] whitespace-nowrap shrink-0"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp {settings.whatsappNumber || '0857-6942-7335'}</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          K. FOOTER
         ===================================================================== */}
      <footer className="border-t border-slate-800 bg-[#080F1D] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
            <div>
              <BrandMark logoUrl={settings.logoUrl} brandName="SEKOLAH AI KITA (SAKITA)" variant="dark" />
              <p className="mt-3 text-sm text-[#94A3B8]">
                {settings.tagline || 'Belajar AI, Berkarya untuk Masa Depan.'}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                WhatsApp Resmi:{' '}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#94A3B8] hover:text-[#22D3EE]"
                >
                  {settings.whatsappNumber || '0857-6942-7335'}
                </a>
              </p>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#94A3B8]">
              <a href="#program" className="transition-colors hover:text-[#F8FAFC]">
                Informasi Pelatihan
              </a>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-[#F8FAFC]"
              >
                Hubungi Kami
              </a>
              <button
                type="button"
                onClick={() => setLegalDialog('privacy')}
                className="transition-colors hover:text-[#F8FAFC]"
              >
                Kebijakan Privasi
              </button>
              <button
                type="button"
                onClick={() => setLegalDialog('terms')}
                className="transition-colors hover:text-[#F8FAFC]"
              >
                Syarat dan Ketentuan
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/login')}
                className="transition-colors hover:text-[#22D3EE]"
              >
                Login Admin
              </button>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-800/80 pt-6 text-xs text-slate-500">
            © {new Date().getFullYear()} Sekolah AI Kita (SAKITA). Seluruh hak cipta dilindungi.
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button (Unobtrusive, positioned cleanly) */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Hubungi Admin SAKITA melalui WhatsApp"
        className="no-print fixed bottom-5 left-5 z-30 inline-flex h-11 items-center gap-2 rounded-full border border-[#10B981]/40 bg-[#0F172A]/95 px-4 text-xs font-semibold text-[#F8FAFC] shadow-lg backdrop-blur-md transition-colors hover:border-[#10B981] hover:text-[#10B981]"
      >
        <MessageCircle className="h-4 w-4 text-[#10B981]" />
        <span className="hidden sm:inline">Tanya Admin</span>
      </a>

      {/* Legal Modals */}
      <LegalModal
        open={legalDialog === 'privacy'}
        title="Kebijakan Privasi — Sekolah AI Kita (SAKITA)"
        content={settings.privacyPolicy}
        onClose={() => setLegalDialog(null)}
      />
      <LegalModal
        open={legalDialog === 'terms'}
        title="Syarat dan Ketentuan Pendaftaran"
        content={settings.termsConditions}
        onClose={() => setLegalDialog(null)}
      />
    </div>
  );
}
