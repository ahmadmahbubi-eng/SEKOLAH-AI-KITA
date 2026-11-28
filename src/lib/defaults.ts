import type {
  BankSettings,
  CommunitySettings,
  FaqItem,
  HotelPhotoItem,
  NotificationSettings,
  Program,
  ProjectItem,
  TrainerProfile,
  TrainerSectionKey,
  TrainerSectionVisibility,
  TrainingPackageCode,
  TrainingPackageOption,
  WebsiteSettings,
} from '../types';

export const PACKAGE_LEARNING_BENEFITS: string[] = [
  '4 hari pelatihan intensif',
  '10 proyek aplikasi nyata',
  'Belajar membuat aplikasi tanpa harus menguasai coding',
  'Pengembangan keahlian AI untuk pendidikan dan bisnis',
  'Peluang bisnis jasa pembuatan dan penjualan aplikasi',
];

export const TRAINING_PACKAGES: Record<TrainingPackageCode, TrainingPackageOption> = {
  paket_hemat: {
    code: 'paket_hemat',
    name: 'Paket Hemat',
    price: 1950000,
    includesLodging: false,
    lodgingShortLabel: 'Tanpa fasilitas penginapan',
    lodgingDetailLabel: 'Tanpa fasilitas penginapan hotel (akomodasi diatur secara mandiri oleh peserta)',
    highlightLabel: 'Hemat Rp750.000',
    ctaLabel: 'Pilih Paket Hemat',
    accent: 'cyan',
    confirmedFacilities: [
      'Makan selama pelatihan',
      'Snack & coffee break',
      'Modul pelatihan terstruktur',
      'Pendampingan intensif selama pelatihan',
      'Akses Komunitas Sekolah AI Kita (setelah verifikasi LUNAS)',
    ],
  },
  paket_premium: {
    code: 'paket_premium',
    name: 'Paket Premium',
    price: 2700000,
    includesLodging: true,
    lodgingShortLabel: 'Dengan fasilitas penginapan',
    lodgingDetailLabel: 'Termasuk fasilitas penginapan di Hotel Grand Makmur, Jambi selama pelatihan',
    highlightLabel: 'Kenyamanan lebih lengkap',
    ctaLabel: 'Pilih Paket Premium',
    accent: 'gold',
    confirmedFacilities: [
      'Menginap di Hotel Grand Makmur, Jambi selama pelatihan',
      'Makan selama pelatihan',
      'Snack & coffee break',
      'Modul pelatihan terstruktur',
      'Pendampingan intensif selama pelatihan',
      'Akses Komunitas Sekolah AI Kita (setelah verifikasi LUNAS)',
    ],
  },
};

export const TRAINING_PACKAGE_LIST: TrainingPackageOption[] = [
  TRAINING_PACKAGES.paket_hemat,
  TRAINING_PACKAGES.paket_premium,
];

export function isValidTrainingPackageCode(value: unknown): value is TrainingPackageCode {
  return value === 'paket_hemat' || value === 'paket_premium';
}

export function getTrainingPackageByCode(code?: string | null): TrainingPackageOption | null {
  if (code === 'paket_hemat') return TRAINING_PACKAGES.paket_hemat;
  if (code === 'paket_premium') return TRAINING_PACKAGES.paket_premium;
  return null;
}

