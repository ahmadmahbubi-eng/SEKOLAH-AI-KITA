import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Code2,
  Copy,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  ImageIcon,
  Landmark,
  Layers,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  Rocket,
  School,
  ShieldCheck,
  Sparkles,
  Store,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { ResolvedAssetImage } from '../components/ResolvedAssetImage';
import { CountdownTimer } from '../components/landing/CountdownTimer';
import { DemoAppGallerySection } from '../components/landing/DemoAppGallerySection';
import { LegalModal } from '../components/landing/LegalModal';
import { TrainerProfileSection } from '../components/landing/TrainerProfileSection';
import { useToast } from '../context/ToastContext';
import {
  DEFAULT_DEMO_APPS,
  DEFAULT_PRIMARY_TRAINER,
  DEFAULT_PROGRAM,
  DEFAULT_WEBSITE_SETTINGS,
  PACKAGE_LEARNING_BENEFITS,
  TRAINING_PACKAGES,
  TRAINING_PACKAGE_LIST,
} from '../lib/defaults';
import { computeRemainingSeats, formatRupiah, toWhatsappLink } from '../lib/format';
import {
  trackMetaContact,
  trackMetaViewContent,
  trackMetaViewDemoApp,
} from '../lib/metaPixel';
import {
  fetchPublicDemoApps,
  fetchPublicPrograms,
  fetchPublicTrainers,
  fetchWebsiteSettings,
  isSafeHttpUrl,
} from '../lib/sakitaService';
import type {
  DemoAppItem,
  Program,
  ProjectItem,
  TrainerProfile,
  TrainingPackageCode,
  WebsiteSettings,
} from '../types';

interface LandingPageProps {
  navigate: (path: string) => void;
  initialProgramSlug?: string;
}

const PROBLEMS = [
  {
    title: 'Biaya pembuatan aplikasi yang mahal',
    detail:
      'Pengembangan sistem sekolah khusus melalui vendor sering kali membutuhkan anggaran puluhan hingga ratusan juta rupiah.',
  },
  {
    title: 'Ketergantungan terhadap vendor & programmer',
    detail:
      'Setiap perubahan kebutuhan administrasi harus menunggu antrean vendor dengan biaya pemeliharaan berkelanjutan.',
  },
  {
    title: 'Administrasi lembaga masih manual',
    detail:
      'Pencatatan PPDB, SPP, absensi, dan laporan bulanan di kertas atau file terpisah menyita waktu staf setiap pekan.',
  },
  {
    title: 'Data pendidikan belum terintegrasi',
    detail:
      'Data akademik, keuangan, kepengasuhan asrama, dan tahfidz tersebar di berbagai divisi tanpa satu sumber data.',
  },
  {
    title: 'Keterbatasan tenaga IT internal',
    detail:
      'Banyak sekolah dan pesantren unggulan belum memiliki tim programmer penuh waktu untuk membangun sistem digital sendiri.',
  },
  {
    title: 'Sulit memantau perkembangan lembaga',
    detail:
      'Pimpinan membutuhkan waktu lama untuk menghimpun laporan aktual sebelum mengambil keputusan strategis.',
  },
];

