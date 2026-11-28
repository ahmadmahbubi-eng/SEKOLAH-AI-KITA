import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Blocks,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  Clapperboard,
  Clock,
  Compass,
  Cpu,
  ExternalLink,
  FolderKanban,
  Globe,
  GraduationCap,
  Layers,
  MapPin,
  Quote,
  Terminal,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { ResolvedAssetImage } from '../ResolvedAssetImage';
import { getToolBrandVisual, ToolBrandLogo } from './ToolBrandLogo';
import {
  DEFAULT_PRIMARY_TRAINER,
  DEFAULT_TRAINER_SECTION_ORDER,
  DEFAULT_TRAINER_SECTION_VISIBILITY,
} from '../../lib/defaults';
import { isSafeHttpUrl } from '../../lib/sakitaService';
import type { Program, TrainerProfile, TrainerSectionKey } from '../../types';

interface TrainerProfileSectionProps {
  trainers: TrainerProfile[];
  activeProgram: Program;
  moduleCount: number;
  onRegister: () => void;
  previewMode?: boolean;
  onModalChange?: (open: boolean) => void;
}

const EXPERTISE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Cpu,
  Layers,
  Terminal,
  Blocks,
  GraduationCap,
  Clapperboard,
  Briefcase,
  Compass,
  BookOpen,
  Globe,
  Award,
  FolderKanban,
};

const SUMMARY_BIO_FALLBACK: string[] = [
  'Praktisi pendidikan, pimpinan pesantren, advokat, penulis, dan motivator yang mendalami Artificial Intelligence (AI) serta penerapannya dalam pengembangan aplikasi digital, transformasi pendidikan, dan inovasi bisnis.',
  'Berangkat dari pengalaman langsung mengelola lembaga pendidikan, ia menghadirkan pendekatan praktik membangun aplikasi secara mandiri tanpa latar belakang coding.',
];