export function getParticipantPackageInfo(record: {
  packageCode?: TrainingPackageCode;
  packageName?: string;
  includesLodging?: boolean;
}): {
  code: TrainingPackageCode | 'legacy';
  label: string;
  lodgingShortLabel: string;
  lodgingDetailLabel: string;
  isLegacy: boolean;
} {
  const matched = getTrainingPackageByCode(record.packageCode);
  if (matched) {
    return {
      code: matched.code,
      label: record.packageName?.trim() || matched.name,
      lodgingShortLabel: matched.lodgingShortLabel,
      lodgingDetailLabel: matched.lodgingDetailLabel,
      isLegacy: false,
    };
  }
  const hasExplicitLodging = typeof record.includesLodging === 'boolean';
  return {
    code: 'legacy',
    label: record.packageName?.trim() || 'Data Lama (Belum Tercatat)',
    lodgingShortLabel: hasExplicitLodging
      ? record.includesLodging
        ? 'Dengan penginapan'
        : 'Tanpa penginapan'
      : 'Belum Tercatat',
    lodgingDetailLabel: hasExplicitLodging
      ? record.includesLodging
        ? 'Termasuk fasilitas penginapan di Hotel Grand Makmur, Jambi'
        : 'Tanpa fasilitas penginapan hotel'
      : 'Data pendaftaran sebelum skema pilihan paket diaktifkan (nominal asli tetap terjaga)',
    isLegacy: true,
  };
}

export const INITIAL_PROJECTS: ProjectItem[] = [
  {
    number: '01',
    icon: 'UserPlus',
    title: 'Sistem PPDB Online',
    description: 'Pendaftaran siswa baru dan pengelolaan data calon siswa secara terstruktur.',
    benefit: 'Mempercepat proses penerimaan santri/siswa tanpa tumpukan berkas fisik.',
  },
  {
    number: '02',
    icon: 'Wallet',
    title: 'Sistem Keuangan & SPP Otomatis',
    description: 'Pencatatan pembayaran SPP, tunggakan, dan penyusunan laporan keuangan berkala.',
    benefit: 'Transparansi arus kas lembaga dan kemudahan rekonsiliasi bagi bendahara.',
  },
  {
    number: '03',
    icon: 'BookOpen',
    title: 'Sistem Akademik, Nilai & Rapor',
    description: 'Pengelolaan nilai harian, ujian, dan penyusunan rapor perkembangan akademik siswa.',
    benefit: 'Menghemat waktu rekapitulasi guru dan meminimalkan kesalahan input nilai.',
  },
  {
    number: '04',
    icon: 'ClipboardCheck',
    title: 'Ujian Online (CBT)',
    description: 'Pembuatan bank soal, pelaksanaan ujian digital, dan rekap hasil evaluasi otomatis.',
    benefit: 'Pelaksanaan ujian lebih efisien, hemat kertas, dan penilaian instan.',
  },
  {
    number: '05',
    icon: 'CalendarCheck',
    title: 'Absensi Digital',
    description: 'Pencatatan kehadiran harian siswa, santri, dan guru dalam satu basis data.',
    benefit: 'Memantau kedisiplinan harian dan rekap kehadiran bulanan secara cepat.',
  },
  {
    number: '06',
    icon: 'BookMarked',
    title: "Sistem Tahfidz Al-Qur'an",
    description: "Monitoring setoran hafalan, muraja'ah, dan capaian juz setiap santri.",
    benefit: 'Pengasuh dan wali santri dapat memantau perkembangan hafalan secara akurat.',
  },
  {
    number: '07',
    icon: 'Building2',
    title: 'Manajemen Asrama & Perizinan',
    description: 'Pengelolaan kamar, aktivitas asrama, dan riwayat perizinan keluar-masuk santri.',
    benefit: 'Tertib administrasi kepengasuhan dan keamanan pencatatan izin pulang santri.',
  },
  {
    number: '08',
    icon: 'Utensils',
    title: 'Sistem Layanan Makan Santri',
    description: 'Pengelolaan jadwal dapur, kuota porsi, dan layanan distribusi konsumsi harian.',
    benefit: 'Perencanaan logistik dapur lebih terukur dan mengurangi pemborosan anggaran.',
  },
  {
    number: '09',
    icon: 'LayoutDashboard',
    title: 'Dashboard Pimpinan',
    description: 'Monitoring berbagai ringkasan data lembaga pendidikan secara terpusat.',
    benefit: 'Membantu kepala sekolah dan pimpinan mengambil keputusan berbasis data aktual.',
  },
  {
    number: '10',
    icon: 'Globe',
    title: 'Website Sekolah & Pesantren',
    description: 'Pembuatan website profil lembaga yang modern, informatif, dan responsif.',
    benefit: 'Meningkatkan kredibilitas lembaga di hadapan orang tua dan masyarakat luas.',
  },
];

