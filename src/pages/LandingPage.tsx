import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Copy,
  FileCheck2,
  Globe,
  GraduationCap,
  ImageIcon,
  Landmark,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageCircle,
  Rocket,
  School,
  ShieldCheck,
  Sparkles,
  Store,
  UserCheck,
  UserPlus,
  Users,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { ResolvedAssetImage } from '../components/ResolvedAssetImage';
import { CountdownTimer } from '../components/landing/CountdownTimer';
import { HeroDashboardPreview } from '../components/landing/HeroDashboardPreview';
import { LegalModal } from '../components/landing/LegalModal';
import { TrainerProfileSection } from '../components/landing/TrainerProfileSection';
import { useToast } from '../context/ToastContext';
import {
  DEFAULT_PRIMARY_TRAINER,
  DEFAULT_PROGRAM,
  DEFAULT_WEBSITE_SETTINGS,
  PACKAGE_LEARNING_BENEFITS,
  TRAINING_PACKAGES,
  TRAINING_PACKAGE_LIST,
} from '../lib/defaults';
import { computeRemainingSeats, formatRupiah, toWhatsappLink } from '../lib/format';
import { trackMetaContact, trackMetaViewContent } from '../lib/metaPixel';
import { fetchPublicPrograms, fetchPublicTrainers, fetchWebsiteSettings } from '../lib/sakitaService';
import type { Program, TrainerProfile, TrainingPackageCode, WebsiteSettings } from '../types';

interface LandingPageProps {
  navigate: (path: string) => void;
  initialProgramSlug?: string;
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
  {
    role: 'Kepala Sekolah',
    icon: School,
    desc: 'Merancang modernisasi layanan akademik, tata kelola, dan dashboard pemantauan unit sekolah.',
  },
  {
    role: 'Pimpinan Pondok Pesantren',
    icon: Landmark,
    desc: 'Mengintegrasikan administrasi santri, tahfidz, asrama, layanan makan, dan kepengasuhan secara tertib.',
  },
  {
    role: 'Guru & Tenaga Pendidik',
    icon: GraduationCap,
    desc: 'Mempermudah pencatatan nilai, rapor, ujian digital, absensi, dan pendampingan belajar siswa.',
  },
  {
    role: 'Operator & Staf Administrasi',
    icon: ClipboardList,
    desc: 'Mengotomatisasi alur PPDB, pencatatan keuangan SPP, dan rekap pelaporan operasional harian.',
  },
  {
    role: 'Pengelola Yayasan Pendidikan',
    icon: Building2,
    desc: 'Menghadirkan kemandirian teknologi lintas unit pendidikan secara lebih efisien dan terukur.',
  },
  {
    role: 'Pengusaha & Pelaku UMKM',
    icon: Store,
    desc: 'Membangun aplikasi pendukung operasional usaha, pencatatan, dan layanan pelanggan dengan bantuan AI.',
  },
  {
    role: 'Calon Pengusaha Digital',
    icon: Rocket,
    desc: 'Mempelajari alur perancangan aplikasi dan wawasan pengembangan jasa maupun produk digital.',
  },
  {
    role: 'Pemula yang Ingin Menguasai AI',
    icon: Sparkles,
    desc: 'Belajar secara terstruktur dari dasar praktik tanpa perlu memiliki latar belakang IT atau coding.',
  },
];

const PARTICIPANT_DELIVERABLES: string[] = [
  'Keterampilan membangun aplikasi dengan bantuan AI.',
  'Pengalaman praktik langsung 10 proyek aplikasi digital.',
  'File proyek hasil praktik pelatihan.',
  'Pemahaman cara mempublikasikan aplikasi secara online.',
  'Kemampuan mengembangkan aplikasi sesuai kebutuhan lembaga.',
  'Wawasan membangun bisnis jasa pembuatan aplikasi.',
  'Wawasan memasarkan aplikasi sebagai produk digital.',
  'Akses Komunitas Sekolah AI Kita.',
];