function getInitials(name: string): string {
  const clean = name
    .replace(/,.*$/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (clean.length === 0) return 'AM';
  if (clean.length === 1) return clean[0].slice(0, 2).toUpperCase();
  return `${clean[0][0]}${clean[1][0]}`.toUpperCase();
}

export function TrainerProfileSection({
  trainers,
  activeProgram,
  moduleCount,
  onRegister,
  previewMode = false,
  onModalChange,
}: TrainerProfileSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    onModalChange?.(modalOpen);
    return () => {
      onModalChange?.(false);
    };
  }, [modalOpen, onModalChange]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [modalOpen]);

  if (!trainers || trainers.length === 0) return null;

  const safeIndex = selectedIndex < trainers.length ? selectedIndex : 0;
  const trainer = trainers[safeIndex];
  const visibility = {
    ...DEFAULT_TRAINER_SECTION_VISIBILITY,
    ...(trainer.sectionVisibility || {}),
  };
  const order: TrainerSectionKey[] =
    trainer.sectionOrder && trainer.sectionOrder.length > 0
      ? trainer.sectionOrder
      : DEFAULT_TRAINER_SECTION_ORDER;

  const bioParagraphs = (trainer.bio || '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const isDefaultPrimaryBio =
    trainer.id === DEFAULT_PRIMARY_TRAINER.id &&
    (!trainer.bio || trainer.bio.trim() === DEFAULT_PRIMARY_TRAINER.bio.trim());

  const shortBio = isDefaultPrimaryBio
    ? SUMMARY_BIO_FALLBACK[0]
    : bioParagraphs[0] || SUMMARY_BIO_FALLBACK[0];

  const fullBioParagraphs = bioParagraphs.length > 0 ? bioParagraphs : SUMMARY_BIO_FALLBACK;

  const renderModalSubsection = (key: TrainerSectionKey) => {
    if (!visibility[key]) return null;

    switch (key) {
      case 'expertise': {
        if (!trainer.expertise || trainer.expertise.length === 0) return null;
        return (
          <div key="expertise" className="border-t border-white/10 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
                  {trainer.expertiseTitle || 'Areas of Expertise'}
                </p>
                <h4 className="mt-1 font-display text-lg font-bold text-white sm:text-xl">
                  {trainer.expertiseSubtitle || 'Kompetensi dan Bidang Keahlian'}
                </h4>
              </div>
              <span className="text-xs text-slate-400 tabular-nums">
                {trainer.expertise.length} Bidang Keahlian
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {trainer.expertise.map((item, idx) => {
                const IconComp = EXPERTISE_ICON_MAP[item.icon] || Cpu;
                return (
                  <div
                    key={item.id || `${item.title}-${idx}`}
                    className="rounded-xl border border-white/10 bg-[#0B1C3A]/75 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2563EB]/35 bg-[#1246A0]/25 text-[#93C5FD]">
                        <IconComp className="h-4 w-4" />
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h5 className="mt-3 font-display text-sm font-semibold text-white">
                      {item.title}
                    </h5>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300/90">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'background': {
        if (!trainer.background || trainer.background.length === 0) return null;
        return (
          <div key="background" className="border-t border-white/10 pt-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
              {trainer.backgroundTitle || 'Professional Background'}
            </p>
            <h4 className="mt-1 font-display text-lg font-bold text-white sm:text-xl">
              {trainer.backgroundSubtitle || 'Riwayat Aktivitas & Peran Profesional'}
            </h4>
            <ol className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {trainer.background.map((role, idx) => (
                <li
                  key={`${role}-${idx}`}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#07152D]/75 px-3.5 py-3 text-xs font-medium leading-relaxed text-slate-200 sm:text-[13px]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#D4AF37]/40 bg-[#D4AF37]/10 font-mono text-[10px] font-semibold text-[#D4AF37] tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span>{role}</span>
                </li>
              ))}
            </ol>
          </div>
        );
      }

      case 'tools': {
        if (!trainer.tools || trainer.tools.length === 0) return null;
        return (
          <div key="tools" className="border-t border-white/10 pt-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
              Tools & Technologies
            </p>
            <h4 className="mt-1 font-display text-lg font-bold text-white sm:text-xl">
              {trainer.toolsTitle || 'Powered by Modern AI Technologies'}
            </h4>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {trainer.tools.map((tool, idx) => {
                const visual = getToolBrandVisual(tool);
                return (
                  <div
                    key={`${tool}-${idx}`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0B1C3A]/75 px-3 py-2.5"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${visual.badgeClass}`}
                    >
                      <ToolBrandLogo name={tool} />
                    </span>
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-white">
                        {tool}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-slate-400">
                        {visual.subtitle}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {trainer.toolsDisclaimer && (
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                {trainer.toolsDisclaimer}
              </p>
            )}
          </div>
        );
      }

      case 'portfolio': {
        const hasPortfolio = trainer.portfolio && trainer.portfolio.length > 0;
        if (!hasPortfolio) return null;
        return (
          <div key="portfolio" className="border-t border-white/10 pt-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
              {trainer.portfolioTitle || 'From Knowledge to Real Innovation'}
            </p>
            <h4 className="mt-1 font-display text-lg font-bold text-white sm:text-xl">
              {trainer.portfolioSubtitle || 'Bukan Sekadar Teori, tetapi Karya Nyata.'}
            </h4>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {trainer.portfolio.map((item) => {
                const validDemo = isSafeHttpUrl(item.demoUrl);
                return (
                  <article
                    key={item.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0B1C3A]/75"
                  >
                    <div className="aspect-[16/10] w-full overflow-hidden border-b border-white/10 bg-[#07152D]">
                      <ResolvedAssetImage
                        src={item.screenshotUrl}
                        alt={`Screenshot ${item.name}`}
                        className="h-full w-full object-cover"
                        fallback={
                          <div className="flex h-full w-full flex-col items-center justify-center bg-[#07152D] p-4 text-center">
                            <FolderKanban className="h-6 w-6 text-[#D4AF37]/75" />
                            <p className="mt-1.5 text-xs font-medium text-slate-300">{item.name}</p>
                          </div>
                        }
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h5 className="font-display text-sm font-bold text-white">{item.name}</h5>
                      {item.description && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-300">
                          {item.description}
                        </p>
                      )}
                      {validDemo && (
                        <a
                          href={item.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#2563EB]/60 bg-[#1246A0]/35 px-3 text-xs font-semibold text-white hover:border-[#D4AF37]/60"
                        >
                          <span>Lihat Demo</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        );
      }

      case 'whyLearn': {
        if (
          (!trainer.whyLearnPoints || trainer.whyLearnPoints.length === 0) &&
          !trainer.whyLearnNarrative
        ) {
          return null;
        }
        return (
          <div key="whyLearn" className="border-t border-white/10 pt-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
              Mengapa Belajar Bersama Pemateri Ini?
            </p>
            <h4 className="mt-1 font-display text-lg font-bold text-white sm:text-xl">
              {trainer.whyLearnTitle || 'Belajar dari Praktisi yang Memahami Kebutuhan Anda'}
            </h4>
            {trainer.whyLearnNarrative && (
              <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                {trainer.whyLearnNarrative}
              </p>
            )}
            <ul className="mt-3.5 space-y-2">
              {trainer.whyLearnPoints.map((point, idx) => (
                <li
                  key={`${point}-${idx}`}
                  className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#07152D]/70 px-4 py-3 text-xs font-medium leading-relaxed text-white sm:text-sm"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      }

      case 'statement': {
        if (!trainer.personalStatement) return null;
        return (
          <figure
            key="statement"
            className="mt-6 rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#0F2650]/75 via-[#0A1A38]/90 to-[#07152D] p-5 text-center sm:p-7"
          >
            <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]">
              <Quote className="h-4 w-4" />
            </span>
            <blockquote className="mt-4 font-display text-base font-medium leading-relaxed text-white sm:text-lg [text-wrap:balance]">
              “{trainer.personalStatement}”
            </blockquote>
            <figcaption className="mt-4 text-xs font-semibold text-[#D4AF37]">
              — {trainer.personalStatementAuthor || trainer.fullName}
            </figcaption>
          </figure>
        );
      }

      case 'slogan': {
        if ((!trainer.sloganLines || trainer.sloganLines.length === 0) && !trainer.sloganEnglish) {
          return null;
        }
        return (
          <div key="slogan" className="mt-6 border-y border-white/10 py-5 text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {trainer.sloganLines.map((line, idx) => (
                <span
                  key={`${line}-${idx}`}
                  className="inline-flex items-center gap-3 font-display text-sm font-bold text-white sm:text-base"
                >
                  <span>{line}</span>
                  {idx < trainer.sloganLines.length - 1 && (
                    <span className="text-[#D4AF37]/60" aria-hidden="true">
                      ·
                    </span>
                  )}
                </span>
              ))}
            </div>
            {trainer.sloganEnglish && (
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#D4AF37]">
                {trainer.sloganEnglish}
              </p>
            )}
          </div>
        );
      }

      case 'cta': {
        const isClosed = activeProgram.status !== 'open';
        return (
          <div
            key="cta"
            className="mt-6 rounded-2xl border border-[#22D3EE]/30 bg-gradient-to-br from-[#0F244A]/80 to-[#07152D] p-5 text-center sm:p-6"
          >
            <h4 className="font-display text-lg font-bold text-white sm:text-xl [text-wrap:balance]">
              {trainer.ctaHeadline ||
                'Saatnya Anda Tidak Hanya Menjadi Pengguna AI, tetapi Menjadi Pencipta Solusi dengan AI.'}
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
              {trainer.ctaSubheadline ||
                'Belajar langsung bersama praktisi pendidikan dan teknologi melalui pelatihan intensif berbasis proyek nyata.'}
            </p>
            <div className="mt-4">
              <button
                type="button"
                disabled={isClosed && !previewMode}
                onClick={() => {
                  setModalOpen(false);
                  onRegister();
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#22D3EE] px-6 text-xs font-bold text-[#080F1D] transition-all hover:bg-[#22D3EE]/90 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
              >
                <span>{trainer.ctaButtonLabel || 'Belajar Langsung Bersama Pemateri'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-white/10 pt-3.5 text-[11px] text-slate-300">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3 text-[#D4AF37]" />
                {activeProgram.dateLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-[#D4AF37]" />
                {activeProgram.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3 text-[#D4AF37]" />
                {activeProgram.durationLabel}
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Layers className="h-3 w-3 text-[#D4AF37]" />
                {moduleCount} Proyek
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Users className="h-3 w-3 text-[#D4AF37]" />
                Maks. {activeProgram.quota} Peserta
              </span>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <section
      id={previewMode ? undefined : 'pemateri'}
      aria-labelledby="trainer-section-heading"
      className="relative overflow-hidden border-b border-slate-800/80 bg-[#07152D] py-7 sm:py-9 lg:py-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-[#1246A0]/20 blur-[90px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Multi-trainer switcher (only shown when admin publishes >1 trainer) */}
        {trainers.length > 1 && (
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#0B1C3A]/80 p-1">
              {trainers.map((t, idx) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedIndex(idx);
                    setModalOpen(false);
                  }}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    idx === safeIndex
                      ? 'bg-[#1246A0] text-white ring-1 ring-[#D4AF37]/40'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t.fullName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section Eyebrow & Heading */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
              {trainer.eyebrow || 'MEET YOUR TRAINER'}
            </p>
            <h2
              id="trainer-section-heading"
              className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl"
            >
              {trainer.sectionSubtitle || 'Kenali Pemateri Utama Anda'}
            </h2>
          </div>
          {trainer.roleBadge && (
            <span className="inline-flex w-fit items-center rounded-md border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 font-mono text-[11px] font-semibold tracking-[0.16em] text-[#D4AF37]">
              {trainer.roleBadge}
            </span>
          )}
        </div>

        {/* Compact Luxury Editorial Card */}
        <div className="mt-5 rounded-2xl border border-white/12 bg-gradient-to-b from-[#0C1E3E]/85 to-[#081630]/95 p-4 shadow-[0_20px_50px_-24px_rgba(3,10,25,0.85)] sm:mt-6 sm:p-6 lg:p-7">
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-8">
            {/* Real Untouched Trainer Photo (Compact Frame) */}
            <div className="mx-auto w-full max-w-[240px] sm:max-w-[270px] lg:col-span-4 lg:max-w-[300px]">
              <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#0A1B38] p-1.5">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#07152D]">
                  <ResolvedAssetImage
                    src={trainer.photoUrl}
                    alt={`${trainer.fullName} — ${trainer.titlePrimary}`}
                    loading="lazy"
                    className="h-full w-full object-cover object-top"
                    fallback={
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#1246A0]/45 via-[#0A1C3C] to-[#07152D] px-5 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-[#07152D]/85 font-display text-2xl font-bold text-[#D4AF37]">
                          {getInitials(trainer.fullName)}
                        </div>
                        <p className="mt-3 font-display text-sm font-bold text-white">
                          {trainer.fullName}
                        </p>
                      </div>
                    }
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#07152D]/70 to-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Compact Editorial Bio & Primary Action */}
            <div className="lg:col-span-8">
              <h3
                className="font-display font-bold tracking-tight text-white"
                style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.25rem)', lineHeight: 1.15 }}
              >
                {trainer.fullName}
              </h3>

              {trainer.titlePrimary && (
                <p className="mt-1.5 font-display text-base font-semibold text-[#22D3EE] sm:text-lg">
                  {trainer.titlePrimary}
                </p>
              )}

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300 sm:text-sm">
                {trainer.titleSecondary && <span className="font-medium">{trainer.titleSecondary}</span>}
                {trainer.titleSecondary && trainer.pillarsLabel && (
                  <span className="text-white/25" aria-hidden="true">
                    ·
                  </span>
                )}
                {trainer.pillarsLabel && (
                  <span className="font-mono text-[11px] tracking-[0.12em] text-[#D4AF37]">
                    {trainer.pillarsLabel}
                  </span>
                )}
              </div>

              <p className="mt-4 border-l-2 border-[#D4AF37] pl-3.5 font-display text-base font-bold leading-snug text-white sm:text-lg">
                {trainer.headline || 'Dari Dunia Pendidikan Menuju Inovasi Digital.'}
              </p>

              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {shortBio}
              </p>

              {/* Compact Official AI Tools Strip */}
              {visibility.tools && trainer.tools && trainer.tools.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Ekosistem AI yang Dipraktikkan
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {trainer.tools.map((tool, idx) => {
                      const visual = getToolBrandVisual(tool);
                      return (
                        <div
                          key={`${tool}-${idx}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#07152D]/80 px-2.5 py-1.5"
                        >
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-md border ${visual.badgeClass} [&_svg]:h-3.5 [&_svg]:w-3.5`}
                          >
                            <ToolBrandLogo name={tool} />
                          </span>
                          <span className="text-xs font-medium text-slate-200">{tool}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Progressive Disclosure Trigger: Open Full Profile Modal */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/55 bg-[#D4AF37]/12 px-5 text-xs font-bold tracking-wide text-[#F8FAFC] transition-colors hover:border-[#D4AF37] hover:bg-[#D4AF37]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] sm:text-sm"
                >
                  <UserRound className="h-4 w-4 text-[#D4AF37]" />
                  <span>Lihat Profil Lengkap</span>
                </button>
                <span className="text-xs text-slate-400">
                  Biodata, riwayat peran, {trainer.expertise?.length || 8} bidang keahlian &
                  pernyataan pemateri
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Full Profile Responsive Modal */}
        {modalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="trainer-modal-title"
            onClick={() => setModalOpen(false)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#040914]/85 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-700/90 bg-[#091731] shadow-2xl sm:rounded-2xl"
            >
              {/* Sticky Modal Header */}
              <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#071328] px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
                    Profil Lengkap Pemateri
                  </p>
                  <h3
                    id="trainer-modal-title"
                    className="truncate font-display text-base font-bold text-white sm:text-lg"
                  >
                    {trainer.fullName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Tutup profil lengkap pemateri"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0F172A] px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE]"
                >
                  <X className="h-4 w-4" />
                  <span>Tutup</span>
                </button>
              </div>

              {/* Scrollable Modal Body */}
              <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                {/* Identity Summary inside Modal */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-[#D4AF37]/40 bg-[#07152D]">
                    <ResolvedAssetImage
                      src={trainer.photoUrl}
                      alt={trainer.fullName}
                      className="h-full w-full object-cover object-top"
                      fallback={
                        <div className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-[#D4AF37]">
                          {getInitials(trainer.fullName)}
                        </div>
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold text-white sm:text-xl">
                      {trainer.fullName}
                    </p>
                    {trainer.titlePrimary && (
                      <p className="mt-0.5 text-sm font-semibold text-[#22D3EE]">
                        {trainer.titlePrimary}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-300">
                      {[trainer.titleSecondary, trainer.pillarsLabel].filter(Boolean).join(' · ')}
                    </p>
                    {trainer.subheadline && (
                      <p className="mt-2.5 text-xs font-medium leading-relaxed text-slate-200 sm:text-sm">
                        {trainer.subheadline}
                      </p>
                    )}
                  </div>
                </div>

                {/* Full Biography Paragraphs */}
                <div className="mt-5 space-y-3 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {fullBioParagraphs.map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>

                {/* All Configured Trainer Subsections */}
                <div className="mt-6 space-y-6">
                  {order.map((key) => renderModalSubsection(key))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