export const INITIAL_FACILITIES: string[] = [
  'Menginap di hotel',
  'Makan selama pelatihan',
  'Snack & coffee break',
  'Modul pelatihan terstruktur',
  'Praktik 10 proyek aplikasi digital',
  'Pendampingan intensif selama pelatihan',
  'Akses Komunitas Sekolah AI Kita',
];

export const INITIAL_FAQS: FaqItem[] = [
  {
    question: 'Apakah harus bisa coding?',
    answer:
      'Tidak. Pelatihan ini dirancang khusus bagi pengelola sekolah dan pesantren tanpa latar belakang IT atau pengalaman coding. Peserta akan dibimbing langkah demi langkah menggunakan pendekatan berbasis AI.',
  },
  {
    question: 'Siapa yang dapat mengikuti pelatihan?',
    answer:
      'Kepala Sekolah, Pimpinan Pesantren, Ketua Yayasan, Pengelola Lembaga Pendidikan, Guru dan Ustadz/Ustadzah, serta Operator dan Tenaga Administrasi lembaga pendidikan.',
  },
  {
    question: 'Apa saja yang termasuk dalam biaya pelatihan?',
    answer:
      'Tersedia dua pilihan paket dengan materi dan kualitas pembelajaran yang sama (4 hari pelatihan intensif, 10 proyek aplikasi nyata, modul pelatihan, makan & snack selama pelatihan, pendampingan intensif, serta akses Komunitas Sekolah AI Kita setelah verifikasi LUNAS): Paket Hemat Rp1.950.000 (tanpa fasilitas penginapan) dan Paket Premium Rp2.700.000 (termasuk fasilitas penginapan di Hotel Grand Makmur, Jambi).',
  },
  {
    question: 'Bagaimana cara mendaftar?',
    answer:
      'Klik tombol "Daftar Sekarang", lengkapi biodata peserta dan lembaga pada formulir pendaftaran, konfirmasi data untuk mendapatkan nomor registrasi resmi, lalu lanjutkan ke tahap transfer dan unggah bukti pembayaran.',
  },
  {
    question: 'Bagaimana cara melakukan pembayaran?',
    answer:
      'Pembayaran dilakukan melalui transfer bank langsung ke rekening resmi yang ditampilkan pada langkah pembayaran. Setelah transfer, unggah bukti transfer (JPG, PNG, atau PDF maks. 5 MB) agar tim kami dapat melakukan verifikasi.',
  },
  {
    question: 'Bagaimana cara bergabung dengan komunitas?',
    answer:
      'Tautan undangan resmi Komunitas Sekolah AI Kita (SAKITA) akan terbuka secara otomatis pada halaman status pendaftaran Anda setelah pembayaran diverifikasi dan berstatus LUNAS oleh admin SAKITA.',
  },
  {
    question: 'Apakah setelah pelatihan saya bisa membuat dan menjual aplikasi sendiri?',
    answer:
      'Ya. Fokus utama pelatihan SAKITA adalah kemandirian praktik. Anda dibimbing menguasai alur perancangan hingga pembuatan aplikasi berbasis AI sehingga mampu membangun sistem untuk lembaga sendiri maupun mengeksplorasi peluang jasa dan produk aplikasi digital.',
  },
  {
    question: 'Bagaimana mengetahui status pembayaran?',
    answer:
      'Simpan tautan status pribadi dan bukti pendaftaran yang diberikan setelah mendaftar. Anda dapat memantau status verifikasi (Menunggu Verifikasi hingga Lunas) melalui halaman status peserta, dan tim admin juga akan menginformasikan setelah verifikasi selesai.',
  },
  {
    question: 'Apakah peserta wajib membawa laptop?',
    answer: '',
  },
  {
    question: 'Apakah peserta harus memiliki akun AI berbayar?',
    answer: '',
  },
  {
    question: 'Apakah peserta dapat mengikuti pelatihan meskipun belum pernah menggunakan AI?',
    answer: '',
  },
  {
    question: 'Apakah aplikasi dapat dikembangkan kembali setelah pelatihan?',
    answer: '',
  },
  {
    question: 'Apakah aplikasi membutuhkan biaya domain, hosting, atau layanan AI?',
    answer: '',
  },
  {
    question: 'Apakah aplikasi hasil pengembangan peserta dapat dijual?',
    answer: '',
  },
  {
    question: 'Apakah ada pendampingan setelah pelatihan?',
    answer: '',
  },
  {
    question: 'Bagaimana ketentuan pembatalan pendaftaran?',
    answer: '',
  },
];

