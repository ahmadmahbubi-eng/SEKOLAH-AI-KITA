import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Info,
  Loader2,
  Lock,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { LegalModal } from '../components/landing/LegalModal';
import { useToast } from '../context/ToastContext';
import {
  DEFAULT_BANK_SETTINGS,
  DEFAULT_PROGRAM,
  DEFAULT_WEBSITE_SETTINGS,
  getParticipantPackageInfo,
  getTrainingPackageByCode,
  PACKAGE_LEARNING_BENEFITS,
  TRAINING_PACKAGE_LIST,
} from '../lib/defaults';
import {
  computeRemainingSeats,
  formatRupiah,
  normalizeWhatsappID,
  toWhatsappLink,
} from '../lib/format';
import {
  createRegistrationTransaction,
  fetchBankSettings,
  fetchPublicPrograms,
  fetchRegistrationTicket,
  fetchWebsiteSettings,
  submitPaymentProofTransaction,
  uploadProofFileWithProgress,
} from '../lib/sakitaService';
import {
  trackMetaCompleteRegistration,
  trackMetaInitiateCheckout,
  trackMetaLead,
} from '../lib/metaPixel';
import type {
  BankSettings,
  Program,
  RegistrationTicket,
  TrainingPackageCode,
  WebsiteSettings,
} from '../types';

interface RegisterPageProps {
  navigate: (path: string) => void;
  initialProgramId?: string;
  initialPackageCode?: string;
  resumeToken?: string;
}

interface BiodataForm {
  fullName: string;
  gender: 'Laki-laki' | 'Perempuan';
  whatsapp: string;
  email: string;
  institution: string;
  position: string;
  city: string;
  province: string;
  aiExperience: string;
  expectations: string;
}

const STEPS = [
  { num: 1, label: 'Biodata Peserta' },
  { num: 2, label: 'Konfirmasi Data' },
  { num: 3, label: 'Pembayaran' },
  { num: 4, label: 'Unggah Bukti' },
];

const INITIAL_BIODATA: BiodataForm = {
  fullName: '',
  gender: 'Laki-laki',
  whatsapp: '',
  email: '',
  institution: '',
  position: '',
  city: '',
  province: '',
  aiExperience: '',
  expectations: '',
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];