const TRAINING_ADVANTAGES = [
  {
    icon: Layers,
    title: '100% Kelas Praktik',
    desc: 'Bukan seminar teori — langsung membangun aplikasi fungsional sejak hari pertama.',
  },
  {
    icon: LayoutDashboard,
    title: '10 Proyek Aplikasi Nyata',
    desc: 'Mulai dari PPDB, Keuangan SPP, Akademik, CBT, hingga Website Lembaga.',
  },
  {
    icon: Code2,
    title: 'Tanpa Harus Menguasai Coding',
    desc: 'Alur praktik terstruktur memanfaatkan AI modern cukup dengan bahasa sehari-hari.',
  },
  {
    icon: Users,
    title: 'Pendampingan Intensif',
    desc: 'Kuota dibatasi maksimal 30 peserta agar bimbingan praktik tetap fokus dan optimal.',
  },
  {
    icon: Building2,
    title: 'Solusi Digital Pendidikan',
    desc: 'Dirancang sesuai kebutuhan operasional nyata sekolah, pesantren, dan yayasan.',
  },
  {
    icon: Briefcase,
    title: 'Peluang Bisnis Aplikasi',
    desc: 'Bekal wawasan membangun jasa pembuatan maupun penjualan produk aplikasi digital.',
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

interface DayModuleTab {
  dayLabel: string;
  dateNote: string;
  focusTitle: string;
  summary: string;
  projects: ProjectItem[];
  highlights: string[];
}

function buildFourDayTabs(projects: ProjectItem[]): DayModuleTab[] {
  return [
    {
      dayLabel: 'Hari 1',
      dateNote: '28 Desember 2026',
      focusTitle: 'Fondasi Membangun Aplikasi dengan AI & Sistem Inti Lembaga',
      summary:
        'Memahami alur kerja membangun aplikasi berbasis AI tanpa harus bisa coding, dilanjutkan praktik langsung 3 sistem utama lembaga.',
      projects: projects.slice(0, 3),
      highlights: [
        'Pengenalan ekosistem AI & metode merancang struktur aplikasi dari kebutuhan nyata lembaga',
        'Praktik langsung merancang antarmuka, formulir digital, dan alur pencatatan data',
      ],
    },
    {
      dayLabel: 'Hari 2',
      dateNote: '29 Desember 2026',
      focusTitle: 'Otomatisasi Evaluasi, Absensi & Pembinaan Pendidikan',
      summary:
        'Memperdalam praktik pembangunan aplikasi evaluasi belajar, pencatatan kehadiran real-time, serta pemantauan capaian tahfidz.',
      projects: projects.slice(3, 6),
      highlights: [
        'Praktik alur ujian digital, rekap otomatis, dan laporan perkembangan peserta didik',
        'Pendampingan penyesuaian fitur sesuai karakteristik sekolah maupun pesantren peserta',
      ],
    },
    {
      dayLabel: 'Hari 3',
      dateNote: '30 Desember 2026',
      focusTitle: 'Digitalisasi Ekosistem Pesantren & Dashboard Pimpinan',
      summary:
        'Membangun modul operasional kepengasuhan asrama, layanan konsumsi, serta dashboard terpadu untuk pemantauan pimpinan lembaga.',
      projects: projects.slice(6, 9),
      highlights: [
        'Integrasi laporan lintas unit agar pimpinan memperoleh ringkasan data yang tertib',
        'Review langsung proyek praktik bersama pemateri untuk memastikan aplikasi berjalan baik',
      ],
    },
    {
      dayLabel: 'Hari 4',
      dateNote: '31 Desember 2026',
      focusTitle: 'Website Lembaga, Publikasi Online & Peluang Bisnis Digital',
      summary:
        'Menyelesaikan proyek website profil lembaga, mempraktikkan publikasi aplikasi secara online, serta wawasan jasa & produk digital.',
      projects: projects.slice(9, 10),
      highlights: [
        'Pemahaman cara mempublikasikan aplikasi secara online agar siap diakses pengguna',
        'Wawasan membangun bisnis jasa pembuatan aplikasi & memasarkan aplikasi sebagai produk digital',
        'Pengarahan lanjutan & kolaborasi bersama Komunitas Sekolah AI Kita',
      ],
    },
  ];
}

export function LandingPage({ navigate, initialProgramSlug }: LandingPageProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [programs, setPrograms] = useState<Program[]>([DEFAULT_PROGRAM]);
  const [trainers, setTrainers] = useState<TrainerProfile[]>([DEFAULT_PRIMARY_TRAINER]);
  const [demoApps, setDemoApps] = useState<DemoAppItem[]>(DEFAULT_DEMO_APPS);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(DEFAULT_PROGRAM.id);

  // Interactive UI & Progressive Disclosure States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProblemDetail, setShowProblemDetail] = useState(false);
  const [showProgramDetail, setShowProgramDetail] = useState(false);
  const [activeDayTab, setActiveDayTab] = useState(0);
  const [showDeliverables, setShowDeliverables] = useState(false);
  const [activeHotelIdx, setActiveHotelIdx] = useState(0);
  const [facilitiesModalOpen, setFacilitiesModalOpen] = useState(false);
  const [expandedPackages, setExpandedPackages] = useState<Record<string, boolean>>({});
  const [showMechanismDetail, setShowMechanismDetail] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [legalDialog, setLegalDialog] = useState<'privacy' | 'terms' | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; caption: string } | null>(null);
  const [trainerModalOpen, setTrainerModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [webSettings, dbPrograms, dbTrainers, dbDemoApps] = await Promise.all([
          fetchWebsiteSettings(),
          fetchPublicPrograms(),
          fetchPublicTrainers().catch(() => [] as TrainerProfile[]),
          fetchPublicDemoApps().catch(() => [] as DemoAppItem[]),
        ]);
        if (!active) return;
        setSettings(webSettings);
        if (dbTrainers.length > 0) {
          setTrainers(dbTrainers);
        }
        if (dbDemoApps.length > 0) {
          setDemoApps(dbDemoApps);
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

  // Escape key & scroll-lock for Facilities Modal and Photo Lightbox
  useEffect(() => {
    if (!facilitiesModalOpen && !previewPhoto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewPhoto) setPreviewPhoto(null);
        else if (facilitiesModalOpen) setFacilitiesModalOpen(false);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [facilitiesModalOpen, previewPhoto]);

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
  const heroBannerUrl = activeProgram.bannerUrl?.trim() || settings.bannerUrl;

  const projects = useMemo(
    () =>
      activeProgram.curriculum && activeProgram.curriculum.length > 0
        ? activeProgram.curriculum
        : settings.projects?.length
          ? settings.projects
          : DEFAULT_WEBSITE_SETTINGS.projects,
    [activeProgram.curriculum, settings.projects],
  );

  const fourDayTabs = useMemo(() => buildFourDayTabs(projects), [projects]);

  const liveDemoApps = useMemo(
    () =>
      demoApps
        .filter((app) => app.isVisible && app.status === 'demo_tersedia' && isSafeHttpUrl(app.demoUrl))
        .sort((a, b) => a.orderNumber - b.orderNumber),
    [demoApps],
  );

  const targetAudience =
    activeProgram.targetAudience && activeProgram.targetAudience.length > 0
      ? activeProgram.targetAudience.map((item, idx) => ({
          ...item,
          icon: TARGET_AUDIENCE[idx % TARGET_AUDIENCE.length].icon,
        }))
      : TARGET_AUDIENCE;

  const rawFaqs = settings.faqs?.length ? settings.faqs : DEFAULT_WEBSITE_SETTINGS.faqs;
  const faqs = rawFaqs.filter(
    (item) => item.question.trim().length > 0 && item.answer.trim().length > 0,
  );
  const moduleCount = projects.length || activeProgram.projectCount;

  const heroHeadlineLines = heroHeadline
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const hotelGallery = settings.hotelGallery || [];
  const safeHotelIdx = hotelGallery.length > 0 ? activeHotelIdx % hotelGallery.length : 0;
  const activeHotelPhoto = hotelGallery[safeHotelIdx];

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

  const togglePackageDetails = (code: string) => {
    setExpandedPackages((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const isAnyModalOpen =
    mobileMenuOpen ||
    Boolean(legalDialog) ||
    Boolean(previewPhoto) ||
    facilitiesModalOpen ||
    trainerModalOpen;

  const navLinks = [
    { href: '#tentang', label: 'Tentang' },
    { href: '#demo-aplikasi', label: 'Demo Aplikasi', highlight: true },
    { href: '#pemateri', label: 'Pemateri' },
    { href: '#materi', label: 'Materi' },
    { href: '#fasilitas', label: 'Paket' },
    { href: '#faq', label: 'FAQ' },
  ];

  const activeDay = fourDayTabs[activeDayTab] || fourDayTabs[0];

  return (
    <div id="beranda" className="min-h-screen overflow-x-hidden bg-[#080F1D] text-[#F8FAFC]">
      {/* =====================================================================
          TOP NAVIGATION (Strict 3-Zone Contract, Single Row, Zero Clutter)
         ===================================================================== */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#080F1D]/92 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <a
            href="#beranda"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
          >
            <BrandMark
              logoUrl={settings.logoUrl}
              brandName={settings.brandName || 'SAKITA'}
              variant="dark"
            />
          </a>

          <nav
            aria-label="Navigasi Utama"
            className="hidden items-center gap-6 text-sm font-medium text-[#94A3B8] lg:flex"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap shrink-0 transition-colors ${
                  link.highlight
                    ? 'text-[#22D3EE] hover:text-[#67E8F9]'
                    : 'hover:text-[#F8FAFC]'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => goToRegister()}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#22D3EE] px-4 text-sm font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90 whitespace-nowrap"
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
          <div className="border-t border-slate-800 bg-[#0F172A] px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-1 text-sm font-medium">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5 ${
                    link.highlight ? 'text-[#22D3EE]' : 'text-[#CBD5E1] hover:text-[#F8FAFC]'
                  }`}
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
            01. HERO SECTION (Executive Minimalist — Old Mock Dashboard Removed)
           =================================================================== */}
        <section className="relative overflow-hidden border-b border-slate-800/80 sakita-grid-bg py-7 sm:py-9 lg:py-12">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#6366F1]/12 via-[#22D3EE]/6 to-transparent"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-10">
              {/* Left Copy Column */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-7"
              >
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#22D3EE]">
                  SEKOLAH AI KITA (SAKITA) · {heroEyebrow}
                </p>

                <h1
                  className="mt-3 font-display font-bold tracking-tight text-[#F8FAFC] [text-wrap:balance]"
                  style={{ fontSize: 'clamp(2.1rem, 3.8vw, 3.45rem)', lineHeight: 1.08 }}
                >
                  {heroHeadlineLines.length >= 2 ? (
                    <>
                      <span className="block">{heroHeadlineLines[0]}</span>
                      <span className="mt-1 block text-[#22D3EE]">
                        {heroHeadlineLines.slice(1).join(' ')}
                      </span>
                    </>
                  ) : (
                    heroHeadline
                  )}
                </h1>

                <p className="mt-4 max-w-2xl font-display text-base font-medium leading-relaxed text-[#E2E8F0] sm:text-lg [text-wrap:balance]">
                  “{heroSubheadline}”
                </p>

                {/* Primary & Secondary CTAs */}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <a
                    href="#fasilitas"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#22D3EE] px-6 text-sm font-bold text-[#080F1D] transition-all hover:bg-[#22D3EE]/90 whitespace-nowrap shrink-0"
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
                    href="#demo-aplikasi"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#22D3EE]/45 bg-[#0F172A]/90 px-5 text-sm font-semibold text-[#22D3EE] transition-colors hover:border-[#22D3EE] hover:bg-[#0F172A] whitespace-nowrap shrink-0"
                  >
                    <span>Lihat Demo Aplikasi</span>
                  </a>
                </div>

                {/* 4 Concise Highlights */}
                <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    activeProgram.durationLabel,
                    `${moduleCount} Proyek Aplikasi Nyata`,
                    '100% Kelas Praktik',
                    'Tanpa Harus Bisa Coding',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-xl border border-slate-800/90 bg-[#0F172A]/80 px-3 py-2.5 text-xs font-medium text-[#E2E8F0]"
                    >
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#22D3EE]" />
                      <span className="leading-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Right Column: Clean Executive Investment & Schedule Card (No Fake Simulation) */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-5"
              >
                {heroBannerUrl ? (
                  <div className="relative aspect-[16/11] overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A]">
                    <ResolvedAssetImage
                      src={heroBannerUrl}
                      alt={`Banner ${activeProgram.name}`}
                      loading="eager"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080F1D]/90 via-[#080F1D]/45 to-transparent p-4">
                      <p className="text-xs font-semibold text-[#F8FAFC]">{activeProgram.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-700/80 bg-gradient-to-b from-[#0F1C34]/95 to-[#0A1324] p-5 shadow-[0_24px_60px_-28px_rgba(34,211,238,0.2)] sm:p-6">
                    {/* Prominent Price Summary */}
                    <div className="border-b border-slate-800/90 pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#22D3EE]">
                          Investasi Pelatihan Mulai
                        </p>
                        <span
                          className={`text-[11px] font-semibold ${
                            isProgramClosed || isProgramFull ? 'text-amber-400' : 'text-[#34D399]'
                          }`}
                        >
                          {isProgramClosed
                            ? 'Ditutup'
                            : isProgramFull
                              ? 'Daftar Tunggu'
                              : 'Pendaftaran Dibuka'}
                        </span>
                      </div>
                      <p className="mt-1.5 font-mono text-3xl font-bold tracking-tight text-[#F8FAFC] tabular-nums sm:text-4xl">
                        {formatRupiah(TRAINING_PACKAGES.paket_hemat.price)}
                      </p>
                      <p className="mt-1 text-xs text-[#94A3B8]">
                        Tersedia <strong className="text-[#E2E8F0]">Paket Hemat</strong> (tanpa
                        penginapan) &{' '}
                        <strong className="text-[#EBD077]">Paket Premium</strong> (dengan
                        penginapan).
                      </p>
                    </div>

                    {/* Confirmed Training Schedule & Quota */}
                    <dl className="mt-4 space-y-2.5 text-xs sm:text-[13px]">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="inline-flex items-center gap-2 text-[#94A3B8]">
                          <Calendar className="h-3.5 w-3.5 text-[#22D3EE]" />
                          <span>Tanggal</span>
                        </dt>
                        <dd className="font-semibold text-[#F8FAFC]">{activeProgram.dateLabel}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="inline-flex items-center gap-2 text-[#94A3B8]">
                          <MapPin className="h-3.5 w-3.5 text-[#22D3EE]" />
                          <span>Lokasi</span>
                        </dt>
                        <dd className="font-semibold text-[#F8FAFC] text-right">
                          {activeProgram.location}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="inline-flex items-center gap-2 text-[#94A3B8]">
                          <Users className="h-3.5 w-3.5 text-[#22D3EE]" />
                          <span>Kuota Kelas</span>
                        </dt>
                        <dd className="font-semibold text-[#EBD077] tabular-nums">
                          Kuota Terbatas {activeProgram.quota} Peserta
                        </dd>
                      </div>
                    </dl>

                    {/* Live Demo Quick Access Strip */}
                    {liveDemoApps.length > 0 && (
                      <div className="mt-4 border-t border-slate-800/90 pt-4">
                        <p className="text-[11px] font-medium text-[#CBD5E1]">
                          Bukan Sekadar Teori. Coba langsung demo aplikasi:
                        </p>
                        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {liveDemoApps.slice(0, 2).map((app) => (
                            <a
                              key={app.id}
                              href={app.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                trackMetaViewDemoApp({
                                  appName: app.name,
                                  appCategory: app.category,
                                })
                              }
                              className="inline-flex h-9 items-center justify-between gap-2 rounded-lg border border-slate-700/90 bg-[#080F1D]/85 px-3 text-xs font-semibold text-[#F8FAFC] transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE]"
                            >
                              <span className="truncate">{app.name}</span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#22D3EE]" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            02. PERMASALAHAN & SOLUSI (Compact 2-Column + Progressive Disclosure)
           =================================================================== */}
        <section id="tentang" className="border-b border-slate-800/80 py-7 sm:py-9 lg:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-5">
              {/* Left: Concise Challenge List */}
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-5 sm:p-6 lg:col-span-6">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#22D3EE]">
                  Tantangan Digitalisasi Lembaga
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl [text-wrap:balance]">
                  Teknologi Tidak Harus Mahal dan Rumit.
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {PROBLEMS.slice(0, 5).map((item, idx) => (
                    <li
                      key={item.title}
                      className="flex items-start gap-2.5 text-sm text-[#CBD5E1]"
                    >
                      <span className="mt-0.5 font-mono text-xs font-semibold text-[#94A3B8] tabular-nums">
                        0{idx + 1}
                      </span>
                      <span>{item.title}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: Strong SAKITA Solution Statement */}
              <div className="flex flex-col justify-between rounded-2xl border border-[#22D3EE]/30 bg-gradient-to-br from-[#0F1E3A] via-[#0F172A] to-[#080F1D] p-5 sm:p-6 lg:col-span-6">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#22D3EE]">
                    Solusi Sekolah AI Kita (SAKITA)
                  </p>
                  <p className="mt-3 font-display text-lg font-bold leading-snug text-[#F8FAFC] sm:text-xl [text-wrap:balance]">
                    “Bayangkan jika sekolah dan pesantren Bapak/Ibu mampu membangun sistem digital
                    sendiri, tanpa harus bergantung pada vendor aplikasi yang mahal.”
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#CBD5E1]">
                    Dengan kecerdasan buatan (AI), Anda belajar menerjemahkan kebutuhan nyata
                    menjadi aplikasi fungsional—hemat biaya untuk lembaga sekaligus membuka peluang
                    jasa & produk digital baru.
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                  <span className="font-mono text-[11px] font-medium text-[#EBD077]">
                    Belajar AI · Bangun Aplikasi · Peluang Penghasilan
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowProblemDetail((v) => !v)}
                    aria-expanded={showProblemDetail}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-[#080F1D]/80 px-3.5 text-xs font-semibold text-[#F8FAFC] transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE]"
                  >
                    <span>
                      {showProblemDetail ? 'Tutup Penjelasan' : 'Lihat Penjelasan Lengkap'}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        showProblemDetail ? 'rotate-180 text-[#22D3EE]' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Expandable Full Problem & 3-Pillar Explanation */}
            <AnimatePresence initial={false}>
              {showProblemDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {PROBLEMS.map((item, idx) => (
                        <div
                          key={item.title}
                          className="rounded-xl border border-slate-800 bg-[#0F172A]/60 p-4"
                        >
                          <p className="font-mono text-[11px] text-[#22D3EE] tabular-nums">
                            0{idx + 1}
                          </p>
                          <h3 className="mt-1 font-display text-sm font-semibold text-[#F8FAFC]">
                            {item.title}
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                            {item.detail}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-[#0F172A]/80 md:grid-cols-3 md:divide-x md:divide-y-0">
                      <div className="p-4 sm:p-5">
                        <p className="font-mono text-xs font-semibold text-[#22D3EE]">01</p>
                        <h3 className="mt-1 font-display text-base font-bold text-[#F8FAFC]">
                          Belajar AI Secara Praktis
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
                          Pelajari langkah terstruktur menerjemahkan ide dan alur kerja menjadi
                          sistem digital modern cukup dengan bahasa sehari-hari.
                        </p>
                      </div>
                      <div className="p-4 sm:p-5">
                        <p className="font-mono text-xs font-semibold text-[#22D3EE]">02</p>
                        <h3 className="mt-1 font-display text-base font-bold text-[#F8FAFC]">
                          Bangun Aplikasi Sendiri
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
                          Mandiri membuat aplikasi PPDB, keuangan, akademik, absensi, hingga website
                          lembaga sendiri tanpa bergantung pada vendor mahal.
                        </p>
                      </div>
                      <div className="p-4 sm:p-5">
                        <p className="font-mono text-xs font-semibold text-[#10B981]">03</p>
                        <h3 className="mt-1 font-display text-base font-bold text-[#F8FAFC]">
                          Buka Peluang Penghasilan Baru
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
                          Membekali Anda membuat dan menjual aplikasi siap pakai maupun jasa
                          pembuatan sistem digital kepada sekolah, pesantren, dan instansi lain.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ===================================================================
            03. KEUNGGULAN PELATIHAN (6 Compact Cards + Target Peserta Disclosure)
           =================================================================== */}
        <section
          id="program"
          className="border-b border-slate-800/80 bg-[#0F172A]/35 py-7 sm:py-9 lg:py-12"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#22D3EE]">
                  Keunggulan Program SAKITA
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl lg:text-4xl [text-wrap:balance]">
                  Bukan Sekadar Belajar AI. Saatnya Menciptakan Solusi Nyata.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowProgramDetail((v) => !v)}
                aria-expanded={showProgramDetail}
                className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-slate-700 bg-[#080F1D]/80 px-3.5 text-xs font-semibold text-[#E2E8F0] transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE] whitespace-nowrap"
              >
                <span>
                  {showProgramDetail
                    ? 'Tutup Target Peserta & Detail'
                    : 'Lihat Target Peserta & Detail Program'}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    showProgramDetail ? 'rotate-180 text-[#22D3EE]' : ''
                  }`}
                />
              </button>
            </div>

            {/* 6 Compact Advantage Cards */}
            <div className="mt-5 grid grid-cols-1 gap-3.5 sm:mt-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {TRAINING_ADVANTAGES.map((adv) => {
                const AdvIcon = adv.icon;
                return (
                  <div
                    key={adv.title}
                    className="flex items-start gap-3.5 rounded-2xl border border-slate-800/90 bg-[#0F172A]/80 p-4 transition-colors hover:border-[#22D3EE]/40 sm:p-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-[#080F1D] text-[#22D3EE]">
                      <AdvIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-bold text-[#F8FAFC] sm:text-base">
                        {adv.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#94A3B8] sm:text-[13px]">
                        {adv.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expandable Target Peserta, Active Program Details & Dual Opportunities */}
            <AnimatePresence initial={false}>
              {showProgramDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 space-y-5 border-t border-slate-800 pt-5">
                    {/* Active Program Summary & Copy Link */}
                    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#22D3EE]/25 bg-[#080F1D]/80 p-5 md:flex-row md:items-center">
                      <div className="max-w-2xl">
                        <p className="font-mono text-[11px] font-semibold text-[#22D3EE]">
                          {activeProgram.batchLabel}
                        </p>
                        <h3 className="mt-1 font-display text-lg font-bold text-[#F8FAFC]">
                          {activeProgram.name}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-[#94A3B8] sm:text-sm">
                          {activeProgram.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCopyProgramLink(activeProgram)}
                        className="inline-flex h-9 w-fit shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0F172A] px-3.5 text-xs font-semibold text-[#E2E8F0] transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Salin Link Program</span>
                      </button>
                    </div>

                    {/* Siapa yang Cocok Mengikuti Pelatihan Ini? */}
                    <div>
                      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#22D3EE]">
                        Target Peserta Pelatihan
                      </p>
                      <h3 className="mt-1 font-display text-lg font-bold text-[#F8FAFC] sm:text-xl">
                        Siapa yang Cocok Mengikuti Pelatihan Ini?
                      </h3>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {targetAudience.map((item) => {
                          const AudienceIcon = item.icon || GraduationCap;
                          return (
                            <div
                              key={item.role}
                              className="rounded-xl border border-slate-800 bg-[#0F172A]/75 p-4"
                            >
                              <AudienceIcon className="h-4 w-4 text-[#22D3EE]" />
                              <h4 className="mt-2 font-display text-sm font-semibold text-[#F8FAFC]">
                                {item.role}
                              </h4>
                              <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                                {item.desc}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Satu Pelatihan, Dua Peluang Besar */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-[#22D3EE]/25 bg-[#0F172A]/85 p-5">
                        <p className="font-mono text-[11px] font-semibold text-[#22D3EE]">
                          PELUANG 01
                        </p>
                        <h4 className="mt-1 font-display text-base font-bold text-[#F8FAFC]">
                          Kemandirian Digital Lembaga
                        </h4>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8] sm:text-sm">
                          Bangun dan kembangkan sistem digital sekolah atau pesantren Anda secara
                          mandiri, menekan ketergantungan pada vendor eksternal dan menyesuaikan
                          fitur sesuai kebutuhan nyata lembaga.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#10B981]/25 bg-[#0F172A]/85 p-5">
                        <p className="font-mono text-[11px] font-semibold text-[#10B981]">
                          PELUANG 02
                        </p>
                        <h4 className="mt-1 font-display text-base font-bold text-[#F8FAFC]">
                          Peluang Bisnis Digital
                        </h4>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8] sm:text-sm">
                          Keterampilan membangun dan mempublikasikan aplikasi berbasis AI membuka
                          wawasan merintis jasa pembuatan aplikasi bagi lembaga, UMKM, maupun
                          memasarkan produk digital.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Automatic Multi-Program Switcher (Only shown when Admin adds >1 active program) */}
            {programs.length > 1 && (
              <div className="mt-6 border-t border-slate-800 pt-5">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#22D3EE]">
                  Pilihan Pelatihan Aktif ({programs.length} Program)
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                  {programs.map((prog) => {
                    const isSelected = prog.id === activeProgram.id;
                    const progFull =
                      computeRemainingSeats(prog.quota, prog.confirmedCount, prog.reservedCount) <= 0;
                    const progClosed = prog.status !== 'open';
                    return (
                      <article
                        key={prog.id}
                        className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                          isSelected
                            ? 'border-[#22D3EE] bg-[#0F172A]'
                            : 'border-slate-800 bg-[#080F1D]/80 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-mono text-[#22D3EE]">{prog.batchLabel}</span>
                            <span
                              className={`font-semibold ${
                                progClosed || progFull ? 'text-amber-400' : 'text-[#10B981]'
                              }`}
                            >
                              {progClosed ? 'Ditutup' : progFull ? 'Daftar Tunggu' : 'Dibuka'}
                            </span>
                          </div>
                          <h4 className="mt-1.5 font-display text-base font-bold text-[#F8FAFC]">
                            {prog.name}
                          </h4>
                          <p className="mt-1 text-xs text-[#94A3B8]">
                            {prog.dateLabel} · {prog.location}
                          </p>
                        </div>
                        <div className="mt-3.5 flex items-center gap-2 border-t border-slate-800/80 pt-3">
                          <button
                            type="button"
                            onClick={() => selectProgram(prog, true)}
                            className={`inline-flex h-9 flex-1 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors ${
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
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-[#22D3EE] px-3 text-xs font-bold text-[#080F1D] hover:bg-[#22D3EE]/90 disabled:opacity-50"
                          >
                            <span>{progClosed ? 'Ditutup' : 'Daftar'}</span>
                          </button>
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
            04. 10 PROYEK NYATA & GALERI APLIKASI SAKITA (Unified Expandable Grid)
           =================================================================== */}
        <DemoAppGallerySection demoApps={demoApps} projects={projects} />

        {/* ===================================================================
            05. PROFIL PEMATERI UTAMA (Compact Editorial + Responsive Modal)
           =================================================================== */}
        <TrainerProfileSection
          trainers={trainers}
          activeProgram={activeProgram}
          moduleCount={moduleCount}
          onRegister={() => goToRegister()}
          onModalChange={setTrainerModalOpen}
        />

        {showMentorSection && trainers.length === 0 && (
          <section className="border-b border-slate-800/80 py-7 sm:py-9 lg:py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <p className="font-mono text-xs font-semibold text-[#22D3EE]">Profil Mentor</p>
              <div className="mt-4 grid grid-cols-1 items-center gap-6 rounded-2xl border border-slate-800 bg-[#0F172A] p-5 lg:grid-cols-12">
                <div className="lg:col-span-3">
                  {settings.mentor.photoUrl ? (
                    <ResolvedAssetImage
                      src={settings.mentor.photoUrl}
                      alt={settings.mentor.name}
                      className="aspect-square w-full rounded-xl border border-slate-800 object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#080F1D] text-[#94A3B8]">
                      <UserCheck className="h-8 w-8 text-[#22D3EE]/60" />
                    </div>
                  )}
                </div>
                <div className="lg:col-span-9">
                  <h2 className="font-display text-2xl font-bold text-[#F8FAFC]">
                    {settings.mentor.name}
                  </h2>
                  {settings.mentor.role && (
                    <p className="mt-1 text-sm font-medium text-[#22D3EE]">{settings.mentor.role}</p>
                  )}
                  {settings.mentor.bio && (
                    <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8] whitespace-pre-line">
                      {settings.mentor.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================
            06. MATERI & ALUR PELATIHAN 4 HARI (Interactive Horizontal Tabs)
           =================================================================== */}
        <section
          id="materi"
          className="border-b border-slate-800/80 bg-[#080F1D] py-7 sm:py-9 lg:py-12"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#22D3EE]">
                  Alur Praktik 4 Hari · {activeProgram.dateLabel}
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl lg:text-4xl [text-wrap:balance]">
                  Materi & Jadwal Praktik Terstruktur
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowDeliverables((v) => !v)}
                aria-expanded={showDeliverables}
                className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0F172A] px-3.5 text-xs font-semibold text-[#E2E8F0] transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE] whitespace-nowrap"
              >
                <span>
                  {showDeliverables ? 'Tutup Output Peserta' : 'Lihat 8 Output yang Dibawa Pulang'}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    showDeliverables ? 'rotate-180 text-[#22D3EE]' : ''
                  }`}
                />
              </button>
            </div>

            {/* Horizontal Day Tabs */}
            <div
              role="tablist"
              aria-label="Alur Pelatihan 4 Hari"
              className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:mt-6"
            >
              {fourDayTabs.map((tab, idx) => {
                const isActive = idx === activeDayTab;
                return (
                  <button
                    key={tab.dayLabel}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveDayTab(idx)}
                    className={`flex shrink-0 flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-all ${
                      isActive
                        ? 'border-[#22D3EE] bg-[#22D3EE]/12 text-[#F8FAFC]'
                        : 'border-slate-800 bg-[#0F172A]/70 text-[#94A3B8] hover:border-slate-700 hover:text-[#E2E8F0]'
                    }`}
                  >
                    <span
                      className={`font-display text-sm font-bold ${
                        isActive ? 'text-[#22D3EE]' : 'text-[#F8FAFC]'
                      }`}
                    >
                      {tab.dayLabel}
                    </span>
                    <span className="text-[11px] opacity-85">{tab.dateNote}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab Panel */}
            <div
              role="tabpanel"
              className="mt-4 rounded-2xl border border-slate-800 bg-[#0F172A]/75 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
                <div>
                  <span className="font-mono text-xs font-semibold text-[#22D3EE]">
                    {activeDay.dayLabel} · {activeDay.dateNote}
                  </span>
                  <h3 className="mt-1 font-display text-lg font-bold text-[#F8FAFC] sm:text-xl">
                    {activeDay.focusTitle}
                  </h3>
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-[#CBD5E1]">{activeDay.summary}</p>

              {/* Projects Practiced on Selected Day */}
              {activeDay.projects.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {activeDay.projects.map((proj) => (
                    <div
                      key={`${proj.number}-${proj.title}`}
                      className="rounded-xl border border-slate-800/90 bg-[#080F1D]/80 p-4"
                    >
                      <span className="font-mono text-[11px] font-semibold text-[#22D3EE] tabular-nums">
                        PROYEK {proj.number}
                      </span>
                      <h4 className="mt-1 font-display text-sm font-bold text-[#F8FAFC]">
                        {proj.title}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#94A3B8]">
                        {proj.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Daily Workshop Focus Points */}
              <ul className="mt-4 space-y-2 border-t border-slate-800/80 pt-4">
                {activeDay.highlights.map((hl) => (
                  <li key={hl} className="flex items-start gap-2.5 text-xs text-[#CBD5E1] sm:text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                    <span>{hl}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Expandable 8 Participant Deliverables */}
            <AnimatePresence initial={false}>
              {showDeliverables && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-5">
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#22D3EE]">
                      Yang Anda Bawa Pulang Setelah 4 Hari Pelatihan
                    </p>
                    <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {PARTICIPANT_DELIVERABLES.map((item, idx) => (
                        <li
                          key={item}
                          className="flex items-start gap-2.5 rounded-xl border border-slate-800/90 bg-[#080F1D]/70 px-3.5 py-2.5 text-xs text-[#E2E8F0] sm:text-sm"
                        >
                          <span className="font-mono text-[11px] font-semibold text-[#22D3EE] tabular-nums">
                            0{idx + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ===================================================================
            07. LOKASI & FASILITAS HOTEL (1 Primary Real Photo + Swipe Carousel + Modal)
           =================================================================== */}
        <section
          id="jadwal"
          className="border-b border-slate-800/80 bg-[#0F172A]/30 py-7 sm:py-9 lg:py-12"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-8">
              {/* Left Info + Countdown + Modal Trigger */}
              <div className="lg:col-span-5">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#22D3EE]">
                  Jadwal & Lokasi Pelatihan
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl [text-wrap:balance]">
                  {activeProgram.location}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1]">
                  Pelaksanaan tatap muka 4 hari intensif di suasana belajar yang kondusif, eksklusif
                  untuk maksimal {activeProgram.quota} peserta.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-3.5">
                    <p className="text-[#94A3B8]">Tanggal</p>
                    <p className="mt-0.5 font-display text-sm font-bold text-[#F8FAFC]">
                      {activeProgram.dateLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-3.5">
                    <p className="text-[#94A3B8]">Durasi & Kuota</p>
                    <p className="mt-0.5 font-display text-sm font-bold text-[#F8FAFC] tabular-nums">
                      4 Hari · Maks. {activeProgram.quota}
                    </p>
                  </div>
                </div>

                <div className="mt-3.5">
                  <CountdownTimer
                    targetIso={activeProgram.startDateIso || '2026-12-28T08:00:00+07:00'}
                  />
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setFacilitiesModalOpen(true)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#0F172A] px-4 text-xs font-semibold text-[#F8FAFC] transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE] sm:text-sm"
                  >
                    <Building2 className="h-4 w-4 text-[#22D3EE]" />
                    <span>Lihat Fasilitas Lengkap & Galeri Hotel</span>
                  </button>
                </div>
              </div>

              {/* Right: 1 Primary Real Hotel Photo + Swipeable Carousel */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/85 p-3.5 sm:p-4">
                  {activeHotelPhoto ? (
                    <>
                      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#080F1D]">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewPhoto({
                              url: activeHotelPhoto.url,
                              caption:
                                activeHotelPhoto.caption || `Foto ${activeProgram.location}`,
                            })
                          }
                          aria-label={`Perbesar ${activeHotelPhoto.caption || activeProgram.location}`}
                          className="group block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
                        >
                          <ResolvedAssetImage
                            src={activeHotelPhoto.url}
                            alt={activeHotelPhoto.caption || `Foto ${activeProgram.location}`}
                            className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        </button>

                        {hotelGallery.length > 1 && (
                          <>
                            <button
                              type="button"
                              aria-label="Foto hotel sebelumnya"
                              onClick={() =>
                                setActiveHotelIdx(
                                  (prev) => (prev - 1 + hotelGallery.length) % hotelGallery.length,
                                )
                              }
                              className="absolute left-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700/80 bg-[#080F1D]/80 text-white backdrop-blur-sm transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE]"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label="Foto hotel berikutnya"
                              onClick={() =>
                                setActiveHotelIdx((prev) => (prev + 1) % hotelGallery.length)
                              }
                              className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700/80 bg-[#080F1D]/80 text-white backdrop-blur-sm transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE]"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-[#080F1D]/90 via-[#080F1D]/45 to-transparent px-4 py-3">
                          <span className="truncate text-xs font-medium text-[#F8FAFC]">
                            {activeHotelPhoto.caption || activeProgram.location}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-slate-300 tabular-nums">
                            {safeHotelIdx + 1}/{hotelGallery.length}
                          </span>
                        </div>
                      </div>

                      {/* Horizontal Swipeable Real Photo Thumbnails */}
                      {hotelGallery.length > 1 && (
                        <div className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 no-scrollbar">
                          {hotelGallery.map((photo, idx) => (
                            <button
                              key={`${photo.url}-${idx}`}
                              type="button"
                              onClick={() => setActiveHotelIdx(idx)}
                              aria-label={`Pilih foto ${idx + 1}`}
                              className={`relative h-14 w-20 shrink-0 snap-start overflow-hidden rounded-lg border transition-all sm:h-16 sm:w-24 ${
                                idx === safeHotelIdx
                                  ? 'border-[#22D3EE] ring-1 ring-[#22D3EE]'
                                  : 'border-slate-800 opacity-65 hover:opacity-100'
                              }`}
                            >
                              <ResolvedAssetImage
                                src={photo.url}
                                alt={photo.caption || `Foto lokasi ${idx + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex aspect-[16/10] flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#080F1D]/70 p-6 text-center">
                      <ImageIcon className="h-7 w-7 text-slate-600" />
                      <p className="mt-2 text-xs font-medium text-[#94A3B8]">
                        Dokumentasi asli {activeProgram.location} dikelola langsung oleh admin SAKITA
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            08. PILIHAN PAKET PELATIHAN (Compact Cards + Collapsible Facility Details)
           =================================================================== */}
        <section
          id="fasilitas"
          className="border-b border-slate-800/80 bg-[#080F1D] py-7 sm:py-9 lg:py-12"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#22D3EE]">
                Investasi Pendidikan & Pilihan Paket
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl lg:text-4xl [text-wrap:balance]">
                Investasi Terjangkau, Peluang Tak Terbatas.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#E2E8F0] sm:text-base [text-wrap:balance]">
                Mulai dari Rp1.950.000, kamu sudah bisa belajar membangun 10 aplikasi nyata dan
                membuka peluang penghasilan baru di era AI.{' '}
                <span className="font-semibold text-[#22D3EE]">
                  Dua Pilihan Paket, Satu Kualitas Pembelajaran.
                </span>
              </p>
            </div>

            {/* Side-by-Side Pricing Cards */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2 lg:items-start lg:gap-5">
              {TRAINING_PACKAGE_LIST.map((pkg) => {
                const isGold = pkg.accent === 'gold';
                const isExpanded = Boolean(expandedPackages[pkg.code]);
                return (
                  <article
                    key={pkg.code}
                    className={`flex flex-col rounded-2xl border p-5 transition-all sm:p-6 ${
                      isGold
                        ? 'border-[#D4AF37]/50 bg-gradient-to-b from-[#131C31] via-[#0F172A] to-[#080F1D] shadow-[0_20px_50px_-28px_rgba(212,175,55,0.28)]'
                        : 'border-[#22D3EE]/40 bg-gradient-to-b from-[#0F172A] to-[#080F1D] shadow-[0_20px_50px_-28px_rgba(34,211,238,0.2)]'
                    }`}
                  >
                    {/* Header: Package Name + Lodging Clarity + Highlight */}
                    <div className="flex flex-wrap items-start justify-between gap-2.5">
                      <div>
                        <p
                          className={`font-mono text-xs font-bold uppercase tracking-[0.14em] ${
                            isGold ? 'text-[#D4AF37]' : 'text-[#22D3EE]'
                          }`}
                        >
                          {pkg.name}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#F8FAFC]">
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

                    {/* Price */}
                    <div className="mt-4 flex items-baseline gap-2 border-b border-slate-800/90 pb-4">
                      <span className="font-mono text-3xl font-bold tracking-tight text-[#F8FAFC] tabular-nums sm:text-4xl">
                        {formatRupiah(pkg.price)}
                      </span>
                      <span className="text-xs text-[#94A3B8]">/ peserta</span>
                    </div>

                    {/* Concise Lodging Clarification */}
                    <p
                      className={`mt-3.5 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                        isGold
                          ? 'border-[#D4AF37]/30 bg-[#D4AF37]/8 text-[#F5E6B3]'
                          : 'border-slate-700/90 bg-[#080F1D]/80 text-[#CBD5E1]'
                      }`}
                    >
                      <strong className={isGold ? 'text-[#EBD077]' : 'text-[#22D3EE]'}>
                        Penginapan:{' '}
                      </strong>
                      {pkg.includesLodging
                        ? 'Termasuk fasilitas penginapan di Hotel Grand Makmur, Jambi selama pelatihan.'
                        : 'Tidak termasuk penginapan hotel. Seluruh materi, praktik 10 aplikasi, dan kualitas pembelajaran sama penuh.'}
                    </p>

                    {/* Primary CTA Always Immediately Visible */}
                    <div className="mt-4">
                      <button
                        type="button"
                        disabled={isProgramClosed}
                        onClick={() => goToRegister(undefined, pkg.code)}
                        className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
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
                    </div>

                    {/* Progressive Disclosure Toggle: Lihat Rincian Fasilitas */}
                    <button
                      type="button"
                      onClick={() => togglePackageDetails(pkg.code)}
                      aria-expanded={isExpanded}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-[#080F1D]/60 py-2 text-xs font-semibold text-[#CBD5E1] transition-colors hover:border-slate-700 hover:text-[#F8FAFC]"
                    >
                      <span>{isExpanded ? 'Tutup Rincian Fasilitas' : 'Lihat Rincian Fasilitas'}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-[#22D3EE]' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-4 border-t border-slate-800/80 pt-4">
                            <div>
                              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                                Materi & Kualitas Pembelajaran (Sama di Kedua Paket)
                              </h3>
                              <ul className="mt-2.5 space-y-2">
                                {PACKAGE_LEARNING_BENEFITS.map((item) => (
                                  <li
                                    key={item}
                                    className="flex items-start gap-2 text-xs text-[#F8FAFC] sm:text-[13px]"
                                  >
                                    <Check
                                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                                        isGold ? 'text-[#EBD077]' : 'text-[#22D3EE]'
                                      }`}
                                    />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="border-t border-slate-800/80 pt-3.5">
                              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                                Fasilitas Pelatihan yang Termasuk
                              </h3>
                              <ul className="mt-2.5 space-y-2">
                                {pkg.confirmedFacilities.map((fac) => (
                                  <li
                                    key={fac}
                                    className="flex items-start gap-2 text-xs text-[#CBD5E1] sm:text-[13px]"
                                  >
                                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                                    <span>{fac}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </article>
                );
              })}
            </div>

            {/* Compact Trust, Quota & Official Registration Strip */}
            <div className="mt-5 rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <p className="font-display text-sm font-semibold text-[#F8FAFC] sm:text-base">
                    “Jangan biarkan keterbatasan biaya menghalangi langkahmu untuk menguasai
                    teknologi masa depan.”
                  </p>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    Kuota terbatas <strong className="text-[#F8FAFC]">maksimal {activeProgram.quota} peserta</strong>{' '}
                    (gabungan Paket Hemat & Premium) · Pembayaran transfer bank diverifikasi resmi
                    admin SAKITA.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowMechanismDetail((v) => !v)}
                    aria-expanded={showMechanismDetail}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-[#080F1D] px-3 text-[11px] font-semibold text-[#CBD5E1] hover:border-[#22D3EE] hover:text-[#22D3EE]"
                  >
                    <span>Alur Resmi</span>
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        showMechanismDetail ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLegalDialog('privacy')}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-[#080F1D] px-3 text-[11px] font-medium text-[#CBD5E1] hover:border-[#22D3EE] hover:text-[#22D3EE]"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    <span>Privasi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLegalDialog('terms')}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-[#080F1D] px-3 text-[11px] font-medium text-[#CBD5E1] hover:border-[#22D3EE] hover:text-[#22D3EE]"
                  >
                    <FileCheck2 className="h-3 w-3" />
                    <span>Ketentuan</span>
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {showMechanismDetail && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 md:grid-cols-3">
                      <div className="rounded-xl border border-slate-800 bg-[#080F1D]/80 p-3.5">
                        <p className="font-mono text-[11px] font-semibold text-[#22D3EE]">
                          01 · Pendaftaran Resmi
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                          Isi formulir, pilih paket Hemat/Premium, dan dapatkan nomor registrasi
                          serta tautan status pribadi.
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-[#080F1D]/80 p-3.5">
                        <p className="font-mono text-[11px] font-semibold text-[#22D3EE]">
                          02 · Transfer Bank Langsung
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                          Transfer ke rekening resmi SAKITA sesuai nominal paket, lalu unggah bukti
                          pembayaran secara aman.
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-[#080F1D]/80 p-3.5">
                        <p className="font-mono text-[11px] font-semibold text-[#10B981]">
                          03 · Verifikasi Admin & E-Tiket
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                          Setelah status terverifikasi LUNAS, e-tiket kehadiran dan akses Komunitas
                          SAKITA aktif otomatis.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* ===================================================================
            09. FAQ INTERAKTIF (All Closed by Default, Single-Open Accordion)
           =================================================================== */}
        <section
          id="faq"
          className="border-b border-slate-800/80 bg-[#0F172A]/25 py-7 sm:py-9 lg:py-12"
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#22D3EE]">
                Pertanyaan Umum
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl">
                Hal yang Sering Ditanyakan
              </h2>
            </div>

            <div className="mt-5 divide-y divide-slate-800/90 rounded-2xl border border-slate-800 bg-[#0F172A]/70 sm:mt-6">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={faq.question}>
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      <span className="font-display text-sm font-semibold text-[#F8FAFC] sm:text-base">
                        {faq.question}
                      </span>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isOpen
                            ? 'border-[#22D3EE]/50 bg-[#22D3EE]/10 text-[#22D3EE]'
                            : 'border-slate-700 text-[#94A3B8]'
                        }`}
                      >
                        {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 text-xs leading-relaxed text-[#94A3B8] sm:text-sm">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            10. FINAL CALL TO ACTION (Focused & High-Conversion)
           =================================================================== */}
        <section className="py-7 sm:py-9 lg:py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0F1E3A] via-[#0F172A] to-[#080F1D] p-6 text-center sm:p-9">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#22D3EE]">
                From Learning to Real Creation
              </p>
              <h2 className="mx-auto mt-2 max-w-3xl font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl [text-wrap:balance]">
                Jangan Hanya Jadi Pengguna Teknologi. Bangun Aplikasi Sendiri dan Ciptakan Peluang
                Baru.
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#CBD5E1]">
                {activeProgram.dateLabel} · {activeProgram.location} · Mulai{' '}
                {formatRupiah(TRAINING_PACKAGES.paket_hemat.price)} · Kuota Terbatas{' '}
                {activeProgram.quota} Peserta.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={isProgramClosed}
                  onClick={() => goToRegister()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#22D3EE] px-7 text-sm font-bold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <span>
                    {isProgramClosed
                      ? 'Pendaftaran Ditutup'
                      : isProgramFull
                        ? 'Daftar Tunggu'
                        : 'Daftar Sekarang'}
                  </span>
                  {!isProgramClosed && <ArrowRight className="h-4 w-4" />}
                </button>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleTrackWhatsappClick('final_cta_wa')}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#080F1D] px-5 text-sm font-semibold text-[#F8FAFC] transition-colors hover:border-[#10B981]/60 hover:text-[#10B981] whitespace-nowrap shrink-0"
                >
                  <MessageCircle className="h-4 w-4 text-[#10B981]" />
                  <span>WhatsApp {settings.whatsappNumber || '0851-2163-4560'}</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          QUIET FOOTER (With Bottom Clearance for Mobile Sticky CTA Bar)
         ===================================================================== */}
      <footer className="border-t border-slate-800 bg-[#080F1D] pb-24 pt-8 lg:pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <BrandMark
                logoUrl={settings.logoUrl}
                brandName="SEKOLAH AI KITA (SAKITA)"
                variant="dark"
              />
              <p className="mt-2 text-xs text-[#94A3B8]">
                {settings.tagline || 'Belajar AI, Berkarya untuk Masa Depan.'} · WhatsApp Resmi:{' '}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleTrackWhatsappClick('footer_wa_number')}
                  className="text-[#CBD5E1] hover:text-[#22D3EE]"
                >
                  {settings.whatsappNumber || '0851-2163-4560'}
                </a>
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#94A3B8] sm:text-sm">
              <a href="#demo-aplikasi" className="transition-colors hover:text-[#F8FAFC]">
                Demo Aplikasi
              </a>
              <a href="#fasilitas" className="transition-colors hover:text-[#F8FAFC]">
                Paket Pelatihan
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
                Syarat & Ketentuan
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

          <div className="mt-6 border-t border-slate-800/80 pt-5 text-xs text-slate-500">
            © {new Date().getFullYear()} Sekolah AI Kita (SAKITA). Seluruh hak cipta dilindungi.
          </div>
        </div>
      </footer>

      {/* Desktop-Only Subtle Floating WhatsApp Button */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => handleTrackWhatsappClick('floating_desktop_wa')}
        aria-label="Hubungi Admin SAKITA melalui WhatsApp"
        className="no-print fixed bottom-5 left-5 z-30 hidden h-10 items-center gap-2 rounded-full border border-[#10B981]/40 bg-[#0F172A]/95 px-4 text-xs font-semibold text-[#F8FAFC] shadow-lg backdrop-blur-md transition-colors hover:border-[#10B981] hover:text-[#10B981] lg:inline-flex"
      >
        <MessageCircle className="h-4 w-4 text-[#10B981]" />
        <span>Tanya Admin</span>
      </a>

      {/* Mobile Sticky Bottom CTA Bar — Compact, Auto-Hidden Whenever Any Modal/Drawer Opens */}
      {!isAnyModalOpen && (
        <div
          role="region"
          aria-label="Aksi Cepat Pendaftaran"
          className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/95 bg-[#080F1D]/95 px-3.5 py-2.5 shadow-[0_-10px_28px_-10px_rgba(0,0,0,0.8)] backdrop-blur-md lg:hidden"
        >
          <div className="mx-auto flex max-w-lg items-center justify-between gap-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#94A3B8]">
                Investasi Mulai
              </p>
              <p className="font-mono text-sm font-bold text-[#F8FAFC] tabular-nums">
                {formatRupiah(TRAINING_PACKAGES.paket_hemat.price)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleTrackWhatsappClick('mobile_sticky_wa')}
                aria-label="Tanya Admin via WhatsApp"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#10B981]/45 bg-[#0F172A] text-[#10B981]"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <button
                type="button"
                disabled={isProgramClosed}
                onClick={() => goToRegister()}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#22D3EE] px-4 text-xs font-bold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90 disabled:opacity-50 whitespace-nowrap"
              >
                <span>
                  {isProgramClosed
                    ? 'Ditutup'
                    : isProgramFull
                      ? 'Daftar Tunggu'
                      : 'Daftar Sekarang'}
                </span>
                {!isProgramClosed && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facilities & Full Real Hotel Gallery Modal */}
      {facilitiesModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="facilities-modal-title"
          onClick={() => setFacilitiesModalOpen(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#040914]/85 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-700/90 bg-[#0F172A] shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-[#080F1D] px-5 py-4">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#22D3EE]">
                  Lokasi & Fasilitas Resmi
                </p>
                <h3
                  id="facilities-modal-title"
                  className="font-display text-base font-bold text-[#F8FAFC] sm:text-lg"
                >
                  {activeProgram.location}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFacilitiesModalOpen(false)}
                aria-label="Tutup rincian fasilitas lokasi"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0F172A] px-3 text-xs font-semibold text-slate-200 hover:border-[#22D3EE] hover:text-[#22D3EE]"
              >
                <X className="h-4 w-4" />
                <span>Tutup</span>
              </button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-[#080F1D]/80 p-4">
                  <p className="font-mono text-[11px] font-semibold text-[#22D3EE]">
                    Fasilitas Pelatihan (Paket Hemat & Premium)
                  </p>
                  <ul className="mt-2.5 space-y-1.5 text-xs text-[#CBD5E1]">
                    {TRAINING_PACKAGES.paket_hemat.confirmedFacilities.map((fac) => (
                      <li key={fac} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                        <span>{fac}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-[#D4AF37]/30 bg-[#080F1D]/80 p-4">
                  <p className="font-mono text-[11px] font-semibold text-[#EBD077]">
                    Tambahan Penginapan (Paket Premium)
                  </p>
                  <ul className="mt-2.5 space-y-1.5 text-xs text-[#CBD5E1]">
                    {TRAINING_PACKAGES.paket_premium.confirmedFacilities.map((fac) => (
                      <li key={fac} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EBD077]" />
                        <span>{fac}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {hotelGallery.length > 0 && (
                <div className="mt-5">
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                    Galeri Foto Asli ({hotelGallery.length} Foto)
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {hotelGallery.map((photo, idx) => (
                      <figure
                        key={`${photo.url}-${idx}`}
                        className="overflow-hidden rounded-xl border border-slate-800 bg-[#080F1D]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewPhoto({
                              url: photo.url,
                              caption: photo.caption || `Foto ${activeProgram.location}`,
                            })
                          }
                          className="block w-full overflow-hidden"
                        >
                          <ResolvedAssetImage
                            src={photo.url}
                            alt={photo.caption || `Foto ${activeProgram.location}`}
                            className="aspect-[16/10] w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#080F1D]/92 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0F172A] shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              aria-label="Tutup tampilan foto"
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-[#080F1D]/85 text-[#F8FAFC] transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE]"
            >
              <X className="h-4 w-4" />
            </button>
            <ResolvedAssetImage
              src={previewPhoto.url}
              alt={previewPhoto.caption}
              className="max-h-[78vh] w-full bg-[#080F1D] object-contain"
            />
            {previewPhoto.caption && (
              <div className="border-t border-slate-800 px-5 py-3 text-sm text-[#F8FAFC]">
                {previewPhoto.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