export const ADDITIONAL_ADMIN_FAQ_QUESTIONS: string[] = [
  'Apakah peserta wajib membawa laptop?',
  'Apakah peserta harus memiliki akun AI berbayar?',
  'Apakah peserta dapat mengikuti pelatihan meskipun belum pernah menggunakan AI?',
  'Apakah aplikasi dapat dikembangkan kembali setelah pelatihan?',
  'Apakah aplikasi membutuhkan biaya domain, hosting, atau layanan AI?',
  'Apakah aplikasi hasil pengembangan peserta dapat dijual?',
  'Apakah ada pendampingan setelah pelatihan?',
  'Bagaimana ketentuan pembatalan pendaftaran?',
];

export const DEFAULT_PROGRAM: Program = {
  id: 'sakita-2026-batch-1',
  slug: 'kelas-intensif-ai-sekolah-pesantren-2026',
  name: 'Kelas Intensif AI untuk Pengelolaan Sekolah & Pesantren',
  batchLabel: 'INTENSIVE AI BOOTCAMP 2026',
  description:
    'Pelatihan praktik intensif 4 hari untuk membimbing pengelola sekolah dan pesantren membangun 10 proyek aplikasi digital lembaga dengan bantuan AI tanpa harus bisa coding.',
  dateLabel: '28–31 Desember 2026',
  startDateIso: '2026-12-28T08:00:00+07:00',
  endDateIso: '2026-12-31T17:00:00+07:00',
  durationLabel: '4 Hari Pelatihan Intensif',
  location: 'Hotel Grand Makmur, Jambi',
  price: 2700000,
  quota: 30,
  confirmedCount: 0,
  reservedCount: 0,
  waitlistCount: 0,
  registrationSeq: 0,
  reservationHours: 48,
  projectCount: 10,
  targetRevenue: 81000000,
  status: 'open',
  isFeatured: true,
  facilities: INITIAL_FACILITIES,
  curriculum: INITIAL_PROJECTS,
};

export const OFFICIAL_SAKITA_LOGO =
  '/assets/aistudio/Logo_Sekolah_AI_Kita_dengan_Ikon_Buku_1abe7621.png';

export const OFFICIAL_SAKITA_WHATSAPP = '0851-2163-4560';
export const OFFICIAL_SAKITA_WHATSAPP_RAW = '085121634560';
export const OFFICIAL_SAKITA_COMMUNITY_URL =
  'https://chat.whatsapp.com/JSmbDkfooS1EadYZ6ngfXx';