export function RegisterPage({
  navigate,
  initialProgramId,
  initialPackageCode,
  resumeToken,
}: RegisterPageProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initialResolvedPkg = getTrainingPackageByCode(initialPackageCode);

  const [loadingInit, setLoadingInit] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(initialProgramId || DEFAULT_PROGRAM.id);
  const [selectedPackageCode, setSelectedPackageCode] = useState<TrainingPackageCode | ''>(
    initialResolvedPkg ? initialResolvedPkg.code : '',
  );
  const [packageError, setPackageError] = useState('');
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [bankSettings, setBankSettings] = useState<BankSettings>(DEFAULT_BANK_SETTINGS);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [biodata, setBiodata] = useState<BiodataForm>(INITIAL_BIODATA);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof BiodataForm, string>>>({});
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [legalDialog, setLegalDialog] = useState<'privacy' | 'terms' | null>(null);

  const [submittingReg, setSubmittingReg] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<RegistrationTicket | null>(null);
  const [createdEmail, setCreatedEmail] = useState('');
  const [createdPosition, setCreatedPosition] = useState('');

  // Step 4 payment proof state
  const [senderName, setSenderName] = useState('');
  const [senderBank, setSenderBank] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transferAmount, setTransferAmount] = useState<string>(
    String(initialResolvedPkg ? initialResolvedPkg.price : 1950000),
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [copiedField, setCopiedField] = useState<'account' | 'amount' | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [dbPrograms, webSet, bankSet] = await Promise.all([
          fetchPublicPrograms(),
          fetchWebsiteSettings(),
          fetchBankSettings(),
        ]);
        if (!active) return;
        setSettings(webSet);
        setBankSettings(bankSet);
        const openProgs = dbPrograms.filter((p) => p.status === 'open');
        setPrograms(openProgs);

        const preferred =
          openProgs.find((p) => p.id === initialProgramId || p.slug === initialProgramId) ||
          openProgs.find((p) => p.isFeatured) ||
          openProgs[0];
        if (preferred) {
          setSelectedProgramId(preferred.id);
          const prePkg = getTrainingPackageByCode(initialPackageCode);
          if (prePkg) {
            setSelectedPackageCode(prePkg.code);
            setTransferAmount(String(prePkg.price));
          } else {
            setTransferAmount(String(preferred.price));
          }
          if (!resumeToken) {
            trackMetaInitiateCheckout({
              programId: preferred.id,
              programName: prePkg ? `${preferred.name} — ${prePkg.name}` : preferred.name,
              price: prePkg ? prePkg.price : 1950000,
            });
          }
        }

        // If resuming with secure accessToken (e.g., re-upload proof or continue payment)
        if (resumeToken && resumeToken.length >= 32) {
          const ticket = await fetchRegistrationTicket(resumeToken);
          if (active && ticket) {
            setCreatedTicket(ticket);
            setSelectedProgramId(ticket.programId);
            if (ticket.packageCode) {
              setSelectedPackageCode(ticket.packageCode);
            }
            setTransferAmount(String(ticket.amount));
            setSenderName(ticket.fullName);
            if (ticket.paymentStatus === 'menunggu_verifikasi' || ticket.paymentStatus === 'lunas') {
              navigate(`/status/${encodeURIComponent(ticket.accessToken)}`);
              return;
            }
            setStep(ticket.paymentStatus === 'minta_bukti_ulang' ? 4 : 3);
          }
        }
      } catch (err) {
        console.error('Failed loading registration data:', err);
      } finally {
        if (active) setLoadingInit(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [initialProgramId, initialPackageCode, resumeToken, navigate]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const activeProgram = programs.find((p) => p.id === selectedProgramId) || programs[0] || null;
  const selectedPackage = getTrainingPackageByCode(selectedPackageCode);
  const ticketPackageInfo = createdTicket ? getParticipantPackageInfo(createdTicket) : null;
  const activeDisplayAmount = createdTicket
    ? createdTicket.amount
    : selectedPackage
      ? selectedPackage.price
      : null;

  const remainingSeats = activeProgram
    ? computeRemainingSeats(activeProgram.quota, activeProgram.confirmedCount, activeProgram.reservedCount)
    : 0;
  const isFull = activeProgram ? remainingSeats <= 0 : false;
  const waAdminLink = toWhatsappLink(
    settings.whatsappNumber || '085121634560',
    `Halo Admin SAKITA, saya membutuhkan bantuan pendaftaran${createdTicket ? ` (No. Registrasi: ${createdTicket.registrationNumber})` : ''}.`,
  );

  const handleSelectPackage = (code: TrainingPackageCode) => {
    setSelectedPackageCode(code);
    setPackageError('');
    const pkg = getTrainingPackageByCode(code);
    if (pkg) {
      setTransferAmount(String(pkg.price));
    }
  };

  const validateStep1 = (): boolean => {
    const errors: Partial<Record<keyof BiodataForm, string>> = {};
    if (!selectedPackage) {
      setPackageError('Wajib memilih salah satu paket pelatihan (Paket Hemat atau Paket Premium).');
    } else {
      setPackageError('');
    }
    if (biodata.fullName.trim().length < 2) errors.fullName = 'Nama lengkap beserta gelar wajib diisi.';
    const normalizedWa = normalizeWhatsappID(biodata.whatsapp);
    if (!/^62[0-9]{8,15}$/.test(normalizedWa)) {
      errors.whatsapp = 'Masukkan nomor WhatsApp Indonesia yang aktif (contoh: 085121634560).';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(biodata.email.trim())) {
      errors.email = 'Masukkan alamat email aktif yang valid.';
    }
    if (biodata.institution.trim().length < 2) errors.institution = 'Nama sekolah/pesantren/lembaga wajib diisi.';
    if (biodata.position.trim().length < 2) errors.position = 'Jabatan di lembaga wajib diisi.';
    if (biodata.city.trim().length < 2) errors.city = 'Kabupaten/kota wajib diisi.';
    if (biodata.province.trim().length < 2) errors.province = 'Provinsi wajib diisi.';

    setFieldErrors(errors);
    return Boolean(selectedPackage) && Object.keys(errors).length === 0;
  };

  const handleNextToStep2 = () => {
    if (!validateStep1()) {
      toast(
        'error',
        'Periksa kembali pilihan paket & biodata Anda',
        !selectedPackage
          ? 'Pilih Paket Hemat atau Paket Premium terlebih dahulu.'
          : 'Beberapa kolom wajib belum diisi dengan benar.',
      );
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmRegistration = async () => {
    if (!activeProgram) {
      toast('error', 'Program belum tersedia', 'Program pelatihan belum diaktifkan oleh administrator.');
      return;
    }
    if (!selectedPackage) {
      toast('error', 'Paket belum dipilih', 'Silakan kembali ke langkah 1 untuk memilih paket pelatihan.');
      setStep(1);
      return;
    }
    if (!agreePrivacy || !agreeTerms) {
      toast('error', 'Persetujuan diperlukan', 'Harap setujui Kebijakan Privasi dan Syarat Pendaftaran.');
      return;
    }
    if (submittingReg) return;

    setSubmittingReg(true);
    try {
      const { registration, ticket, isWaitlist } = await createRegistrationTransaction({
        programId: activeProgram.id,
        packageCode: selectedPackage.code,
        ...biodata,
        joinWaitlistIfFull: isFull,
      });

      // Fire Meta Pixel Lead & CompleteRegistration strictly AFTER registration data is saved & privacy agreed (deduplicated, zero PII)
      const regEventPayload = {
        registrationId: registration.id,
        registrationNumber: registration.registrationNumber,
        programId: registration.programId,
        programName: `${registration.programName} — ${registration.packageName || selectedPackage.name}`,
        amount: registration.amount,
        isWaitlist,
        privacyAccepted: agreePrivacy,
      };
      trackMetaLead(regEventPayload);
      trackMetaCompleteRegistration(regEventPayload);

      setCreatedTicket(ticket);
      setCreatedEmail(registration.email);
      setCreatedPosition(registration.position);
      setSenderName(registration.fullName);
      setTransferAmount(String(registration.amount));

      if (isWaitlist) {
        toast('success', 'Terdaftar pada Daftar Tunggu', `Nomor registrasi Anda: ${registration.registrationNumber}`);
        navigate(`/sukses/${encodeURIComponent(ticket.accessToken)}`);
        return;
      }

      toast(
        'success',
        'Data Pendaftaran Tersimpan',
        `Nomor registrasi resmi Anda: ${registration.registrationNumber}`,
      );
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pendaftaran. Coba lagi.';
      toast('error', 'Pendaftaran Gagal', msg);
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleCopy = async (text: string, type: 'account' | 'amount') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(type);
      toast('success', type === 'account' ? 'Nomor rekening disalin' : 'Nominal pembayaran disalin');
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast('error', 'Gagal menyalin ke clipboard');
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const lowerType = (file.type || '').toLowerCase();
    const isAllowedExt = /\.(jpe?g|png|pdf)$/.test(lowerName);
    const isAllowedMime = ALLOWED_MIME.includes(lowerType) || lowerType === 'image/jpg';
    if (!isAllowedMime && !isAllowedExt) {
      toast('error', 'Format file tidak didukung', 'Gunakan file berformat JPG, JPEG, PNG, atau PDF.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast('error', 'Ukuran file melebihi batas', 'Ukuran maksimal bukti pembayaran adalah 5 MB.');
      return;
    }
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(file);
    if (lowerType.startsWith('image/') || /\.(jpe?g|png)$/.test(lowerName)) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdTicket || submittingProof) return;

    if (senderName.trim().length < 2) {
      toast('error', 'Nama pengirim wajib diisi');
      return;
    }
    if (senderBank.trim().length < 2) {
      toast('error', 'Nama bank pengirim wajib diisi');
      return;
    }
    if (!transferDate) {
      toast('error', 'Tanggal transfer wajib diisi');
      return;
    }
    const numericAmount = Number(transferAmount.replace(/\D/g, ''));
    if (!numericAmount || numericAmount < 1000) {
      toast('error', 'Nominal transfer tidak valid');
      return;
    }
    if (!selectedFile) {
      toast('error', 'Bukti transfer belum dipilih', 'Unggah file JPG, PNG, atau PDF maks. 5 MB.');
      return;
    }

    setSubmittingProof(true);
    setUploadProgress(10);
    try {
      const uploaded = await uploadProofFileWithProgress(
        selectedFile,
        createdTicket.accessToken,
        createdTicket.registrationNumber,
        (pct) => setUploadProgress(pct),
      );

      await submitPaymentProofTransaction({
        registrationId: createdTicket.registrationId,
        registrationNumber: createdTicket.registrationNumber,
        accessToken: createdTicket.accessToken,
        programId: createdTicket.programId,
        programName: createdTicket.programName,
        packageCode: createdTicket.packageCode,
        packageName: createdTicket.packageName,
        includesLodging: createdTicket.includesLodging,
        fullName: createdTicket.fullName,
        email: createdEmail || biodata.email || 'peserta@sakita.id',
        institution: createdTicket.institution,
        position: createdPosition || biodata.position || '-',
        amount: createdTicket.amount,
        senderName,
        senderBank,
        transferDate,
        transferAmount: numericAmount,
        proofFilePath: uploaded.proofFilePath,
        proofFileName: uploaded.proofFileName,
        proofMimeType: uploaded.proofMimeType,
      });

      toast(
        'success',
        'Bukti Pembayaran Terkirim',
        'Status pendaftaran Anda kini Menunggu Verifikasi. Akses komunitas akan otomatis terbuka setelah pembayaran diverifikasi LUNAS oleh admin.',
      );
      navigate(`/sukses/${encodeURIComponent(createdTicket.accessToken)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim bukti transfer.';
      toast('error', 'Gagal Mengirim Bukti', msg);
      setUploadProgress(0);
    } finally {
      setSubmittingProof(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080F1D] text-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#080F1D]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <button type="button" onClick={() => navigate('/')} className="text-left">
            <BrandMark logoUrl={settings.logoUrl} brandName={settings.brandName || 'SAKITA'} variant="dark" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#94A3B8] transition-colors hover:text-[#F8FAFC]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-wider text-[#22D3EE]">
            Formulir Pendaftaran Resmi
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-[#F8FAFC] sm:text-3xl">
            Pendaftaran Peserta Pelatihan SAKITA
          </h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Lengkapi langkah pendaftaran berikut untuk mengamankan kursi pelatihan lembaga Anda.
          </p>
        </div>

        {/* Progress Indicator */}
        <nav aria-label="Tahapan Pendaftaran" className="mb-8">
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STEPS.map((s) => {
              const completed = step > s.num;
              const current = step === s.num;
              return (
                <li
                  key={s.num}
                  className={`rounded-xl border px-3.5 py-3 transition-colors ${
                    current
                      ? 'border-[#22D3EE] bg-[#0F172A] text-[#F8FAFC]'
                      : completed
                        ? 'border-[#10B981]/40 bg-[#0F172A]/70 text-[#F8FAFC]'
                        : 'border-slate-800 bg-[#0F172A]/40 text-[#94A3B8]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-mono">
                    {completed ? (
                      <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                    ) : (
                      <span className={current ? 'text-[#22D3EE] font-semibold' : 'text-slate-500'}>
                        0{s.num}
                      </span>
                    )}
                    <span className="truncate font-sans font-medium">{s.label}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>

        {loadingInit ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#0F172A] py-20">
            <Loader2 className="h-7 w-7 animate-spin text-[#22D3EE]" />
            <p className="mt-3 text-sm text-[#94A3B8]">Memuat data program pelatihan aktual...</p>
          </div>
        ) : !activeProgram ? (
          <div className="rounded-2xl border border-amber-500/35 bg-[#0F172A] p-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
                  Program Pelatihan Belum Diaktifkan di Database
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
                  Administrator perlu masuk satu kali ke <strong>SAKITA Command Center</strong>{' '}
                  untuk menginisialisasi program awal <em>Kelas Intensif AI 2026</em> dan mengatur
                  rekening transfer pada database Firestore.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/login')}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#22D3EE] px-4 py-2.5 text-sm font-semibold text-[#080F1D]"
                  >
                    Masuk sebagai Admin
                  </button>
                  <a
                    href={waAdminLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-[#F8FAFC]"
                  >
                    <MessageCircle className="h-4 w-4 text-[#10B981]" />
                    Hubungi Admin
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-6 sm:p-8">
            {/* Active Program & Live Package Summary Strip */}
            <div className="mb-7 flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-[#080F1D]/80 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs text-[#94A3B8]">Program & Paket Terpilih</p>
                <p className="mt-0.5 font-display text-base font-semibold text-[#F8FAFC]">
                  {activeProgram.name}
                </p>
                <p className="mt-1 text-xs text-[#94A3B8]">
                  {activeProgram.dateLabel} · {activeProgram.location}
                </p>
                <p className="mt-1.5 text-xs font-medium text-[#E2E8F0]">
                  {createdTicket ? (
                    <>
                      <span className="text-[#22D3EE]">{ticketPackageInfo?.label}</span>
                      {' · '}
                      <span className="text-[#94A3B8]">{ticketPackageInfo?.lodgingShortLabel}</span>
                    </>
                  ) : selectedPackage ? (
                    <>
                      <span
                        className={
                          selectedPackage.accent === 'gold' ? 'text-[#EBD077]' : 'text-[#22D3EE]'
                        }
                      >
                        {selectedPackage.name}
                      </span>
                      {' · '}
                      <span className="text-[#94A3B8]">{selectedPackage.lodgingShortLabel}</span>
                    </>
                  ) : (
                    <span className="text-amber-300">Belum memilih paket (pilih pada Langkah 1)</span>
                  )}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[11px] text-[#94A3B8]">Nominal Pembayaran</p>
                <p className="font-mono text-lg font-bold text-[#22D3EE] tabular-nums">
                  {activeDisplayAmount !== null
                    ? formatRupiah(activeDisplayAmount)
                    : 'Mulai Rp1.950.000'}
                </p>
                <p className={`text-xs font-medium ${isFull ? 'text-amber-400' : 'text-[#10B981]'}`}>
                  {isFull
                    ? 'Pendaftaran Penuh · Mode Daftar Tunggu'
                    : `Pendaftaran Dibuka · Kuota Maks. ${activeProgram.quota} Peserta`}
                </p>
              </div>
            </div>

            {isFull && step <= 2 && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-200">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold">Pendaftaran Penuh — Daftar Tunggu Tersedia</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-200/85">
                    Seluruh {activeProgram.quota} kursi pada angkatan ini sedang terisi atau dalam
                    reservasi aktif. Anda tetap dapat mendaftar ke <strong>Daftar Tunggu</strong>{' '}
                    tanpa perlu melakukan transfer sekarang. Tim admin akan menghubungi Anda jika
                    kursi tersedia atau angkatan berikutnya dibuka.
                  </p>
                </div>
              </div>
            )}

            {/* ===============================================================
                STEP 1 — PILIH PAKET & BIODATA PESERTA
               =============================================================== */}
            {step === 1 && (
              <div className="space-y-6">
                {programs.length > 1 && (
                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8]">
                      Pilih Program Pelatihan
                    </label>
                    <select
                      value={selectedProgramId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setSelectedProgramId(nextId);
                      }}
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] focus:border-[#22D3EE] focus:outline-none"
                    >
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.dateLabel})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Mandatory Package Selection */}
                <div className="rounded-xl border border-slate-800 bg-[#080F1D]/70 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="block text-sm font-semibold text-[#F8FAFC]">
                        Pilih Paket Pelatihan <span className="text-rose-400">*</span>
                      </label>
                      <p className="mt-0.5 text-xs text-[#94A3B8]">
                        Materi 4 hari intensif dan 10 proyek aplikasi sama di kedua paket. Perbedaan
                        hanya pada fasilitas penginapan hotel.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2" role="radiogroup" aria-label="Pilihan Paket Pelatihan">
                    {TRAINING_PACKAGE_LIST.map((pkg) => {
                      const isSelected = selectedPackageCode === pkg.code;
                      const isGold = pkg.accent === 'gold';
                      return (
                        <button
                          key={pkg.code}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => handleSelectPackage(pkg.code)}
                          className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                            isSelected
                              ? isGold
                                ? 'border-[#D4AF37] bg-[#D4AF37]/12 shadow-[0_0_0_1px_rgba(212,175,55,0.45)]'
                                : 'border-[#22D3EE] bg-[#22D3EE]/10 shadow-[0_0_0_1px_rgba(34,211,238,0.4)]'
                              : 'border-slate-700/90 bg-[#0F172A]/80 hover:border-slate-500'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-display text-base font-bold text-[#F8FAFC]">
                                  {pkg.name}
                                </p>
                                <p className="mt-0.5 text-xs text-[#94A3B8]">
                                  {pkg.lodgingShortLabel}
                                </p>
                              </div>
                              <span
                                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  isSelected
                                    ? isGold
                                      ? 'border-[#D4AF37] bg-[#D4AF37] text-[#080F1D]'
                                      : 'border-[#22D3EE] bg-[#22D3EE] text-[#080F1D]'
                                    : 'border-slate-600 bg-[#080F1D]'
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </span>
                            </div>

                            <p
                              className={`mt-3 font-mono text-xl font-bold tabular-nums ${
                                isGold ? 'text-[#EBD077]' : 'text-[#22D3EE]'
                              }`}
                            >
                              {formatRupiah(pkg.price)}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-[11px]">
                            <span
                              className={
                                isGold
                                  ? 'font-semibold text-[#EBD077]'
                                  : 'font-semibold text-[#34D399]'
                              }
                            >
                              {pkg.highlightLabel}
                            </span>
                            <span className="text-[#94A3B8]">
                              {pkg.includesLodging ? 'Termasuk Hotel' : 'Tanpa Hotel'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {packageError && (
                    <p className="mt-2.5 text-xs font-medium text-rose-400">{packageError}</p>
                  )}

                  {/* Live Package Summary Box */}
                  {selectedPackage && (
                    <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-[#0F172A] p-4 text-xs sm:grid-cols-2">
                      <div>
                        <span className="text-[#94A3B8]">Nama Paket:</span>
                        <p className="mt-0.5 font-semibold text-[#F8FAFC]">{selectedPackage.name}</p>
                      </div>
                      <div>
                        <span className="text-[#94A3B8]">Fasilitas Penginapan:</span>
                        <p className="mt-0.5 font-medium text-[#E2E8F0]">
                          {selectedPackage.lodgingShortLabel}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#94A3B8]">Total Biaya Pelatihan:</span>
                        <p className="mt-0.5 font-mono font-bold text-[#F8FAFC] tabular-nums">
                          {formatRupiah(selectedPackage.price)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#94A3B8]">Nominal Pembayaran:</span>
                        <p className="mt-0.5 font-mono font-bold text-[#22D3EE] tabular-nums">
                          {formatRupiah(selectedPackage.price)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="fullName" className="block text-xs font-medium text-[#F8FAFC]">
                      Nama Lengkap beserta Gelar <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={biodata.fullName}
                      onChange={(e) => setBiodata({ ...biodata, fullName: e.target.value })}
                      placeholder="Contoh: Dr. H. Ahmad Fauzan, M.Pd."
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none"
                    />
                    {fieldErrors.fullName && (
                      <p className="mt-1 text-xs text-rose-400">{fieldErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="gender" className="block text-xs font-medium text-[#F8FAFC]">
                      Jenis Kelamin <span className="text-rose-400">*</span>
                    </label>
                    <select
                      id="gender"
                      value={biodata.gender}
                      onChange={(e) =>
                        setBiodata({
                          ...biodata,
                          gender: e.target.value as 'Laki-laki' | 'Perempuan',
                        })
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] focus:border-[#22D3EE] focus:outline-none"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="whatsapp" className="block text-xs font-medium text-[#F8FAFC]">
                      Nomor WhatsApp Aktif <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="whatsapp"
                      type="tel"
                      value={biodata.whatsapp}
                      onChange={(e) => setBiodata({ ...biodata, whatsapp: e.target.value })}
                      placeholder="0851-xxxx-xxxx"
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none"
                    />
                    {fieldErrors.whatsapp ? (
                      <p className="mt-1 text-xs text-rose-400">{fieldErrors.whatsapp}</p>
                    ) : (
                      <p className="mt-1 text-[11px] text-[#94A3B8]">
                        Dinormalisasi otomatis ke format Indonesia (+62).
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-[#F8FAFC]">
                      Email Aktif <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={biodata.email}
                      onChange={(e) => setBiodata({ ...biodata, email: e.target.value })}
                      placeholder="nama@lembaga.sch.id"
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none"
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-rose-400">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="position" className="block text-xs font-medium text-[#F8FAFC]">
                      Jabatan <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="position"
                      type="text"
                      value={biodata.position}
                      onChange={(e) => setBiodata({ ...biodata, position: e.target.value })}
                      placeholder="Kepala Sekolah / Pimpinan Pesantren / Operator"
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none"
                    />
                    {fieldErrors.position && (
                      <p className="mt-1 text-xs text-rose-400">{fieldErrors.position}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="institution" className="block text-xs font-medium text-[#F8FAFC]">
                      Nama Sekolah / Pesantren / Lembaga <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="institution"
                      type="text"
                      value={biodata.institution}
                      onChange={(e) => setBiodata({ ...biodata, institution: e.target.value })}
                      placeholder="Contoh: Pondok Pesantren Al-Falah Jambi"
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none"
                    />
                    {fieldErrors.institution && (
                      <p className="mt-1 text-xs text-rose-400">{fieldErrors.institution}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-xs font-medium text-[#F8FAFC]">
                      Kabupaten / Kota <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={biodata.city}
                      onChange={(e) => setBiodata({ ...biodata, city: e.target.value })}
                      placeholder="Contoh: Kota Jambi"
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none"
                    />
                    {fieldErrors.city && (
                      <p className="mt-1 text-xs text-rose-400">{fieldErrors.city}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="province" className="block text-xs font-medium text-[#F8FAFC]">
                      Provinsi <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="province"
                      type="text"
                      value={biodata.province}
                      onChange={(e) => setBiodata({ ...biodata, province: e.target.value })}
                      placeholder="Contoh: Jambi"
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none"
                    />
                    {fieldErrors.province && (
                      <p className="mt-1 text-xs text-rose-400">{fieldErrors.province}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="aiExperience" className="block text-xs font-medium text-[#F8FAFC]">
                      Pengalaman Menggunakan AI <span className="text-[#94A3B8]">(Opsional)</span>
                    </label>
                    <textarea
                      id="aiExperience"
                      rows={2}
                      value={biodata.aiExperience}
                      onChange={(e) => setBiodata({ ...biodata, aiExperience: e.target.value })}
                      placeholder="Contoh: Belum pernah, atau pernah menggunakan AI untuk menyusun surat & materi."
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="expectations" className="block text-xs font-medium text-[#F8FAFC]">
                      Harapan Mengikuti Pelatihan <span className="text-[#94A3B8]">(Opsional)</span>
                    </label>
                    <textarea
                      id="expectations"
                      rows={2}
                      value={biodata.expectations}
                      onChange={(e) => setBiodata({ ...biodata, expectations: e.target.value })}
                      placeholder="Contoh: Ingin membangun sistem PPDB, SPP, dan laporan hafalan santri di pesantren."
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-800 pt-6">
                  <button
                    type="button"
                    onClick={handleNextToStep2}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#22D3EE] px-6 text-sm font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90"
                  >
                    <span>Lanjut ke Konfirmasi Data</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                STEP 2 — KONFIRMASI DATA
               =============================================================== */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
                    Periksa Kembali Data Pendaftaran Anda
                  </h2>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    Pastikan nama beserta gelar, WhatsApp, email, dan nama lembaga sudah tepat untuk
                    keperluan sertifikat dan komunikasi pelatihan.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-[#080F1D]/70 p-5 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-[#94A3B8]">Nama Lengkap</p>
                    <p className="mt-0.5 font-medium text-[#F8FAFC]">{biodata.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#94A3B8]">Jenis Kelamin</p>
                    <p className="mt-0.5 font-medium text-[#F8FAFC]">{biodata.gender}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#94A3B8]">WhatsApp Aktif</p>
                    <p className="mt-0.5 font-mono font-medium text-[#F8FAFC]">
                      +{normalizeWhatsappID(biodata.whatsapp)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#94A3B8]">Email Aktif</p>
                    <p className="mt-0.5 font-medium text-[#F8FAFC]">{biodata.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#94A3B8]">Sekolah / Pesantren / Lembaga</p>
                    <p className="mt-0.5 font-medium text-[#F8FAFC]">{biodata.institution}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#94A3B8]">Jabatan</p>
                    <p className="mt-0.5 font-medium text-[#F8FAFC]">{biodata.position}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-[#94A3B8]">Domisili</p>
                    <p className="mt-0.5 font-medium text-[#F8FAFC]">
                      {biodata.city}, {biodata.province}
                    </p>
                  </div>
                </div>

                {/* Program & Package Details Summary */}
                <div className="rounded-xl border border-slate-800 bg-[#080F1D]/70 p-5">
                  <p className="text-xs font-medium text-[#22D3EE]">Ringkasan Program, Paket & Fasilitas</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-xs text-[#94A3B8]">Nama Pelatihan:</span>
                      <p className="font-medium text-[#F8FAFC]">{activeProgram.name}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#94A3B8]">Jadwal & Lokasi:</span>
                      <p className="font-medium text-[#F8FAFC]">
                        {activeProgram.dateLabel} · {activeProgram.location}
                      </p>
                    </div>
                    {selectedPackage && (
                      <>
                        <div>
                          <span className="text-xs text-[#94A3B8]">Paket Pilihan:</span>
                          <p
                            className={`font-semibold ${
                              selectedPackage.accent === 'gold' ? 'text-[#EBD077]' : 'text-[#22D3EE]'
                            }`}
                          >
                            {selectedPackage.name} ({selectedPackage.highlightLabel})
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-[#94A3B8]">Fasilitas Penginapan:</span>
                          <p className="font-medium text-[#F8FAFC]">
                            {selectedPackage.lodgingDetailLabel}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-[#94A3B8]">Total Biaya Pelatihan:</span>
                          <p className="font-mono font-bold text-[#F8FAFC] tabular-nums">
                            {formatRupiah(selectedPackage.price)}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-[#94A3B8]">Nominal Pembayaran:</span>
                          <p className="font-mono font-bold text-[#22D3EE] tabular-nums">
                            {formatRupiah(selectedPackage.price)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-800 pt-3 text-xs text-[#94A3B8]">
                    {[
                      ...PACKAGE_LEARNING_BENEFITS,
                      ...(selectedPackage ? selectedPackage.confirmedFacilities : activeProgram.facilities),
                    ].map((f) => (
                      <span key={f} className="inline-flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-[#10B981]" />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Agreements */}
                <div className="space-y-3 rounded-xl border border-slate-800 bg-[#080F1D]/50 p-4 text-sm">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-[#080F1D] accent-[#22D3EE]"
                    />
                    <span className="text-[#94A3B8]">
                      Saya telah membaca dan menyetujui{' '}
                      <button
                        type="button"
                        onClick={() => setLegalDialog('privacy')}
                        className="font-medium text-[#22D3EE] underline underline-offset-2"
                      >
                        Kebijakan Privasi
                      </button>{' '}
                      Sekolah AI Kita (SAKITA).
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-[#080F1D] accent-[#22D3EE]"
                    />
                    <span className="text-[#94A3B8]">
                      Saya menyetujui{' '}
                      <button
                        type="button"
                        onClick={() => setLegalDialog('terms')}
                        className="font-medium text-[#22D3EE] underline underline-offset-2"
                      >
                        Syarat dan Ketentuan Pendaftaran
                      </button>{' '}
                      serta menyatakan data di atas benar.
                    </span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-6">
                  <button
                    type="button"
                    disabled={submittingReg}
                    onClick={() => setStep(1)}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-700 px-5 text-sm font-medium text-[#F8FAFC] hover:bg-white/5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Perbaiki Biodata</span>
                  </button>
                  <button
                    type="button"
                    disabled={submittingReg || !agreePrivacy || !agreeTerms}
                    onClick={handleConfirmRegistration}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#22D3EE] px-6 text-sm font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingReg ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Menyimpan Pendaftaran...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {isFull ? 'Simpan ke Daftar Tunggu' : 'Konfirmasi & Lanjut Pembayaran'}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                STEP 3 — PEMBAYARAN TRANSFER BANK LANGSUNG
               =============================================================== */}
            {step === 3 && createdTicket && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-4">
                  <div>
                    <p className="text-xs font-medium text-[#10B981]">Nomor Registrasi Resmi Anda</p>
                    <p className="mt-1 font-mono text-xl font-bold text-[#F8FAFC] tabular-nums">
                      {createdTicket.registrationNumber}
                    </p>
                    {ticketPackageInfo && (
                      <p className="mt-1 text-xs text-[#E2E8F0]">
                        {ticketPackageInfo.label} · {ticketPackageInfo.lodgingShortLabel}
                      </p>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-[#94A3B8]">Peserta</p>
                    <p className="text-sm font-semibold text-[#F8FAFC]">{createdTicket.fullName}</p>
                    <p className="mt-0.5 font-mono text-xs font-bold text-[#22D3EE] tabular-nums">
                      {formatRupiah(createdTicket.amount)}
                    </p>
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
                    Transfer Langsung ke Rekening Bank Resmi
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                    Pembayaran dilakukan secara langsung melalui transfer bank (bukan virtual account
                    atau payment gateway). Simpan bukti transfer untuk diunggah pada langkah
                    berikutnya.
                  </p>
                </div>

                {bankSettings.isConfigured && bankSettings.accountNumber.trim() ? (
                  <div className="rounded-2xl border border-slate-700 bg-[#080F1D] p-6">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-[#94A3B8]">Nama Bank</p>
                        <p className="mt-1 flex items-center gap-2 font-display text-lg font-semibold text-[#F8FAFC]">
                          <Building className="h-4 w-4 text-[#22D3EE]" />
                          {bankSettings.bankName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#94A3B8]">Nama Pemilik Rekening</p>
                        <p className="mt-1 font-display text-lg font-semibold text-[#F8FAFC]">
                          {bankSettings.accountHolder}
                        </p>
                      </div>

                      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0F172A] px-4 py-3.5">
                        <div>
                          <p className="text-xs text-[#94A3B8]">Nomor Rekening</p>
                          <p className="mt-0.5 font-mono text-xl font-bold tracking-wider text-[#F8FAFC] tabular-nums">
                            {bankSettings.accountNumber}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(bankSettings.accountNumber.replace(/\s+/g, ''), 'account')}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-[#080F1D] px-3.5 text-xs font-semibold text-[#F8FAFC] hover:border-[#22D3EE] hover:text-[#22D3EE]"
                        >
                          {copiedField === 'account' ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[#10B981]" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Salin Nomor Rekening</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0F172A] px-4 py-3.5">
                        <div>
                          <p className="text-xs text-[#94A3B8]">Nominal Pembayaran</p>
                          <p className="mt-0.5 font-mono text-xl font-bold text-[#22D3EE] tabular-nums">
                            {formatRupiah(createdTicket.amount)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(String(createdTicket.amount), 'amount')}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-[#080F1D] px-3.5 text-xs font-semibold text-[#F8FAFC] hover:border-[#22D3EE] hover:text-[#22D3EE]"
                        >
                          {copiedField === 'amount' ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[#10B981]" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Salin Nominal</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {bankSettings.transferInstructions && (
                      <div className="mt-5 border-t border-slate-800 pt-4 text-xs leading-relaxed text-[#94A3B8] whitespace-pre-line">
                        {bankSettings.transferInstructions}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                      <div>
                        <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
                          Informasi Rekening Bank Belum Dikonfigurasi Admin
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-amber-100/85">
                          Data pendaftaran Anda dengan nomor{' '}
                          <strong className="font-mono">{createdTicket.registrationNumber}</strong>{' '}
                          sudah tercatat dengan aman. Saat ini nomor rekening tujuan transfer belum
                          diatur oleh administrator SAKITA. Silakan hubungi admin melalui WhatsApp
                          untuk mendapatkan konfirmasi rekening resmi, atau lanjutkan unggah bukti
                          apabila Anda sudah menerima instruksi transfer resmi.
                        </p>
                        <a
                          href={waAdminLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#10B981] px-4 py-2 text-xs font-semibold text-[#080F1D]"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Hubungi Admin SAKITA via WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#080F1D]/60 p-4 text-xs text-[#94A3B8]">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#22D3EE]" />
                  <span>
                    Keamanan Pembayaran: SAKITA tidak pernah meminta PIN ATM, kode OTP, atau kata
                    sandi mobile banking Anda.
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-6">
                  <button
                    type="button"
                    onClick={() => navigate(`/status/${encodeURIComponent(createdTicket.accessToken)}`)}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-700 px-5 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
                  >
                    Simpan & Lanjutkan Nanti
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(4);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#22D3EE] px-6 text-sm font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90"
                  >
                    <span>Saya Sudah Transfer · Unggah Bukti</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                STEP 4 — UNGGAH BUKTI TRANSFER
               =============================================================== */}
            {step === 4 && createdTicket && (
              <form onSubmit={handleSubmitProof} className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#080F1D]/80 px-4 py-3 text-sm">
                  <div>
                    <span className="text-xs text-[#94A3B8]">Nomor Registrasi: </span>
                    <span className="font-mono font-bold text-[#22D3EE]">
                      {createdTicket.registrationNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-xs font-medium text-[#22D3EE] hover:underline"
                  >
                    Lihat Kembali Info Rekening
                  </button>
                </div>

                {createdTicket.rejectionReason && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
                    <p className="font-semibold">Catatan dari Admin SAKITA:</p>
                    <p className="mt-1">{createdTicket.rejectionReason}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="senderName" className="block text-xs font-medium text-[#F8FAFC]">
                      Nama Pengirim Transfer <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="senderName"
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Sesuai nama di rekening pengirim"
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] focus:border-[#22D3EE] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="senderBank" className="block text-xs font-medium text-[#F8FAFC]">
                      Bank Pengirim <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="senderBank"
                      type="text"
                      required
                      value={senderBank}
                      onChange={(e) => setSenderBank(e.target.value)}
                      placeholder="Contoh: BSI / BRI / Bank Mandiri / BCA"
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] focus:border-[#22D3EE] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="transferDate" className="block text-xs font-medium text-[#F8FAFC]">
                      Tanggal Transfer <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="transferDate"
                      type="date"
                      required
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 text-sm text-[#F8FAFC] focus:border-[#22D3EE] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="transferAmount" className="block text-xs font-medium text-[#F8FAFC]">
                      Nominal Transfer (Rp) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="transferAmount"
                      type="number"
                      min={1000}
                      required
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#080F1D] px-4 py-3 font-mono text-sm text-[#F8FAFC] tabular-nums focus:border-[#22D3EE] focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-[#94A3B8]">
                      Tagihan {ticketPackageInfo?.label || 'paket terpilih'}:{' '}
                      <strong className="font-mono text-[#22D3EE]">
                        {formatRupiah(createdTicket.amount)}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* File Dropzone + Preview */}
                <div>
                  <label className="block text-xs font-medium text-[#F8FAFC]">
                    File Bukti Pembayaran <span className="text-rose-400">*</span>
                  </label>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    Format diterima: JPG, JPEG, PNG, atau PDF. Ukuran maksimal 5 MB. File disimpan
                    secara privat dan hanya dapat diakses administrator.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  {!selectedFile ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-[#080F1D]/70 px-6 py-10 text-center transition-colors hover:border-[#22D3EE]/60"
                    >
                      <Upload className="h-7 w-7 text-[#22D3EE]" />
                      <span className="mt-3 text-sm font-semibold text-[#F8FAFC]">
                        Pilih File Bukti Transfer
                      </span>
                      <span className="mt-1 text-xs text-[#94A3B8]">
                        JPG, JPEG, PNG, atau PDF · Maksimal 5 MB
                      </span>
                    </button>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-slate-700 bg-[#080F1D] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 shrink-0 text-[#22D3EE]" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#F8FAFC]">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-[#94A3B8] tabular-nums">
                              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={submittingProof}
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-[#F8FAFC] hover:border-[#22D3EE]"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Ganti File</span>
                        </button>
                      </div>

                      {filePreviewUrl && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A]">
                          <img
                            src={filePreviewUrl}
                            alt="Preview bukti transfer"
                            className="mx-auto max-h-72 object-contain"
                          />
                        </div>
                      )}

                      {submittingProof && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                            <span>Mengunggah dan menyimpan bukti transfer...</span>
                            <span className="font-mono tabular-nums">{uploadProgress}%</span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full bg-[#22D3EE] transition-all duration-200"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#080F1D]/60 p-4 text-xs text-[#94A3B8]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                  <span>
                    Setelah bukti transfer berhasil diunggah, kursi Anda ditahan sementara dan
                    status pembayaran menjadi <strong className="text-[#F8FAFC]">MENUNGGU VERIFIKASI</strong>{' '}
                    (bukan otomatis lunas) sampai diverifikasi secara resmi oleh admin SAKITA.
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-6">
                  <button
                    type="button"
                    disabled={submittingProof}
                    onClick={() => setStep(3)}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-700 px-5 text-sm font-medium text-[#F8FAFC] hover:bg-white/5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Kembali</span>
                  </button>
                  <button
                    type="submit"
                    disabled={submittingProof || !selectedFile}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#22D3EE] px-6 text-sm font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingProof ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Mengirim Bukti...</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim Bukti Pembayaran</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

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