export function LandingPage({ navigate, initialProgramSlug }: LandingPageProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [programs, setPrograms] = useState<Program[]>([DEFAULT_PROGRAM]);
  const [trainers, setTrainers] = useState<TrainerProfile[]>([DEFAULT_PRIMARY_TRAINER]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(DEFAULT_PROGRAM.id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [legalDialog, setLegalDialog] = useState<'privacy' | 'terms' | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; caption: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [webSettings, dbPrograms, dbTrainers] = await Promise.all([
          fetchWebsiteSettings(),
          fetchPublicPrograms(),
          fetchPublicTrainers().catch(() => [] as TrainerProfile[]),
        ]);
        if (!active) return;
        setSettings(webSettings);
        if (dbTrainers.length > 0) {
          setTrainers(dbTrainers);
        }
        const visiblePrograms = dbPrograms
          .filter((p) => p.status !== 'archived')
          .sort((a, b) => {
            if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
            if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        if (visiblePrograms.length > 0) {
          setPrograms(visiblePrograms);
          const bySlug = initialProgramSlug
            ? visiblePrograms.find(
                (p) => p.slug === initialProgramSlug || p.id === initialProgramSlug,
              )
            : undefined;
          const featured = bySlug || visiblePrograms.find((p) => p.isFeatured) || visiblePrograms[0];
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
  }, [initialProgramSlug]);

  const activeProgram = programs.find((p) => p.id === selectedProgramId) || programs[0] || DEFAULT_PROGRAM;
  const remainingSeats = computeRemainingSeats(
    activeProgram.quota,
    activeProgram.confirmedCount,
    activeProgram.reservedCount,
  );
  const isProgramFull = remainingSeats <= 0;
  const isProgramClosed = activeProgram.status !== 'open';
  const waLink = toWhatsappLink(
    settings.whatsappNumber || '085121634560',
    `Halo Admin SAKITA, saya ingin bertanya mengenai program ${activeProgram.name}.`,
  );

  // Per-program dynamic content (automatically adapts whenever admin adds/selects any training)
  const isPrimaryShowcase = activeProgram.isFeatured && !initialProgramSlug;
  const heroEyebrow = activeProgram.batchLabel || settings.heroEyebrow || 'PROGRAM PELATIHAN AI SAKITA';
  const heroHeadline =
    activeProgram.headline?.trim() ||
    (isPrimaryShowcase ? settings.heroHeadline : activeProgram.name);
  const heroSubheadline =
    activeProgram.subheadline?.trim() ||
    (isPrimaryShowcase
      ? settings.heroSubheadline
      : `${activeProgram.durationLabel} · ${activeProgram.location}`);
  const heroDescription = isPrimaryShowcase
    ? settings.heroDescription
    : activeProgram.description || settings.heroDescription;
  const heroBannerUrl = activeProgram.bannerUrl?.trim() || settings.bannerUrl;

  const projects =
    activeProgram.curriculum && activeProgram.curriculum.length > 0
      ? activeProgram.curriculum
      : settings.projects?.length
        ? settings.projects
        : DEFAULT_WEBSITE_SETTINGS.projects;
  const targetAudience =
    activeProgram.targetAudience && activeProgram.targetAudience.length > 0
      ? activeProgram.targetAudience.map((item, idx) => ({
          ...item,
          icon: TARGET_AUDIENCE[idx % TARGET_AUDIENCE.length].icon,
        }))
      : TARGET_AUDIENCE;
  const rawFaqs = settings.faqs?.length ? settings.faqs : DEFAULT_WEBSITE_SETTINGS.faqs;
  // Hide unanswered admin draft FAQs on public landing page until admin fills their answers
  const faqs = rawFaqs.filter(
    (item) => item.question.trim().length > 0 && item.answer.trim().length > 0,
  );
  const moduleCount = projects.length || activeProgram.projectCount;

  const heroHeadlineLines = heroHeadline
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  // Fire Meta Pixel ViewContent once per session per viewed program (non-PII)
  useEffect(() => {
    trackMetaViewContent({
      programId: activeProgram.id,
      programName: activeProgram.name,
      price: activeProgram.price,
    });
  }, [activeProgram.id, activeProgram.name, activeProgram.price]);

  const handleTrackWhatsappClick = (source: string) => {
    trackMetaContact({
      source,
      programName: activeProgram.name,
    });
  };

  const showMentorSection = Boolean(
    settings.mentor && settings.mentor.enabled && settings.mentor.name.trim().length > 0,
  );

  const selectProgram = (prog: Program, scrollToTop = false) => {
    setSelectedProgramId(prog.id);
    const nextPath = `/program/${encodeURIComponent(prog.slug || prog.id)}`;
    if (window.location.pathname !== nextPath) {
      window.history.replaceState({}, '', nextPath);
    }
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopyProgramLink = async (prog: Program) => {
    const shareUrl = `${window.location.origin}/program/${encodeURIComponent(prog.slug || prog.id)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast('success', 'Link pelatihan berhasil disalin', shareUrl);
    } catch {
      toast('info', 'Salin link pelatihan', shareUrl);
    }
  };

  const goToRegister = (programId?: string, packageCode?: TrainingPackageCode) => {
    const target = programId || activeProgram.id;
    const params = new URLSearchParams({ program: target });
    if (packageCode) params.set('paket', packageCode);
    navigate(`/daftar?${params.toString()}`);
  };

  return (
    <div id="beranda" className="min-h-screen overflow-x-hidden bg-[#080F1D] text-[#F8FAFC]">
      {/* =====================================================================
          TOP NAVIGATION (Strict 3-Zone Contract, Sticky, Responsive)
         ===================================================================== */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#080F1D]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <a href="#beranda" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] rounded-lg">
            <BrandMark logoUrl={settings.logoUrl} brandName={settings.brandName || 'SAKITA'} variant="dark" />
          </a>

          <nav aria-label="Navigasi Utama" className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#94A3B8]">
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
            <a href="#pemateri" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#F8FAFC]">
              Pemateri
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
                { href: '#pemateri', label: 'Pemateri' },
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
                  {heroEyebrow}
                </p>

                <h1
                  className="mt-4 font-display font-bold tracking-tight text-[#F8FAFC] [text-wrap:balance]"
                  style={{ fontSize: 'clamp(2.15rem, 3.9vw, 3.55rem)', lineHeight: 1.09 }}
                >
                  {heroHeadlineLines.length >= 2 ? (
                    <>
                      <span className="block">{heroHeadlineLines[0]}</span>
                      <span className="mt-1.5 block text-[#22D3EE]">
                        {heroHeadlineLines.slice(1).join(' ')}
                      </span>
                    </>
                  ) : (
                    heroHeadline
                  )}
                </h1>

                <p className="mt-5 font-display text-lg font-medium leading-relaxed text-[#E2E8F0] sm:text-xl [text-wrap:balance]">
                  “{heroSubheadline}”
                </p>

                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#94A3B8] sm:text-base">
                  {heroDescription}
                </p>

                {/* Hero Investment Highlight */}
                <div className="mt-6 max-w-xl rounded-xl border border-[#22D3EE]/30 bg-[#0F172A]/85 px-4 py-3.5">
                  <p className="font-display text-sm font-bold text-[#F8FAFC] sm:text-base">
                    Investasi Pelatihan Mulai{' '}
                    <span className="font-mono text-[#22D3EE] tabular-nums">
                      {formatRupiah(TRAINING_PACKAGES.paket_hemat.price)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    Tersedia pilihan paket dengan atau tanpa penginapan.
                  </p>
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-3.5">
                  <a
                    href="#fasilitas"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#22D3EE] px-6 text-sm font-semibold text-[#080F1D] transition-all hover:bg-[#22D3EE]/90 whitespace-nowrap shrink-0"
                  >
                    <span>
                      {isProgramClosed
                        ? 'Pendaftaran Ditutup'
                        : isProgramFull
                          ? 'Lihat Paket & Daftar Tunggu'
                          : 'Daftar Sekarang'}
                    </span>
                    {!isProgramClosed && <ArrowRight className="h-4 w-4" />}
                  </a>
                  <a
                    href="#program"
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 bg-[#0F172A]/80 px-6 text-sm font-semibold text-[#F8FAFC] transition-colors hover:border-slate-500 hover:bg-[#0F172A] whitespace-nowrap shrink-0"
                  >
                    {programs.length > 1 ? `Lihat ${programs.length} Program Pelatihan` : 'Lihat Program Pelatihan'}
                  </a>
                </div>
              </motion.div>

              {/* Right Visual Column */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-6"
              >
                {heroBannerUrl ? (
                  <div className="relative h-full min-h-[360px] overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A]">
                    <ResolvedAssetImage
                      src={heroBannerUrl}
                      alt={`Banner ${activeProgram.name}`}
                      loading="eager"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080F1D]/90 via-[#080F1D]/40 to-transparent p-5">
                      <p className="text-xs font-medium text-[#F8FAFC]">
                        {activeProgram.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <HeroDashboardPreview />
                )}
              </motion.div>
            </div>

            {/* Five Core Program Highlights Strip (Consistent Key Training Facts) */}
            <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#0F172A]/90 p-4">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#22D3EE]" />
                <div>
                  <p className="text-[11px] font-medium text-[#94A3B8]">Durasi Program</p>
                  <p className="mt-0.5 font-display text-sm font-bold text-[#F8FAFC]">
                    {activeProgram.durationLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#0F172A]/90 p-4">
                <LayoutDashboard className="mt-0.5 h-4 w-4 shrink-0 text-[#22D3EE]" />
                <div>
                  <p className="text-[11px] font-medium text-[#94A3B8]">Kurikulum Praktik</p>
                  <p className="mt-0.5 font-display text-sm font-bold text-[#22D3EE] tabular-nums">
                    {moduleCount} Proyek Aplikasi
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#0F172A]/90 p-4">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#22D3EE]" />
                <div>
                  <p className="text-[11px] font-medium text-[#94A3B8]">Kuota Eksklusif</p>
                  <p className="mt-0.5 font-display text-sm font-bold text-[#F8FAFC] tabular-nums">
                    Maksimal {activeProgram.quota} Peserta
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#0F172A]/90 p-4">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#22D3EE]" />
                <div>
                  <p className="text-[11px] font-medium text-[#94A3B8]">Tanggal Pelaksanaan</p>
                  <p className="mt-0.5 font-display text-sm font-bold text-[#F8FAFC]">
                    {activeProgram.dateLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#0F172A]/90 p-4 sm:col-span-2 lg:col-span-1">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#22D3EE]" />
                <div>
                  <p className="text-[11px] font-medium text-[#94A3B8]">Lokasi Tatap Muka</p>
                  <p className="mt-0.5 font-display text-sm font-bold text-[#F8FAFC]">
                    {activeProgram.location}
                  </p>
                </div>
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
                  <p className="text-xs font-medium text-[#22D3EE]">
                    Belajar AI · Bangun Aplikasi · Buka Peluang Baru
                  </p>
                  <h3 className="mt-3 font-display text-2xl font-bold leading-snug text-[#F8FAFC]">
                    Bangun Aplikasi Sendiri dan Buka Peluang Penghasilan Baru
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">
                    Dengan kecerdasan buatan (AI), Anda dapat menerjemahkan kebutuhan nyata menjadi
                    aplikasi digital fungsional tanpa harus berlatar belakang programmer. Keahlian ini
                    bukan hanya menghemat biaya teknologi lembaga Anda, tetapi juga menjadi bekal nyata
                    untuk membuat dan menjual aplikasi digital kepada sekolah, pesantren, UMKM, maupun
                    instansi lain.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-[#F8FAFC]">
                    {[
                      'Menguasai pola kerja membangun aplikasi digital secara mandiri tanpa harus bisa coding.',
                      'Mempraktikkan langsung pembuatan proyek aplikasi nyata yang siap dipakai dan dikembangkan.',
                      'Mampu mengemas dan menjual aplikasi atau jasa digital untuk membuka sumber penghasilan baru.',
                      'Terhubung dengan Komunitas Sekolah AI Kita untuk diskusi teknis, kolaborasi, dan pendampingan lanjutan.',
                    ].map((point) => (
                      <li key={point} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                        <span className="text-[#94A3B8]">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-8 border-t border-slate-800 pt-4 text-xs leading-relaxed text-[#94A3B8]">
                  Catatan jujur: Peserta dibimbing membangun fondasi proyek aplikasi fungsional yang
                  dapat langsung diterapkan di lembaga sendiri maupun dikembangkan kembali menjadi
                  produk dan layanan digital bernilai jual.
                </p>
              </div>
            </div>

            {/* Three-Pillar Outcome Strip: Belajar AI -> Bangun Aplikasi -> Peluang Penghasilan */}
            <div className="mt-10 grid grid-cols-1 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-[#0F172A]/80 md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="p-6 sm:p-7">
                <p className="font-mono text-xs font-semibold text-[#22D3EE] tabular-nums">01</p>
                <h3 className="mt-2 font-display text-lg font-bold text-[#F8FAFC]">
                  Belajar AI Secara Praktis
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
                  Pelajari langkah terstruktur menerjemahkan ide dan alur kerja menjadi sistem digital
                  modern cukup dengan bahasa sehari-hari.
                </p>
              </div>
              <div className="p-6 sm:p-7">
                <p className="font-mono text-xs font-semibold text-[#22D3EE] tabular-nums">02</p>
                <h3 className="mt-2 font-display text-lg font-bold text-[#F8FAFC]">
                  Bangun Aplikasi Sendiri
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
                  Mandiri membuat aplikasi PPDB, keuangan, akademik, absensi, hingga website lembaga
                  sendiri tanpa bergantung pada vendor mahal.
                </p>
              </div>
              <div className="p-6 sm:p-7">
                <p className="font-mono text-xs font-semibold text-[#10B981] tabular-nums">03</p>
                <h3 className="mt-2 font-display text-lg font-bold text-[#F8FAFC]">
                  Buka Peluang Penghasilan Baru
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
                  Setelah pelatihan, Anda mampu membuat dan menjual aplikasi siap pakai maupun jasa
                  pembuatan sistem digital kepada sekolah, pesantren, dan instansi lain.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            C. KATALOG & DETAIL PROGRAM PELATIHAN
           =================================================================== */}
        <section id="program" className="border-b border-slate-800/80 bg-[#0F172A]/40 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="text-xs font-medium tracking-wide text-[#22D3EE]">
                  {programs.length > 1 ? 'Katalog Program Pelatihan SAKITA' : 'Tentang Program'}
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl [text-wrap:balance]">
                  Bukan Sekadar Belajar AI. Saatnya Menciptakan Solusi Nyata.
                </h2>
                <p className="mt-6 text-base leading-relaxed text-[#94A3B8]">
                  Ini bukan seminar yang hanya membuat peserta duduk mendengarkan teori. Peserta akan
                  dibimbing secara intensif untuk mempraktikkan pembuatan berbagai proyek aplikasi
                  digital yang dapat dikembangkan untuk kebutuhan lembaga pendidikan masing-masing.
                </p>
              </div>

              <div className="rounded-2xl border border-[#22D3EE]/30 bg-[#0F172A] p-7 lg:col-span-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-[#22D3EE]">{activeProgram.batchLabel}</p>
                  <button
                    type="button"
                    onClick={() => void handleCopyProgramLink(activeProgram)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] transition-colors hover:text-[#22D3EE] whitespace-nowrap shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin Link</span>
                  </button>
                </div>
                <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-[#F8FAFC]">
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
                    {moduleCount} Materi & Proyek Praktik
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-[#94A3B8]">Investasi</span>
                  <span className="font-mono font-semibold text-[#22D3EE] tabular-nums">
                    Mulai {formatRupiah(TRAINING_PACKAGES.paket_hemat.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Automatic Multi-Training Catalog Grid (Scales seamlessly for 1, 2, 3, or 20+ trainings) */}
            {programs.length > 1 && (
              <div className="mt-14 border-t border-slate-800 pt-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-[#22D3EE]">
                      Pilihan Pelatihan Aktif ({programs.length} Program)
                    </p>
                    <h3 className="mt-1.5 font-display text-2xl font-bold text-[#F8FAFC]">
                      Pilih Program Pelatihan yang Sesuai Kebutuhan Lembaga Anda
                    </h3>
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Klik &ldquo;Lihat Detail&rdquo; untuk menampilkan kurikulum, jadwal, dan fasilitas lengkap program tersebut.
                  </p>
                </div>

                <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {programs.map((prog) => {
                    const isSelected = prog.id === activeProgram.id;
                    const progFull =
                      computeRemainingSeats(prog.quota, prog.confirmedCount, prog.reservedCount) <= 0;
                    const progClosed = prog.status !== 'open';
                    const progModules = prog.curriculum?.length || prog.projectCount;
                    return (
                      <article
                        key={prog.id}
                        className={`flex flex-col justify-between rounded-2xl border p-6 transition-colors ${
                          isSelected
                            ? 'border-[#22D3EE] bg-[#0F172A]'
                            : 'border-slate-800 bg-[#080F1D]/80 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#94A3B8]">
                            <span className="font-mono text-[#22D3EE]">{prog.batchLabel}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`font-medium ${
                                progClosed || progFull ? 'text-amber-400' : 'text-[#10B981]'
                              }`}
                            >
                              {progClosed
                                ? 'Ditutup'
                                : progFull
                                  ? 'Daftar Tunggu'
                                  : 'Pendaftaran Dibuka'}
                            </span>
                            {isSelected && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-[#F8FAFC]">Sedang Dilihat</span>
                              </>
                            )}
                          </div>

                          <h4 className="mt-3 font-display text-lg font-bold leading-snug text-[#F8FAFC]">
                            {prog.name}
                          </h4>

                          <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-[#94A3B8]">
                            {prog.description}
                          </p>

                          <dl className="mt-5 space-y-2 border-t border-slate-800/80 pt-4 text-xs text-[#94A3B8]">
                            <div className="flex items-center justify-between gap-2">
                              <dt>Jadwal</dt>
                              <dd className="font-medium text-[#F8FAFC] text-right">{prog.dateLabel}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <dt>Durasi</dt>
                              <dd className="font-medium text-[#F8FAFC] text-right">{prog.durationLabel}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <dt>Lokasi</dt>
                              <dd className="font-medium text-[#F8FAFC] text-right truncate max-w-[65%]">
                                {prog.location}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <dt>Kurikulum</dt>
                              <dd className="font-medium text-[#F8FAFC] tabular-nums">
                                {progModules} Materi Praktik
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="mt-6 border-t border-slate-800/80 pt-4">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs text-[#94A3B8]">Investasi</span>
                            <span className="font-mono text-lg font-bold text-[#F8FAFC] tabular-nums">
                              {formatRupiah(prog.price)}
                            </span>
                          </div>
                          <div className="mt-4 flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => selectProgram(prog, true)}
                              className={`inline-flex h-10 flex-1 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                                isSelected
                                  ? 'border-[#22D3EE]/60 bg-[#22D3EE]/10 text-[#22D3EE]'
                                  : 'border-slate-700 bg-[#0F172A] text-[#F8FAFC] hover:border-slate-500'
                              }`}
                            >
                              {isSelected ? 'Sedang Dibuka' : 'Lihat Detail'}
                            </button>
                            <button
                              type="button"
                              disabled={progClosed}
                              onClick={() => goToRegister(prog.id)}
                              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#22D3EE] px-3 text-xs font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
                            >
                              <span>{progClosed ? 'Ditutup' : progFull ? 'Daftar Tunggu' : 'Daftar'}</span>
                              {!progClosed && <ArrowRight className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ===================================================================
            D. MATERI & PROYEK PRAKTIK (100% Dynamic per Program)
           =================================================================== */}
        <section id="materi" className="border-b border-slate-800/80 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-medium tracking-wide text-[#22D3EE]">
                Kurikulum Praktik · {activeProgram.name}
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl [text-wrap:balance]">
                {moduleCount} Materi & Proyek Praktik yang Dipelajari
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#94A3B8]">
                Setiap modul dirancang agar peserta langsung mempraktikkan solusi nyata sesuai
                kebutuhan program {activeProgram.name}.
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
            E. TARGET PESERTA PELATIHAN
           =================================================================== */}
        <section className="border-b border-slate-800/80 bg-[#0F172A]/35 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-medium tracking-wide text-[#22D3EE]">
                Target Peserta Pelatihan
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl [text-wrap:balance]">
                Siapa yang Cocok Mengikuti Pelatihan Ini?
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#94A3B8]">
                “Tidak perlu memiliki latar belakang IT atau pengalaman coding. Pelatihan ini dirancang
                untuk membimbing Anda secara bertahap dalam memanfaatkan AI untuk menciptakan solusi
                digital.”
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {targetAudience.map((item) => {
                const AudienceIcon = item.icon || GraduationCap;
                return (
                  <div
                    key={item.role}
                    className="group rounded-xl border border-slate-800 bg-[#0F172A]/85 p-5 transition-colors hover:border-[#22D3EE]/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/80 bg-[#080F1D] text-[#22D3EE]">
                      <AudienceIcon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-display text-base font-semibold text-[#F8FAFC]">
                      {item.role}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#94A3B8] sm:text-sm">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            E2. HASIL YANG DIBAWA PULANG PESERTA & DUA PELUANG BESAR
           =================================================================== */}
        <section className="border-b border-slate-800/80 bg-[#080F1D] py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-medium tracking-wide text-[#22D3EE]">
                Output & Manfaat Praktik
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl [text-wrap:balance]">
                Apa yang Anda Bawa Pulang Setelah 4 Hari Pelatihan?
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {PARTICIPANT_DELIVERABLES.map((benefit, idx) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3.5 rounded-xl border border-slate-800 bg-[#0F172A]/80 px-5 py-4"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#22D3EE]/12 text-[#22D3EE]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1">
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      0{idx + 1}
                    </span>
                    <p className="mt-0.5 text-sm font-medium leading-relaxed text-[#F8FAFC]">
                      {benefit}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Persuasive Dual Opportunity Block (No Income Guarantees) */}
            <div className="mt-14">
              <div className="text-center">
                <p className="font-mono text-xs font-medium tracking-[0.16em] text-[#22D3EE] uppercase">
                  Nilai Strategis Pelatihan
                </p>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl">
                  Satu Pelatihan, Dua Peluang Besar.
                </h3>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#22D3EE]/30 bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#22D3EE]/10 p-7 sm:p-8">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#22D3EE]/35 bg-[#22D3EE]/12 text-[#22D3EE]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h4 className="mt-5 font-display text-xl font-bold text-[#F8FAFC]">
                    Kemandirian Digital Lembaga
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-[#94A3B8] sm:text-[15px]">
                    Bangun dan kembangkan sistem digital sekolah atau pesantren Anda secara mandiri,
                    sehingga dapat menekan ketergantungan pada vendor eksternal dan menyesuaikan fitur
                    aplikasi dengan kebutuhan nyata lembaga.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#10B981]/30 bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#10B981]/10 p-7 sm:p-8">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#10B981]/35 bg-[#10B981]/12 text-[#10B981]">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <h4 className="mt-5 font-display text-xl font-bold text-[#F8FAFC]">
                    Peluang Bisnis Digital
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-[#94A3B8] sm:text-[15px]">
                    Keterampilan membangun dan mempublikasikan aplikasi berbasis AI membuka wawasan
                    untuk merintis jasa pembuatan aplikasi bagi lembaga, UMKM, maupun memasarkan
                    aplikasi sebagai produk digital.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            F. PROFIL PEMATERI UTAMA (Managed via Admin -> Manajemen Pemateri)
           =================================================================== */}
        <TrainerProfileSection
          trainers={trainers}
          activeProgram={activeProgram}
          moduleCount={moduleCount}
          onRegister={() => goToRegister()}
        />

        {showMentorSection && trainers.length === 0 && (
          <section className="border-b border-slate-800/80 py-20 lg:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <p className="text-xs font-medium tracking-wide text-[#22D3EE]">Profil Mentor</p>
              <div className="mt-6 grid grid-cols-1 items-center gap-8 rounded-2xl border border-slate-800 bg-[#0F172A] p-7 lg:grid-cols-12 lg:p-10">
                <div className="lg:col-span-4">
                  {settings.mentor.photoUrl ? (
                    <ResolvedAssetImage
                      src={settings.mentor.photoUrl}
                      alt={settings.mentor.name}
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
                  <CountdownTimer targetIso={activeProgram.startDateIso || '2026-12-28T08:00:00+07:00'} />
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
                          className="group overflow-hidden rounded-xl border border-slate-800 bg-[#080F1D] transition-colors hover:border-[#22D3EE]/50"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewPhoto({
                                url: photo.url,
                                caption: photo.caption || `Foto ${activeProgram.location}`,
                              })
                            }
                            aria-label={`Perbesar ${photo.caption || `Foto ${activeProgram.location}`}`}
                            className="block w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
                          >
                            <ResolvedAssetImage
                              src={photo.url}
                              alt={photo.caption || `Foto ${activeProgram.location}`}
                              className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                          </button>
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
                      {['Ruang Pelatihan & Praktik', 'Area Diskusi & Kolaborasi', 'Suasana Sesi Pendampingan', `Fasilitas ${activeProgram.location}`].map(
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
                  Seluruh dokumentasi ruang pelatihan dan fasilitas lokasi {activeProgram.location}{' '}
                  diunggah langsung oleh tim administrasi Sekolah AI Kita.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            H. INVESTASI PENDIDIKAN & PILIHAN PAKET PELATIHAN
           =================================================================== */}
        <section id="fasilitas" className="border-b border-slate-800/80 bg-[#0F172A]/40 py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-medium tracking-wide text-[#22D3EE]">
                Investasi Pendidikan & Pilihan Paket
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl [text-wrap:balance]">
                Investasi Terjangkau, Peluang Tak Terbatas.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#E2E8F0] sm:text-lg [text-wrap:balance]">
                Mulai dari Rp1.950.000, kamu sudah bisa belajar membangun 10 aplikasi nyata dan
                membuka peluang penghasilan baru di era AI.
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8]">
                Pilih paket yang sesuai dengan kebutuhanmu. Dua pilihan fasilitas, satu kualitas
                pembelajaran.
              </p>
            </div>

            {/* Two Side-by-Side Responsive Pricing Cards */}
            <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
              {TRAINING_PACKAGE_LIST.map((pkg) => {
                const isGold = pkg.accent === 'gold';
                return (
                  <article
                    key={pkg.code}
                    className={`relative flex flex-col justify-between rounded-2xl border p-7 transition-all sm:p-9 ${
                      isGold
                        ? 'border-[#D4AF37]/50 bg-gradient-to-b from-[#131C31] via-[#0F172A] to-[#080F1D] shadow-[0_24px_60px_-28px_rgba(212,175,55,0.28)]'
                        : 'border-[#22D3EE]/40 bg-gradient-to-b from-[#0F172A] to-[#080F1D] shadow-[0_24px_60px_-28px_rgba(34,211,238,0.2)]'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p
                            className={`font-mono text-xs font-semibold uppercase tracking-[0.14em] ${
                              isGold ? 'text-[#D4AF37]' : 'text-[#22D3EE]'
                            }`}
                          >
                            {pkg.name}
                          </p>
                          <p className="mt-1.5 text-sm font-medium text-[#E2E8F0]">
                            {pkg.lodgingShortLabel}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
                            isGold
                              ? 'border-[#D4AF37]/45 bg-[#D4AF37]/12 text-[#EBD077]'
                              : 'border-[#10B981]/45 bg-[#10B981]/12 text-[#34D399]'
                          }`}
                        >
                          {pkg.highlightLabel}
                        </span>
                      </div>

                      {/* Price Display */}
                      <div className="mt-6 flex items-baseline gap-2 border-b border-slate-800/90 pb-6">
                        <span
                          className={`font-mono text-4xl font-bold tracking-tight tabular-nums sm:text-5xl ${
                            isGold ? 'text-[#F8FAFC]' : 'text-[#F8FAFC]'
                          }`}
                        >
                          {formatRupiah(pkg.price)}
                        </span>
                        <span className="text-sm text-[#94A3B8]">/ peserta</span>
                      </div>

                      {/* Lodging Clarity Box */}
                      <div
                        className={`mt-5 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
                          isGold
                            ? 'border-[#D4AF37]/30 bg-[#D4AF37]/8 text-[#F5E6B3]'
                            : 'border-slate-700/90 bg-[#080F1D]/80 text-[#CBD5E1]'
                        }`}
                      >
                        <strong className={isGold ? 'text-[#EBD077]' : 'text-[#22D3EE]'}>
                          Fasilitas Penginapan:{' '}
                        </strong>
                        {pkg.includesLodging
                          ? 'Termasuk fasilitas penginapan di Hotel Grand Makmur, Jambi selama pelatihan.'
                          : 'Paket ini tidak termasuk penginapan hotel. Peserta tetap mengikuti seluruh sesi dan materi yang sama secara penuh.'}
                      </div>

                      {/* Identical Core Curriculum & Learning Quality */}
                      <div className="mt-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                          Materi & Kualitas Pembelajaran (Sama di Kedua Paket)
                        </h3>
                        <ul className="mt-3.5 space-y-2.5">
                          {PACKAGE_LEARNING_BENEFITS.map((item) => (
                            <li key={item} className="flex items-start gap-2.5 text-sm text-[#F8FAFC]">
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                                  isGold
                                    ? 'bg-[#D4AF37]/15 text-[#EBD077]'
                                    : 'bg-[#22D3EE]/15 text-[#22D3EE]'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Confirmed Facilities per Package */}
                      <div className="mt-6 border-t border-slate-800/80 pt-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                          Fasilitas Pelatihan yang Termasuk
                        </h3>
                        <ul className="mt-3.5 space-y-2.5">
                          {pkg.confirmedFacilities.map((fac) => (
                            <li key={fac} className="flex items-start gap-2.5 text-sm text-[#CBD5E1]">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#10B981]/15 text-[#10B981]">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                              <span>{fac}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Package CTA Button */}
                    <div className="mt-8 border-t border-slate-800/80 pt-6">
                      <button
                        type="button"
                        disabled={isProgramClosed}
                        onClick={() => goToRegister(undefined, pkg.code)}
                        className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          isGold
                            ? 'bg-gradient-to-r from-[#D4AF37] to-[#E5C55C] text-[#080F1D] hover:brightness-105'
                            : 'bg-[#22D3EE] text-[#080F1D] hover:bg-[#22D3EE]/90'
                        }`}
                      >
                        <span>
                          {isProgramClosed
                            ? 'Pendaftaran Ditutup'
                            : isProgramFull
                              ? `${pkg.ctaLabel} (Daftar Tunggu)`
                              : pkg.ctaLabel}
                        </span>
                        {!isProgramClosed && <ArrowRight className="h-4 w-4" />}
                      </button>
                      <p className="mt-2.5 text-center text-[11px] text-[#94A3B8]">
                        Nominal pembayaran otomatis disesuaikan ke {formatRupiah(pkg.price)} pada formulir pendaftaran
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Shared Quota & Persuasive Reassurance Strip */}
            <div className="mt-8 rounded-2xl border border-slate-800 bg-[#0F172A]/90 p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div className="max-w-2xl">
                  <p className="font-display text-base font-semibold text-[#F8FAFC] sm:text-lg">
                    “Jangan biarkan keterbatasan biaya menghalangi langkahmu untuk menguasai teknologi masa depan.”
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[#94A3B8]">
                    Kuota terbatas maksimal <strong className="text-[#F8FAFC]">{activeProgram.quota} peserta keseluruhan</strong>{' '}
                    (gabungan Paket Hemat dan Paket Premium) · {activeProgram.dateLabel} · {activeProgram.location}.
                  </p>
                </div>
                <div className="shrink-0 rounded-xl border border-slate-800 bg-[#080F1D] px-4 py-3 text-left md:text-right">
                  <p className="text-[11px] text-[#94A3B8]">Status Pendaftaran</p>
                  <p
                    className={`mt-0.5 text-xs font-semibold ${
                      isProgramClosed || isProgramFull ? 'text-amber-400' : 'text-[#10B981]'
                    }`}
                  >
                    {isProgramClosed
                      ? 'Pendaftaran Ditutup'
                      : isProgramFull
                        ? 'Pendaftaran Penuh (Daftar Tunggu)'
                        : 'Pendaftaran Dibuka · Kuota Terbatas'}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-start gap-3 border-t border-slate-800/80 pt-4 text-xs leading-relaxed text-[#94A3B8]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#22D3EE]" />
                <span>
                  Pembayaran melalui transfer bank langsung dan diverifikasi resmi oleh admin SAKITA.
                  Akses resmi Komunitas Sekolah AI Kita terbuka otomatis pada halaman status
                  pendaftaran Anda setelah pembayaran diverifikasi <strong>LUNAS</strong>.
                </span>
              </div>
            </div>

            {/* Verifiable Transparency & Official Registration Mechanism Block */}
            <div className="mt-8 rounded-2xl border border-slate-800 bg-[#080F1D]/85 p-6 sm:p-8">
              <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-medium tracking-wide text-[#22D3EE]">
                    Transparansi & Keamanan Pendaftaran
                  </p>
                  <h3 className="mt-1.5 font-display text-xl font-bold text-[#F8FAFC]">
                    Mekanisme Resmi Penyelenggaraan Sekolah AI Kita (SAKITA)
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLegalDialog('privacy')}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0F172A] px-3.5 text-xs font-medium text-[#F8FAFC] transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE]"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Kebijakan Privasi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLegalDialog('terms')}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0F172A] px-3.5 text-xs font-medium text-[#F8FAFC] transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE]"
                  >
                    <FileCheck2 className="h-3.5 w-3.5" />
                    <span>Ketentuan Pendaftaran</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800/90 bg-[#0F172A]/70 p-4">
                  <p className="font-mono text-xs font-semibold text-[#22D3EE]">01 · Pendaftaran Resmi</p>
                  <p className="mt-1.5 text-sm font-semibold text-[#F8FAFC]">
                    Isi Formulir & Dapatkan Nomor Registrasi
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
                    Setiap peserta memperoleh nomor registrasi unik dan tautan status pribadi untuk
                    memantau proses pendaftaran secara transparan.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800/90 bg-[#0F172A]/70 p-4">
                  <p className="font-mono text-xs font-semibold text-[#22D3EE]">02 · Transfer Bank Langsung</p>
                  <p className="mt-1.5 text-sm font-semibold text-[#F8FAFC]">
                    Rekening Resmi & Unggah Bukti Aman
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
                    Pembayaran dilakukan langsung melalui transfer bank ke rekening resmi yang tertera
                    pada tahap pembayaran, lalu unggah bukti transfer secara privat.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800/90 bg-[#0F172A]/70 p-4">
                  <p className="font-mono text-xs font-semibold text-[#10B981]">03 · Verifikasi Admin SAKITA</p>
                  <p className="mt-1.5 text-sm font-semibold text-[#F8FAFC]">
                    Status LUNAS, E-Tiket & Akses Komunitas
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
                    Admin memverifikasi bukti transfer secara resmi. Setelah berstatus LUNAS, e-tiket
                    kehadiran dan tautan Komunitas SAKITA aktif otomatis.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4 text-xs text-[#94A3B8]">
                <span>
                  Penyelenggara: <strong className="text-[#F8FAFC]">Sekolah AI Kita (SAKITA)</strong> ·
                  Lokasi: <strong className="text-[#F8FAFC]">{activeProgram.location}</strong>
                </span>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleTrackWhatsappClick('trust_section_wa')}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#10B981] hover:underline"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>WhatsApp Resmi: {settings.whatsappNumber || '0851-2163-4560'}</span>
                </a>
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
              <p className="font-mono text-xs font-medium tracking-wide text-[#22D3EE]">
                Belajar AI · Bangun Aplikasi Sendiri · Buka Peluang Penghasilan Baru
              </p>
              <h2 className="mx-auto mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl [text-wrap:balance]">
                Jangan Hanya Jadi Pengguna Teknologi. Buat Aplikasi Sendiri dan Ciptakan Peluang Baru.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#94A3B8]">
                Miliki keterampilan nyata di era AI—mulai dari membangun sistem digital untuk lembaga
                Anda sendiri hingga mampu membuat dan menjual aplikasi siap pakai sebagai sumber
                penghasilan baru.
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
                  onClick={() => handleTrackWhatsappClick('final_cta_wa')}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#080F1D] px-6 text-sm font-semibold text-[#F8FAFC] transition-colors hover:border-[#10B981]/60 hover:text-[#10B981] whitespace-nowrap shrink-0"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp {settings.whatsappNumber || '0851-2163-4560'}</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          K. FOOTER (Extra bottom padding on mobile so sticky CTA never covers content)
         ===================================================================== */}
      <footer className="border-t border-slate-800 bg-[#080F1D] pb-24 pt-12 lg:pb-12">
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
                  onClick={() => handleTrackWhatsappClick('footer_wa_number')}
                  className="text-[#94A3B8] hover:text-[#22D3EE]"
                >
                  {settings.whatsappNumber || '0851-2163-4560'}
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
                onClick={() => handleTrackWhatsappClick('footer_contact_wa')}
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

      {/* Desktop-only Floating WhatsApp Button (Hidden on mobile so it never collides with sticky CTA bar) */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => handleTrackWhatsappClick('floating_desktop_wa')}
        aria-label="Hubungi Admin SAKITA melalui WhatsApp"
        className="no-print fixed bottom-5 left-5 z-30 hidden h-11 items-center gap-2 rounded-full border border-[#10B981]/40 bg-[#0F172A]/95 px-4 text-xs font-semibold text-[#F8FAFC] shadow-lg backdrop-blur-md transition-colors hover:border-[#10B981] hover:text-[#10B981] lg:inline-flex"
      >
        <MessageCircle className="h-4 w-4 text-[#10B981]" />
        <span>Tanya Admin</span>
      </a>

      {/* Mobile Sticky Bottom CTA Bar (Daftar Sekarang + Tanya Admin) */}
      <div
        role="region"
        aria-label="Aksi Cepat Pendaftaran"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/95 bg-[#080F1D]/95 px-4 py-3 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.75)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center gap-2.5">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleTrackWhatsappClick('mobile_sticky_wa')}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#10B981]/45 bg-[#0F172A] px-4 text-xs font-semibold text-[#F8FAFC] transition-colors hover:border-[#10B981] hover:text-[#10B981] whitespace-nowrap"
          >
            <MessageCircle className="h-4 w-4 text-[#10B981]" />
            <span>Tanya Admin</span>
          </a>
          <button
            type="button"
            disabled={isProgramClosed}
            onClick={() => goToRegister()}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#22D3EE] px-4 text-xs font-bold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          >
            <span>
              {isProgramClosed
                ? 'Pendaftaran Ditutup'
                : isProgramFull
                  ? 'Daftar Tunggu'
                  : 'Daftar Sekarang'}
            </span>
            {!isProgramClosed && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

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

      {/* Hotel Photo Lightbox */}
      {previewPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={previewPhoto.caption}
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#080F1D]/90 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0F172A] shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              aria-label="Tutup pratinjau foto"
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-[#080F1D]/90 text-[#F8FAFC] transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE]"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex max-h-[78vh] items-center justify-center bg-[#080F1D]">
              <ResolvedAssetImage
                src={previewPhoto.url}
                alt={previewPhoto.caption}
                loading="eager"
                className="max-h-[78vh] w-auto max-w-full object-contain"
              />
            </div>
            <div className="border-t border-slate-800 px-5 py-3.5 text-sm font-medium text-[#F8FAFC]">
              {previewPhoto.caption}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