export const OFFICIAL_HOTEL_GALLERY: HotelPhotoItem[] = [
  {
    url: '/assets/aistudio/PHOTO-2026-11-19-10-50-09_acd15e60.jpg',
    caption: 'Ruang Pelatihan Utama — Hotel Grand Makmur, Jambi',
  },
  {
    url: '/assets/aistudio/d5ced111992a35765af48f1e5f11f16a_c491e5c8.jpg',
    caption: 'Kamar Akomodasi Peserta — Hotel Grand Makmur, Jambi',
  },
  {
    url: '/assets/aistudio/87efc704f682a14b2d84e2e0972ae18e_944e7013.jpg',
    caption: 'Restoran & Area Makan Peserta — Hotel Grand Makmur, Jambi',
  },
  {
    url: '/assets/aistudio/0222o12000mwfyd963445_W_750_1624_R5_21faca3c.jpg',
    caption: 'Fasilitas Kolam Renang — Hotel Grand Makmur, Jambi',
  },
];

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  brandName: 'SAKITA',
  brandSubtitle: 'SEKOLAH AI KITA',
  tagline: 'Belajar AI, Bangun Aplikasi Sendiri, dan Buka Peluang Penghasilan Baru.',
  logoUrl: OFFICIAL_SAKITA_LOGO,
  heroEyebrow: 'INTENSIVE AI BOOTCAMP 2026',
  heroHeadline: 'Bangun Aplikasi Sendiri dengan AI.\nTanpa Harus Bisa Coding.',
  heroSubheadline:
    'Digitalisasikan sekolah dan pesantren Anda, kuasai keterampilan masa depan, dan buka peluang penghasilan baru.',
  heroDescription:
    'Pelatihan praktik intensif 4 hari di Hotel Grand Makmur, Jambi. Anda dibimbing langkah demi langkah membangun 10 proyek aplikasi digital—mulai dari PPDB, SPP, absensi, rapor, hingga sistem tahfidz—agar mampu mendigitalisasi lembaga secara mandiri sekaligus membuka peluang usaha digital di era AI.',
  bannerUrl: '',
  whatsappNumber: OFFICIAL_SAKITA_WHATSAPP,
  contactEmail: '',
  privacyPolicy:
    'Sekolah AI Kita (SAKITA) menghormati privasi data setiap calon peserta. Data biodata, kontak WhatsApp, email, informasi lembaga, dan bukti pembayaran yang Anda kirimkan hanya digunakan untuk keperluan administrasi pendaftaran, verifikasi pembayaran, komunikasi persiapan pelatihan, serta penerbitan e-tiket dan sertifikat pelatihan.\n\nData peserta disimpan dengan akses terbatas khusus administrator berwenang dan tidak diperjualbelikan atau dibagikan kepada pihak ketiga tanpa persetujuan peserta. Bukti transfer disimpan secara privat dan tunduk pada kebijakan retensi data internal setelah program selesai.',
  termsConditions:
    '1. Pendaftaran dianggap tercatat setelah peserta melengkapi formulir dan memperoleh nomor registrasi resmi SAKITA.\n2. Kursi pelatihan ditahan sementara setelah peserta mengunggah bukti transfer sesuai masa reservasi yang berlaku hingga diverifikasi oleh tim admin.\n3. Status peserta berubah menjadi LUNAS hanya setelah pembayaran diverifikasi secara resmi oleh administrator SAKITA.\n4. Peserta disarankan membawa laptop pribadi untuk keperluan praktik langsung selama 4 hari pelatihan.\n5. Pelatihan berfokus pada praktik membangun prototipe dan fondasi 10 proyek aplikasi digital yang selanjutnya dapat terus dikembangkan sesuai kebutuhan masing-masing lembaga pendidikan.\n6. Ketentuan pembatalan, penjadwalan ulang, atau pengalihan peserta dapat dikonsultasikan langsung dengan admin melalui kontak resmi SAKITA.',
  mentor: {
    enabled: false,
    name: '',
    role: '',
    photoUrl: '',
    experience: '',
    bio: '',
  },
  hotelGallery: OFFICIAL_HOTEL_GALLERY,
  projects: INITIAL_PROJECTS,
  facilities: INITIAL_FACILITIES,
  faqs: INITIAL_FAQS,
};

