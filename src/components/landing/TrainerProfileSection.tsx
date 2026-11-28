import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Award,
  Blocks,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
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
  Users,
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
  'Seorang praktisi pendidikan, pimpinan pesantren, advokat, penulis, dan motivator yang mendalami Artificial Intelligence (AI) serta penerapannya dalam pengembangan aplikasi digital, transformasi pendidikan, dan inovasi bisnis.',
  'Berangkat dari pengalaman langsung dalam mengelola lembaga pendidikan, ia mengembangkan kompetensinya di bidang AI untuk menghadirkan solusi digital yang praktis serta membantu masyarakat membangun aplikasi secara mandiri dan membuka peluang usaha berbasis teknologi.',
];

const CONCISE_ACTIVITIES_FALLBACK: string[] = [
  'Founder Sekolah AI Kita (SAKITA)',
  'Praktisi AI & Pengembang Aplikasi Digital',
  'Pimpinan Pondok Qur’an Para Sahabat',
  'Ketua Yayasan Para Sahabat',
  'Advokat & Konsultan Hukum',
  'Pengajar Al-Qur’an',
  'Penulis & Motivator',
  'Mahasiswa Doktoral (S3) Pendidikan Agama Islam — UNISSULA',
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
}: TrainerProfileSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedDetails, setExpandedDetails] = useState(previewMode);

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

  const summaryParagraphs = isDefaultPrimaryBio
    ? SUMMARY_BIO_FALLBACK
    : bioParagraphs.slice(0, 2).length > 0
      ? bioParagraphs.slice(0, 2)
      : SUMMARY_BIO_FALLBACK;

  const extraBioParagraphs = isDefaultPrimaryBio
    ? bioParagraphs
    : bioParagraphs.slice(2);

  const summaryActivities =
    trainer.id === DEFAULT_PRIMARY_TRAINER.id &&
    trainer.background &&
    trainer.background.length >= 8
      ? CONCISE_ACTIVITIES_FALLBACK
      : trainer.background && trainer.background.length > 0
        ? trainer.background.slice(0, 8)
        : CONCISE_ACTIVITIES_FALLBACK;

  const collapsibleKeys = new Set<TrainerSectionKey>([
    'expertise',
    'background',
    'whyLearn',
    'statement',
  ]);

  const hasExpandableContent =
    extraBioParagraphs.length > 0 ||
    (visibility.expertise && trainer.expertise && trainer.expertise.length > 0) ||
    (visibility.whyLearn &&
      ((trainer.whyLearnPoints && trainer.whyLearnPoints.length > 0) ||
        Boolean(trainer.whyLearnNarrative))) ||
    (visibility.statement && Boolean(trainer.personalStatement));

  const renderSubsection = (key: TrainerSectionKey) => {
    if (!visibility[key]) return null;

    switch (key) {
      case 'expertise': {
        if (!trainer.expertise || trainer.expertise.length === 0) return null;
        return (
          <motion.div
            key="expertise"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pt-14 lg:pt-16"
          >
            <div className="flex flex-col gap-2 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs font-medium tracking-[0.18em] text-[#D4AF37]">
                  {trainer.expertiseTitle || 'Areas of Expertise'}
                </p>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {trainer.expertiseSubtitle || 'Kompetensi dan Bidang Keahlian'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 tabular-nums">
                {trainer.expertise.length} Bidang Keahlian Utama
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trainer.expertise.map((item, idx) => {
                const IconComp = EXPERTISE_ICON_MAP[item.icon] || Cpu;
                return (
                  <div
                    key={item.id || `${item.title}-${idx}`}
                    className="group flex flex-col rounded-2xl border border-white/10 bg-[#0B1C3A]/70 p-5 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/45 hover:bg-[#0E244A]/85"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2563EB]/35 bg-[#1246A0]/25 text-[#93C5FD] transition-colors group-hover:border-[#D4AF37]/40 group-hover:text-[#D4AF37]">
                        <IconComp className="h-5 w-5" />
                      </span>
                      <span className="font-mono text-[11px] font-medium text-slate-500 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h4 className="mt-4 font-display text-base font-semibold leading-snug text-white">
                      {item.title}
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300/90">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      }

      case 'background': {
        if (!trainer.background || trainer.background.length === 0) return null;
        return (
          <motion.div
            key="background"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pt-14 lg:pt-16"
          >
            <div className="rounded-3xl border border-white/10 bg-[#0A1935]/75 p-6 backdrop-blur-md sm:p-10">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <p className="font-mono text-xs font-medium tracking-[0.18em] text-[#D4AF37]">
                    {trainer.backgroundTitle || 'Professional Background'}
                  </p>
                  <h3 className="mt-2.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {trainer.backgroundSubtitle || 'Riwayat Aktivitas & Peran Profesional'}
                  </h3>
                  <div className="mt-5 h-px w-16 bg-gradient-to-r from-[#D4AF37] to-transparent" />
                  <p className="mt-4 text-sm leading-relaxed text-slate-300/85">
                    Rekam jejak nyata lintas pendidikan, kepemimpinan pesantren, hukum, literasi,
                    dan pengembangan teknologi kecerdasan buatan.
                  </p>
                </div>

                <div className="lg:col-span-8">
                  <ol className="relative space-y-3 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-gradient-to-b before:from-[#D4AF37]/60 before:via-[#2563EB]/40 before:to-transparent">
                    {trainer.background.map((role, idx) => (
                      <li key={`${role}-${idx}`} className="relative flex items-start gap-4 pl-10">
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#07152D] font-mono text-[11px] font-semibold text-[#D4AF37] tabular-nums"
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1 rounded-xl border border-white/8 bg-[#07152D]/65 px-4 py-3 text-sm font-medium leading-relaxed text-white transition-colors hover:border-[#2563EB]/45">
                          {role}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </motion.div>
        );
      }

      case 'tools': {
        if (!trainer.tools || trainer.tools.length === 0) return null;
        return (
          <motion.div
            key="tools"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="pt-14 lg:pt-16"
          >
            <div className="text-center">
              <p className="font-mono text-xs font-medium tracking-[0.18em] text-[#D4AF37]">
                Tools & Technologies
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {trainer.toolsTitle || 'Powered by Modern AI Technologies'}
              </h3>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
              {trainer.tools.map((tool, idx) => {
                const visual = getToolBrandVisual(tool);
                return (
                  <div
                    key={`${tool}-${idx}`}
                    className={`group flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#0B1C3A]/70 px-4 py-5 text-center backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:bg-[#102750]/85 ${visual.hoverBorderClass}`}
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${visual.badgeClass}`}
                    >
                      <ToolBrandLogo name={tool} />
                    </span>
                    <div>
                      <span className="block text-sm font-semibold tracking-tight text-white">
                        {tool}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] tracking-wider text-slate-400">
                        {visual.subtitle}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {trainer.toolsDisclaimer && (
              <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-relaxed text-slate-400">
                {trainer.toolsDisclaimer}
              </p>
            )}
          </motion.div>
        );
      }

      case 'portfolio': {
        const hasPortfolio = trainer.portfolio && trainer.portfolio.length > 0;
        if (!hasPortfolio) {
          if (!previewMode) return null;
          return (
            <div
              key="portfolio-preview-empty"
              className="mt-14 rounded-2xl border border-dashed border-[#D4AF37]/35 bg-[#0B1C3A]/40 p-6 text-center text-xs text-slate-300"
            >
              Section <strong>Portofolio Karya</strong> saat ini otomatis disembunyikan di halaman
              publik karena belum ada aplikasi yang ditambahkan oleh admin.
            </div>
          );
        }

        return (
          <motion.div
            key="portfolio"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="pt-14 lg:pt-16"
          >
            <div className="max-w-2xl">
              <p className="font-mono text-xs font-medium tracking-[0.18em] text-[#D4AF37]">
                {trainer.portfolioTitle || 'From Knowledge to Real Innovation'}
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {trainer.portfolioSubtitle || 'Bukan Sekadar Teori, tetapi Karya Nyata.'}
              </h3>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trainer.portfolio.map((item) => {
                const validDemo = isSafeHttpUrl(item.demoUrl);
                return (
                  <article
                    key={item.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B1C3A]/75 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/45"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-white/10 bg-[#07152D]">
                      <ResolvedAssetImage
                        src={item.screenshotUrl}
                        alt={`Screenshot ${item.name}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        fallback={
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#07152D] via-[#1246A0]/35 to-[#07152D] p-6 text-center">
                            <FolderKanban className="h-8 w-8 text-[#D4AF37]/75" />
                            <p className="mt-2.5 text-xs font-medium text-slate-300">
                              {item.name}
                            </p>
                          </div>
                        }
                      />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        {item.category && (
                          <span className="font-medium text-[#93C5FD]">{item.category}</span>
                        )}
                        {item.category && item.status && <span aria-hidden="true">·</span>}
                        {item.status && (
                          <span className="font-medium text-[#D4AF37]">{item.status}</span>
                        )}
                      </div>

                      <h4 className="mt-2 font-display text-lg font-bold text-white">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-300/90">
                          {item.description}
                        </p>
                      )}

                      {item.mainFeatures && item.mainFeatures.length > 0 && (
                        <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-xs text-slate-300">
                          {item.mainFeatures.map((feat, fIdx) => (
                            <li key={`${feat}-${fIdx}`} className="flex items-start gap-2">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {validDemo && (
                        <div className="mt-auto pt-5">
                          <a
                            href={item.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#2563EB]/60 bg-[#1246A0]/35 px-4 text-xs font-semibold text-white transition-colors hover:border-[#D4AF37]/60 hover:bg-[#1246A0]/60"
                          >
                            <span>Lihat Demo</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </motion.div>
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
          <motion.div
            key="whyLearn"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pt-14 lg:pt-16"
          >
            <div className="grid grid-cols-1 gap-8 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0D2144]/85 via-[#091834]/90 to-[#07152D] p-6 backdrop-blur-md sm:p-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5">
                <p className="font-mono text-xs font-medium tracking-[0.18em] text-[#D4AF37]">
                  Mengapa Belajar Bersama Pemateri Ini?
                </p>
                <h3 className="mt-3 font-display text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl [text-wrap:balance]">
                  {trainer.whyLearnTitle || 'Belajar dari Praktisi yang Memahami Kebutuhan Anda'}
                </h3>
                {trainer.whyLearnNarrative && (
                  <p className="mt-4 text-sm leading-relaxed text-slate-300/90 sm:text-base">
                    {trainer.whyLearnNarrative}
                  </p>
                )}
              </div>

              <div className="lg:col-span-7">
                <ul className="space-y-3">
                  {trainer.whyLearnPoints.map((point, idx) => (
                    <li
                      key={`${point}-${idx}`}
                      className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-[#07152D]/70 px-5 py-4 text-sm font-medium leading-relaxed text-white"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/12 text-[#D4AF37]">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        );
      }

      case 'statement': {
        if (!trainer.personalStatement) return null;
        return (
          <motion.div
            key="statement"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pt-14 lg:pt-16"
          >
            <figure className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#0F2650]/80 via-[#0A1A38]/90 to-[#07152D] px-6 py-10 text-center backdrop-blur-md sm:px-14 sm:py-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full bg-[#2563EB]/20 blur-3xl"
              />
              <div className="relative mx-auto max-w-3xl">
                <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]">
                  <Quote className="h-5 w-5" />
                </span>
                <blockquote className="mt-6 font-display text-xl font-medium leading-relaxed tracking-tight text-white sm:text-2xl [text-wrap:balance]">
                  “{trainer.personalStatement}”
                </blockquote>
                <figcaption className="mt-6 flex items-center justify-center gap-3 text-sm font-semibold text-[#D4AF37]">
                  <span className="h-px w-8 bg-[#D4AF37]/50" aria-hidden="true" />
                  <span>{trainer.personalStatementAuthor || trainer.fullName}</span>
                  <span className="h-px w-8 bg-[#D4AF37]/50" aria-hidden="true" />
                </figcaption>
              </div>
            </figure>
          </motion.div>
        );
      }

      case 'slogan': {
        if ((!trainer.sloganLines || trainer.sloganLines.length === 0) && !trainer.sloganEnglish) {
          return null;
        }
        return (
          <motion.div
            key="slogan"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="pt-14 text-center lg:pt-16"
          >
            <div className="mx-auto max-w-4xl border-y border-white/10 py-9">
              <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
                {trainer.sloganLines.map((line, idx) => (
                  <span
                    key={`${line}-${idx}`}
                    className="inline-flex items-center gap-5 font-display text-xl font-bold tracking-tight text-white sm:text-2xl"
                  >
                    <span>{line}</span>
                    {idx < trainer.sloganLines.length - 1 && (
                      <span className="hidden text-[#D4AF37]/60 sm:inline" aria-hidden="true">
                        ·
                      </span>
                    )}
                  </span>
                ))}
              </div>
              {trainer.sloganEnglish && (
                <p className="mt-3 font-mono text-xs tracking-[0.2em] text-[#D4AF37] uppercase">
                  {trainer.sloganEnglish}
                </p>
              )}
            </div>
          </motion.div>
        );
      }

      case 'cta': {
        const isClosed = activeProgram.status !== 'open';
        return (
          <motion.div
            key="cta"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="pt-12 lg:pt-14"
          >
            <div className="relative overflow-hidden rounded-3xl border border-[#2563EB]/45 bg-gradient-to-br from-[#1246A0]/35 via-[#0B1F42]/95 to-[#07152D] p-7 text-center sm:p-11">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#2563EB]/20 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[#D4AF37]/12 blur-3xl"
              />

              <div className="relative mx-auto max-w-3xl">
                <h3 className="font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-[2.1rem] [text-wrap:balance]">
                  {trainer.ctaHeadline ||
                    'Saatnya Anda Tidak Hanya Menjadi Pengguna AI, tetapi Menjadi Pencipta Solusi dengan AI.'}
                </h3>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                  {trainer.ctaSubheadline ||
                    'Belajar langsung bersama praktisi pendidikan dan teknologi melalui pelatihan intensif berbasis proyek nyata.'}
                </p>

                <div className="mt-8">
                  <button
                    type="button"
                    disabled={isClosed && !previewMode}
                    onClick={onRegister}
                    className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] via-[#1D4ED8] to-[#1246A0] px-7 py-3.5 text-sm font-bold tracking-wide text-white shadow-[0_12px_32px_-8px_rgba(37,99,235,0.55)] ring-1 ring-[#D4AF37]/50 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>
                      {trainer.ctaButtonLabel || 'BELAJAR LANGSUNG BERSAMA PEMATERI'}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#D4AF37]" />
                  </button>
                </div>

                {/* Consistent Program Supporting Info Strip */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 border-t border-white/10 pt-6 text-xs text-slate-200 sm:text-[13px]">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>{activeProgram.dateLabel}</span>
                  </span>
                  <span className="text-white/20" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>{activeProgram.location}</span>
                  </span>
                  <span className="text-white/20" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>{activeProgram.durationLabel}</span>
                  </span>
                  <span className="text-white/20" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Layers className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>{moduleCount} Proyek Aplikasi</span>
                  </span>
                  <span className="text-white/20" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Users className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>Maksimal {activeProgram.quota} Peserta</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      }

      default:
        return null;
    }
  };

  const expandedOrder = order.filter((k) => collapsibleKeys.has(k));
  const alwaysVisibleOrder = order.filter((k) => !collapsibleKeys.has(k));

  return (
    <section
      id={previewMode ? undefined : 'pemateri'}
      aria-labelledby="trainer-section-heading"
      className="relative overflow-hidden border-b border-slate-800/80 bg-[#07152D] py-20 lg:py-28"
    >
      {/* Subtle Ambient Lighting & Architectural Islamic Geometric Micro-Pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='72' height='72' viewBox='0 0 72 72' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23D4AF37' stroke-width='0.8'%3E%3Cpath d='M36 4L44 28L68 36L44 44L36 68L28 44L4 36L28 28Z'/%3E%3Ccircle cx='36' cy='36' r='10'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '72px 72px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full bg-[#1246A0]/25 blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/3 h-[360px] w-[360px] rounded-full bg-[#2563EB]/15 blur-[100px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Multi-trainer switcher (only shown when admin publishes >1 trainer) */}
        {trainers.length > 1 && (
          <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#0B1C3A]/80 p-1">
              {trainers.map((t, idx) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedIndex(idx);
                    setExpandedDetails(previewMode);
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
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

        {/* Top Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="font-mono text-xs font-semibold tracking-[0.22em] text-[#D4AF37]">
              {trainer.eyebrow || 'MEET YOUR TRAINER'}
            </p>
            <h2
              id="trainer-section-heading"
              className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              {trainer.sectionSubtitle || 'Kenali Pemateri Utama Anda'}
            </h2>
          </div>
          {trainer.roleBadge && (
            <span className="inline-flex w-fit items-center rounded-md border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.2em] text-[#D4AF37]">
              {trainer.roleBadge}
            </span>
          )}
        </motion.div>

        {/* Primary Split Card: Portrait (Left Desktop / Top Mobile) + Prominent Trainer Identity & Concise Profile (Right Desktop / Bottom Mobile) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-white/12 bg-gradient-to-b from-[#0C1E3E]/85 to-[#081630]/95 p-5 shadow-[0_24px_70px_-24px_rgba(3,10,25,0.85)] backdrop-blur-md sm:p-8 lg:p-10"
        >
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-11">
            {/* Portrait Column — Preserves exact untouched trainer photo */}
            <div className="mx-auto w-full max-w-[340px] sm:max-w-[380px] lg:col-span-5 lg:max-w-none">
              <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-gradient-to-b from-[#1246A0]/30 via-[#0A1B38] to-[#07152D] p-2">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#07152D]">
                  <ResolvedAssetImage
                    src={trainer.photoUrl}
                    alt={`${trainer.fullName} — ${trainer.titlePrimary}`}
                    loading="lazy"
                    className="h-full w-full object-cover object-top"
                    fallback={
                      <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#1246A0]/45 via-[#0A1C3C] to-[#07152D] px-6 text-center">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-[#07152D]/85 font-display text-3xl font-bold tracking-wider text-[#D4AF37] shadow-inner">
                          {getInitials(trainer.fullName)}
                        </div>
                        <p className="mt-5 font-display text-lg font-bold text-white">
                          {trainer.fullName}
                        </p>
                        <p className="mt-1 text-xs font-medium text-[#D4AF37]">
                          {trainer.titlePrimary}
                        </p>
                      </div>
                    }
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#07152D]/70 via-[#07152D]/15 to-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Editorial Identity & Profile Column — Trainer Name as Dominant Primary Identity */}
            <div className="flex flex-col justify-center lg:col-span-7">
              <div className="border-b border-white/10 pb-6">
                <h3
                  className="font-display font-bold tracking-tight text-white"
                  style={{ fontSize: 'clamp(1.65rem, 3vw, 2.55rem)', lineHeight: 1.14 }}
                >
                  {trainer.fullName}
                </h3>

                {trainer.titlePrimary && (
                  <p className="mt-2.5 font-display text-base font-semibold text-[#22D3EE] sm:text-lg">
                    {trainer.titlePrimary}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-200">
                  {trainer.titleSecondary && (
                    <span className="font-medium">{trainer.titleSecondary}</span>
                  )}
                  {trainer.titleSecondary && trainer.pillarsLabel && (
                    <span className="hidden text-white/25 sm:inline" aria-hidden="true">
                      |
                    </span>
                  )}
                  {trainer.pillarsLabel && (
                    <span className="font-mono text-xs tracking-[0.14em] text-[#D4AF37]">
                      {trainer.pillarsLabel}
                    </span>
                  )}
                </div>

                {/* Personal Branding Headline */}
                <p className="mt-5 border-l-2 border-[#D4AF37] pl-4 font-display text-lg font-bold leading-snug tracking-tight text-white sm:text-xl">
                  {trainer.headline || 'Dari Dunia Pendidikan Menuju Inovasi Digital.'}
                </p>
              </div>

              {/* Concise 2-Paragraph Summary Profile */}
              <div className="mt-5 space-y-3.5 text-sm leading-[1.8] text-slate-300 sm:text-[15px]">
                {summaryParagraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              {/* Concise Professional Activities Grid */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#07152D]/70 p-4 sm:p-5">
                <p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-[#D4AF37] uppercase">
                  Aktivitas & Peran Profesional
                </p>
                <ul className="mt-3.5 grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
                  {summaryActivities.map((activity, idx) => (
                    <li
                      key={`${activity}-${idx}`}
                      className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-200 sm:text-[13px]"
                    >
                      <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-[#22D3EE]/12 text-[#22D3EE]">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>{activity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Expand/Collapse Full Biodata & Competencies Button */}
              {hasExpandableContent && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedDetails((v) => !v)}
                    aria-expanded={expandedDetails}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/45 bg-[#D4AF37]/10 px-5 text-xs font-semibold tracking-wide text-[#F8FAFC] transition-colors hover:border-[#D4AF37] hover:bg-[#D4AF37]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                  >
                    <span>
                      {expandedDetails
                        ? 'Tutup Profil Lengkap'
                        : 'Baca Profil Selengkapnya'}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-[#D4AF37] transition-transform duration-200 ${
                        expandedDetails ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <span className="text-xs text-slate-400">
                    {expandedDetails
                      ? 'Menampilkan biodata lengkap, bidang keahlian, dan pernyataan pemateri.'
                      : 'Lihat biodata lengkap & 8 bidang keahlian pemateri'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Expandable Detailed Biodata, Expertise, Background, Why Learn & Statement */}
        {expandedDetails && (
          <div className="mt-8 space-y-2">
            {extraBioParagraphs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-white/10 bg-[#0A1935]/75 p-6 sm:p-8"
              >
                <p className="font-mono text-xs font-medium tracking-[0.18em] text-[#D4AF37]">
                  Profil Lengkap Pemateri
                </p>
                {trainer.subheadline && (
                  <p className="mt-3 font-display text-base font-semibold leading-relaxed text-white sm:text-lg">
                    {trainer.subheadline}
                  </p>
                )}
                <div className="mt-4 space-y-3.5 text-sm leading-[1.8] text-slate-300 sm:text-[15px]">
                  {extraBioParagraphs.map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </motion.div>
            )}
            {expandedOrder.map((key) => renderSubsection(key))}
          </div>
        )}

        {/* Always-Visible Core Subsections (Tools with Official Brand Logos, Portfolio if configured, Slogan & CTA) */}
        {alwaysVisibleOrder.map((key) => renderSubsection(key))}
      </div>
    </section>
  );
}
