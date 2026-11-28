import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Building2,
  CalendarCheck,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Globe,
  GraduationCap,
  Info,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Utensils,
  Wallet,
} from 'lucide-react';
import { ResolvedAssetImage } from '../ResolvedAssetImage';
import { DEMO_APP_STATUS_META } from '../../lib/defaults';
import { trackMetaViewDemoApp } from '../../lib/metaPixel';
import { isSafeHttpUrl } from '../../lib/sakitaService';
import type { DemoAppItem, ProjectItem } from '../../types';

interface DemoAppGallerySectionProps {
  demoApps: DemoAppItem[];
  projects?: ProjectItem[];
}

const APP_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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
  Sparkles,
  Layers,
  ShieldCheck,
  GraduationCap,
};

function getAppIcon(iconKey: string) {
  return APP_ICON_MAP[iconKey] || LayoutDashboard;
}

/**
 * Compact, clearly labeled "Ilustrasi" preview shown ONLY inside the expanded
 * detail drawer when an admin has not uploaded an actual screenshot yet.
 */
function CompactDemoIllustration({ app, isFinance }: { app: DemoAppItem; isFinance: boolean }) {
  const isPpdb =
    app.id.includes('ppdb') ||
    app.name.toLowerCase().includes('ppdb') ||
    app.category.toLowerCase().includes('penerimaan');

  const kpis = isFinance
    ? [
        { label: 'Tagihan SPP', value: 'Otomatis', tone: 'text-[#EBD077]' },
        { label: 'Pembayaran', value: 'Tercatat', tone: 'text-[#34D399]' },
        { label: 'Laporan', value: 'Real-time', tone: 'text-[#22D3EE]' },
      ]
    : isPpdb
      ? [
          { label: 'Pendaftar', value: 'Online', tone: 'text-[#22D3EE]' },
          { label: 'Verifikasi', value: 'Berkas', tone: 'text-[#34D399]' },
          { label: 'Seleksi', value: 'Kelulusan', tone: 'text-[#EBD077]' },
        ]
      : [
          { label: 'Modul', value: 'Digital', tone: 'text-[#22D3EE]' },
          { label: 'Data', value: 'Terpusat', tone: 'text-slate-200' },
          { label: 'Akses', value: 'Cloud', tone: 'text-[#34D399]' },
        ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-[#0B162C] via-[#0F1E3A] to-[#080F1D] p-3.5">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-600" />
          <span className="h-2 w-2 rounded-full bg-slate-600" />
          <span className="h-2 w-2 rounded-full bg-slate-600" />
          <span className="ml-1.5 font-mono text-[10px] text-slate-400 truncate max-w-[180px]">
            {app.name}
          </span>
        </div>
        <span className="rounded border border-slate-600/80 bg-[#080F1D]/90 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-300">
          Ilustrasi
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {kpis.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-800 bg-[#080F1D]/85 px-2.5 py-2"
          >
            <p className="text-[10px] text-slate-400">{item.label}</p>
            <p className={`mt-0.5 font-mono text-xs font-bold ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DemoAppGallerySection({ demoApps, projects = [] }: DemoAppGallerySectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleApps = demoApps
    .filter((app) => app.isVisible)
    .sort((a, b) => a.orderNumber - b.orderNumber || a.name.localeCompare(b.name));

  const availableApps = visibleApps.filter(
    (app) => app.status === 'demo_tersedia' && isSafeHttpUrl(app.demoUrl),
  );
  const upcomingApps = visibleApps.filter(
    (app) => !(app.status === 'demo_tersedia' && isSafeHttpUrl(app.demoUrl)),
  );

  // Prioritize live demos at the top, followed by upcoming catalog items
  const orderedApps = [...availableApps, ...upcomingApps];
  const totalCatalogCount = Math.max(visibleApps.length, projects.length, 10);
  const availableCount = availableApps.length;

  const findMatchingProject = (app: DemoAppItem): ProjectItem | undefined => {
    const orderStr = String(app.orderNumber).padStart(2, '0');
    return (
      projects.find((p) => p.number === orderStr) ||
      projects[app.orderNumber - 1]
    );
  };

  const handleOpenDemo = (app: DemoAppItem) => {
    trackMetaViewDemoApp({
      appName: app.name,
      appCategory: app.category,
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section
      id="demo-aplikasi"
      className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-[#080F1D] via-[#0B1528] to-[#080F1D] py-7 sm:py-9 lg:py-12"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-[#22D3EE]/6 via-transparent to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Compact Executive Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#22D3EE]">
              Galeri & 10 Proyek Aplikasi SAKITA
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl lg:text-4xl [text-wrap:balance]">
              10 Proyek Nyata, 10 Solusi Digital
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1] sm:text-base">
              Bukan sekadar belajar AI. Bangun aplikasi yang bermanfaat dan berpotensi menjadi
              peluang bisnis.{' '}
              <span className="font-semibold text-[#F8FAFC]">
                Bukan Sekadar Janji, Lihat dan Buktikan Sendiri!
              </span>
            </p>
          </div>

          {/* Dynamic Availability Indicator */}
          <div className="shrink-0 rounded-xl border border-[#22D3EE]/30 bg-[#0F172A]/90 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
              Status Katalog Demo
            </p>
            <p className="mt-0.5 flex items-center gap-2 font-display text-sm font-bold text-[#F8FAFC] sm:text-base tabular-nums">
              <span className="h-2 w-2 rounded-full bg-[#10B981]" />
              <span>
                {availableCount} dari {totalCatalogCount} Demo Aplikasi Tersedia
              </span>
            </p>
          </div>
        </div>

        {/* Unified 10-Project Showroom (Compact Cards + Progressive Disclosure Detail) */}
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:mt-6 sm:gap-4 md:grid-cols-2 lg:gap-4">
          {orderedApps.map((app) => {
            const Icon = getAppIcon(app.icon);
            const isAvailable = app.status === 'demo_tersedia' && isSafeHttpUrl(app.demoUrl);
            const isFinance =
              app.id.includes('finance') || app.name.toLowerCase().includes('finance');
            const numLabel = String(app.orderNumber).padStart(2, '0');
            const statusMeta =
              DEMO_APP_STATUS_META[app.status] ||
              (isAvailable ? DEMO_APP_STATUS_META.demo_tersedia : DEMO_APP_STATUS_META.segera_hadir);
            const isExpanded = expandedId === app.id;
            const matchedProject = findMatchingProject(app);
            const shortLine =
              app.subtitle || matchedProject?.title || app.category;
            const fullDescription =
              app.description?.trim() ||
              matchedProject?.description ||
              `Proyek praktik ${app.name} dalam kurikulum 10 aplikasi digital Sekolah AI Kita.`;

            return (
              <article
                key={app.id}
                className={`flex flex-col overflow-hidden rounded-2xl border transition-colors ${
                  isAvailable
                    ? isFinance
                      ? 'border-[#D4AF37]/40 bg-gradient-to-b from-[#111A2E] to-[#0A1324] hover:border-[#D4AF37]/65'
                      : 'border-[#22D3EE]/40 bg-gradient-to-b from-[#0F1B33] to-[#0A1324] hover:border-[#22D3EE]/65'
                    : 'border-slate-800/90 bg-[#0F172A]/70 hover:border-slate-700'
                }`}
              >
                {/* Compact Header + Actions Row */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          isAvailable
                            ? isFinance
                              ? 'border-[#D4AF37]/40 bg-[#D4AF37]/12 text-[#EBD077]'
                              : 'border-[#22D3EE]/40 bg-[#22D3EE]/12 text-[#22D3EE]'
                            : 'border-slate-700/80 bg-[#080F1D] text-[#22D3EE]'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                          <span className="font-mono font-semibold text-slate-400 tabular-nums">
                            {numLabel}
                          </span>
                          <span className="text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span
                            className={`font-medium truncate ${
                              isAvailable
                                ? isFinance
                                  ? 'text-[#EBD077]'
                                  : 'text-[#22D3EE]'
                                : 'text-[#94A3B8]'
                            }`}
                          >
                            {app.category}
                          </span>
                        </div>
                        <h3 className="mt-0.5 font-display text-base font-bold leading-snug text-[#F8FAFC] sm:text-lg">
                          {app.name}
                        </h3>
                        <p className="mt-0.5 line-clamp-1 text-xs text-[#94A3B8] sm:text-[13px]">
                          {shortLine}
                        </p>
                      </div>
                    </div>

                    {/* Honest Status Indicator */}
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                        isAvailable
                          ? 'border-[#10B981]/40 bg-[#10B981]/12 text-[#34D399]'
                          : statusMeta.tone === 'amber'
                            ? 'border-amber-500/35 bg-amber-500/10 text-amber-300'
                            : 'border-slate-700 bg-[#080F1D]/80 text-slate-400'
                      }`}
                    >
                      {isAvailable ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      <span>{statusMeta.label}</span>
                    </span>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
                    {isAvailable && (
                      <a
                        href={app.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleOpenDemo(app)}
                        className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-all whitespace-nowrap ${
                          isFinance
                            ? 'bg-gradient-to-r from-[#D4AF37] to-[#E5C55C] text-[#080F1D] hover:brightness-105'
                            : 'bg-[#22D3EE] text-[#080F1D] hover:bg-[#22D3EE]/90'
                        }`}
                      >
                        <span>Coba Demo</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(app.id)}
                      aria-expanded={isExpanded}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-700/90 bg-[#080F1D]/80 px-3 text-xs font-semibold text-[#E2E8F0] transition-colors hover:border-[#22D3EE]/60 hover:text-[#22D3EE] whitespace-nowrap"
                    >
                      <span>{isExpanded ? 'Tutup Detail' : 'Lihat Detail'}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-[#22D3EE]' : ''
                        }`}
                      />
                    </button>

                    {!isAvailable && (
                      <span className="ml-auto text-[11px] text-slate-500">
                        Kurikulum Praktik
                      </span>
                    )}
                    {isAvailable && (
                      <span className="ml-auto hidden text-[11px] text-slate-400 sm:inline">
                        Buka di tab baru
                      </span>
                    )}
                  </div>
                </div>

                {/* Expandable Progressive Disclosure Detail */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden border-t border-slate-800/80 bg-[#080F1D]/70"
                    >
                      <div className="space-y-4 p-4 sm:p-5">
                        {/* Visual Preview only inside expanded detail */}
                        {app.screenshotUrl ? (
                          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-800 bg-[#080F1D]">
                            <ResolvedAssetImage
                              src={app.screenshotUrl}
                              alt={`Tampilan aplikasi ${app.name}`}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute right-2.5 top-2.5 rounded border border-slate-700/80 bg-[#080F1D]/85 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-200">
                              Tampilan Demo
                            </span>
                          </div>
                        ) : isAvailable ? (
                          <CompactDemoIllustration app={app} isFinance={isFinance} />
                        ) : null}

                        <p className="text-xs leading-relaxed text-[#CBD5E1] sm:text-sm">
                          {fullDescription}
                        </p>

                        {app.features.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                              Fitur Utama yang Dipelajari
                            </p>
                            <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                              {app.features.map((feat) => (
                                <li
                                  key={feat}
                                  className="flex items-start gap-2 text-xs text-[#E2E8F0]"
                                >
                                  <Check
                                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                                      isFinance ? 'text-[#EBD077]' : 'text-[#22D3EE]'
                                    }`}
                                  />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {matchedProject?.benefit && (
                          <div className="rounded-lg border border-slate-800 bg-[#0F172A]/80 px-3.5 py-2.5 text-xs leading-relaxed text-[#CBD5E1]">
                            <span className="font-semibold text-[#10B981]">Manfaat Lembaga: </span>
                            {matchedProject.benefit}
                          </div>
                        )}

                        {isAvailable && (
                          <div className="pt-1">
                            <a
                              href={app.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleOpenDemo(app)}
                              className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-all ${
                                isFinance
                                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#E5C55C] text-[#080F1D] hover:brightness-105'
                                  : 'bg-[#22D3EE] text-[#080F1D] hover:bg-[#22D3EE]/90'
                              }`}
                            >
                              <span>Coba Aplikasi Sekarang</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <p className="mt-1.5 text-center text-[11px] text-[#94A3B8]">
                              Terbuka di tab baru · Website SAKITA tetap aktif
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </div>

        {/* Compact Conversion Strip */}
        <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#22D3EE]/30 bg-gradient-to-r from-[#0F1E3A] via-[#0F172A] to-[#0B162C] p-5 sm:mt-6 sm:p-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h3 className="font-display text-lg font-bold tracking-tight text-[#F8FAFC] sm:text-xl">
              Dari Pengguna AI Menjadi{' '}
              <span className="text-[#22D3EE]">Pencipta Solusi Digital.</span>
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#CBD5E1] sm:text-sm">
              Bukan hanya memakai aplikasinya, Anda belajar membangunnya sendiri untuk lembaga
              maupun peluang jasa digital.{' '}
              <span className="font-semibold text-[#EBD077]">
                Investasi pelatihan mulai Rp1.950.000.
              </span>
            </p>
          </div>
          <a
            href="#fasilitas"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#22D3EE] px-5 text-xs font-bold text-[#080F1D] transition-all hover:bg-[#22D3EE]/90 sm:text-sm whitespace-nowrap"
          >
            <span>Saya Ingin Bisa Membuat Aplikasi Ini</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* Concise Honest Demo Mode Disclaimer */}
        <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-slate-800/80 bg-[#0F172A]/50 px-4 py-2.5 text-[11px] leading-relaxed text-[#94A3B8] sm:text-xs">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22D3EE]" />
          <p>
            Aplikasi yang ditampilkan merupakan versi demonstrasi untuk memberikan gambaran hasil
            pembelajaran. Gunakan data simulasi dan jangan memasukkan informasi pribadi atau
            keuangan yang sebenarnya.
          </p>
        </div>
      </div>
    </section>
  );
}