export const DEFAULT_BANK_SETTINGS: BankSettings = {
  isConfigured: false,
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  transferInstructions:
    'Silakan lakukan transfer sesuai nominal biaya pelatihan ke rekening di atas, lalu simpan bukti transfer untuk diunggah pada langkah berikutnya.',
};

export const DEFAULT_COMMUNITY_SETTINGS: CommunitySettings = {
  communityName: 'Komunitas Sekolah AI Kita (SAKITA)',
  whatsappInviteUrl: OFFICIAL_SAKITA_COMMUNITY_URL,
  description:
    'Bergabunglah dengan Komunitas Sekolah AI Kita untuk mendapatkan informasi persiapan pelatihan, berdiskusi, dan terhubung dengan peserta lainnya.',
  isActive: true,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  adminEmail: 'ahmadmahbubi@gmail.com',
  adminWhatsapp: OFFICIAL_SAKITA_WHATSAPP_RAW,
  participantEmailSubject: 'Pendaftaran Berhasil - Sekolah AI Kita',
  participantEmailTemplate:
    'Halo {{nama}},\n\nTerima kasih telah mendaftar di Sekolah AI Kita (SAKITA).\nNomor Registrasi: {{registrasi}}\nProgram: {{program}}\nPaket Pilihan: {{paket}} ({{penginapan}})\nNominal: {{nominal}}\nStatus Pembayaran: Menunggu Verifikasi\n\nTim admin kami akan segera memverifikasi bukti pembayaran Anda. Setelah status pembayaran Anda terverifikasi LUNAS oleh admin, akses resmi Komunitas Sekolah AI Kita akan otomatis terbuka pada halaman status pendaftaran Anda.',
  adminEmailSubject: 'Bukti Transfer Masuk — Perlu Verifikasi SAKITA',
  adminEmailTemplate:
    'Peserta baru telah mengunggah bukti transfer dan menunggu verifikasi Anda.\n\nNomor Registrasi: {{registrasi}}\nNama Peserta: {{nama}}\nLembaga: {{lembaga}} ({{jabatan}})\nProgram: {{program}}\nPaket: {{paket}} ({{penginapan}})\nPengirim: {{pengirim}} ({{bank}})\nTanggal Transfer: {{tanggal_transfer}}\nNominal: {{nominal}}\nStatus: Menunggu Verifikasi\n\nSegera verifikasi di Dashboard Admin:\n{{dashboard}}',
  adminWhatsappTemplate:
    '*BUKTI TRANSFER MASUK — SAKITA*\n\nNo. Reg: {{registrasi}}\nPeserta: {{nama}}\nLembaga: {{lembaga}}\nProgram: {{program}}\nPaket: {{paket}} ({{penginapan}})\nPengirim: {{pengirim}} ({{bank}})\nNominal: {{nominal}}\nStatus: Menunggu Verifikasi\n\nSilakan cek & verifikasi di Dashboard Admin:\n{{dashboard}}',
  verifiedEmailSubject: 'Pembayaran Terverifikasi (LUNAS) - Sekolah AI Kita',
  verifiedEmailTemplate:
    'Halo {{nama}},\n\nPembayaran Anda untuk program {{program}} ({{paket}} — {{penginapan}}) dengan nomor registrasi {{registrasi}} telah diverifikasi dan berstatus LUNAS.\n\nJadwal: {{tanggal}}\nLokasi: {{lokasi}}\n\nAkses Resmi Komunitas Sekolah AI Kita:\n{{komunitas}}\n\nInformasi persiapan pelatihan akan terus kami sampaikan melalui Komunitas Sekolah AI Kita.',
};

export const DEFAULT_TRAINER_SECTION_ORDER: TrainerSectionKey[] = [
  'expertise',
  'background',
  'tools',
  'portfolio',
  'whyLearn',
  'statement',
  'slogan',
  'cta',
];

export const DEFAULT_TRAINER_SECTION_VISIBILITY: TrainerSectionVisibility = {
  expertise: true,
  background: true,
  tools: true,
  portfolio: true,
  whyLearn: true,
  statement: true,
  slogan: true,
  cta: true,
};

export const OFFICIAL_PRIMARY_TRAINER_PHOTO =
  '/assets/aistudio/AHMAD_MAHBUBI._AN_3c173a30.jpg';

export const DEFAULT_PRIMARY_TRAINER: TrainerProfile = {
  id: 'ahmad-mahbubi-an',
  isPrimary: true,
  isPublished: true,
  displayOrder: 1,
  eyebrow: 'MEET YOUR TRAINER',
  sectionSubtitle: 'Kenali Pemateri Utama Anda',
  roleBadge: 'MAIN TRAINER',
  fullName: 'AHMAD MAHBUBI AN, S.H., M.Pd.',
  titlePrimary: 'AI Practitioner & Education Innovator',
  titleSecondary: 'Founder Sekolah AI Kita (SAKITA)',
  pillarsLabel: 'Education • Technology • Innovation',
  photoUrl: OFFICIAL_PRIMARY_TRAINER_PHOTO,
  headline: 'Dari Dunia Pendidikan Menuju Inovasi Digital.',
  subheadline:
    'Mengintegrasikan pengalaman dunia pendidikan, kepemimpinan, dan kecerdasan buatan untuk menciptakan solusi digital yang nyata dan membuka peluang baru di era AI.',
  bio: 'Ahmad Mahbubi AN, S.H., M.Pd. merupakan seorang praktisi pendidikan, pimpinan pesantren, advokat, penulis, dan motivator yang mendalami Artificial Intelligence (AI) serta penerapannya dalam pengembangan aplikasi digital, transformasi pendidikan, dan inovasi bisnis.\n\nPengalaman langsung dalam memimpin dan mengelola lembaga pendidikan mendorongnya untuk mempelajari berbagai teknologi kecerdasan buatan dan mengembangkan solusi digital guna menjawab kebutuhan nyata dunia pendidikan.\n\nDengan pendekatan pembelajaran berbasis praktik, ia memanfaatkan teknologi AI untuk membangun aplikasi, mengembangkan sistem informasi, menciptakan konten digital, serta mengeksplorasi berbagai peluang usaha berbasis teknologi.\n\nMelalui Sekolah AI Kita (SAKITA), ia berkomitmen membantu para guru, kepala sekolah, pimpinan pesantren, pengusaha, dan masyarakat umum agar tidak hanya menjadi pengguna teknologi, tetapi juga mampu menjadi pencipta solusi digital dengan bantuan AI, tanpa harus memiliki latar belakang sebagai programmer.',
  expertiseTitle: 'Areas of Expertise',
  expertiseSubtitle: 'Kompetensi dan Bidang Keahlian',
  expertise: [
    {
      id: 'exp-1',
      icon: 'Cpu',
      title: 'Artificial Intelligence & Generative AI',
      description: 'Pemanfaatan kecerdasan buatan untuk produktivitas, kreativitas, dan inovasi.',
    },
    {
      id: 'exp-2',
      icon: 'Layers',
      title: 'AI-Assisted Application Development',
      description: 'Pengembangan aplikasi digital dengan bantuan teknologi AI.',
    },
    {
      id: 'exp-3',
      icon: 'Terminal',
      title: 'Prompt Engineering',
      description: 'Teknik menyusun instruksi yang efektif untuk mengoptimalkan kemampuan AI.',
    },
    {
      id: 'exp-4',
      icon: 'Blocks',
      title: 'No-Code & AI-Assisted Development',
      description: 'Pengembangan website dan aplikasi tanpa harus menguasai coding secara mendalam.',
    },
    {
      id: 'exp-5',
      icon: 'GraduationCap',
      title: 'Digital Transformation in Education',
      description: 'Digitalisasi sistem pengelolaan sekolah dan pesantren.',
    },
    {
      id: 'exp-6',
      icon: 'Clapperboard',
      title: 'AI Content Creation',
      description: 'Pembuatan konten visual, video, audio, dan materi digital dengan bantuan AI.',
    },
    {
      id: 'exp-7',
      icon: 'Briefcase',
      title: 'AI for Business & Entrepreneurship',
      description: 'Pemanfaatan AI untuk menciptakan produk, jasa, dan peluang usaha.',
    },
    {
      id: 'exp-8',
      icon: 'Compass',
      title: 'Educational Leadership & Management',
      description: 'Kepemimpinan dan pengelolaan lembaga pendidikan.',
    },
  ],
  backgroundTitle: 'Professional Background',
  backgroundSubtitle: 'Riwayat Aktivitas & Peran Profesional',
  background: [
    'Founder Sekolah AI Kita (SAKITA)',
    'Praktisi AI & Pengembang Aplikasi Digital',
    'Pimpinan Pondok Qur’an Para Sahabat',
    'Ketua Yayasan Para Sahabat',
    'Advokat & Konsultan Hukum',
    'Pengajar Al-Qur’an',
    'Penulis & Motivator',
    'Mahasiswa Doktoral (S3) Pendidikan Agama Islam — UNISSULA',
  ],
  toolsTitle: 'Powered by Modern AI Technologies',
  toolsDisclaimer:
    'Platform teknologi AI modern yang dipelajari dan digunakan dalam praktik pengembangan aplikasi. SAKITA merupakan lembaga pelatihan independen dan tidak berafiliasi resmi dengan perusahaan pemilik platform tersebut.',
  tools: ['ChatGPT', 'Google Gemini', 'Google AI Studio', 'Lovable', 'Google Flow', 'Vercel'],
  portfolioTitle: 'From Knowledge to Real Innovation',
  portfolioSubtitle: 'Bukan Sekadar Teori, tetapi Karya Nyata.',
  portfolio: [],
  whyLearnTitle: 'Belajar dari Praktisi yang Memahami Kebutuhan Anda',
  whyLearnPoints: [
    'Memahami kebutuhan nyata sekolah dan pesantren.',
    'Berpengalaman dalam pengelolaan lembaga pendidikan.',
    'Menggunakan pendekatan pembelajaran berbasis praktik.',
    'Mengajarkan pembuatan aplikasi dengan bantuan AI tanpa harus menguasai coding secara mendalam.',
    'Membuka wawasan tentang peluang usaha dari keterampilan AI.',
  ],
  whyLearnNarrative:
    'Anda tidak hanya akan belajar bagaimana menggunakan AI, tetapi juga bagaimana memanfaatkannya untuk menciptakan aplikasi, menyelesaikan persoalan nyata, meningkatkan produktivitas, dan membuka peluang penghasilan.',
  personalStatement:
    'Di era kecerdasan buatan, kita tidak harus menjadi seorang programmer untuk mulai menciptakan teknologi. Dengan ilmu, kreativitas, dan kemampuan memanfaatkan AI, kita dapat membangun solusi, memberikan manfaat, dan membuka peluang baru.',
  personalStatementAuthor: 'Ahmad Mahbubi AN, S.H., M.Pd.',
  sloganLines: [
    'Berakar pada Nilai.',
    'Bertumbuh dengan Ilmu.',
    'Melangkah dengan Teknologi.',
  ],
  sloganEnglish: 'Rooted in Values. Powered by Innovation.',
  ctaHeadline:
    'Saatnya Anda Tidak Hanya Menjadi Pengguna AI, tetapi Menjadi Pencipta Solusi dengan AI.',
  ctaSubheadline:
    'Belajar langsung bersama praktisi pendidikan dan teknologi melalui pelatihan intensif berbasis proyek nyata.',
  ctaButtonLabel: 'BELAJAR LANGSUNG BERSAMA PEMATERI',
  sectionVisibility: DEFAULT_TRAINER_SECTION_VISIBILITY,
  sectionOrder: DEFAULT_TRAINER_SECTION_ORDER,
};
