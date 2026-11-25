import type {
  BankSettings,
  CommunitySettings,
  FaqItem,
  HotelPhotoItem,
  NotificationSettings,
  Program,
  ProjectItem,
  WebsiteSettings,
} from '../types';

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
      'Investasi Rp2.700.000 per peserta sudah mencakup menginap di Hotel Grand Makmur Jambi selama program, makan, snack, modul pelatihan, praktik 10 proyek aplikasi digital, pendampingan intensif 4 hari, serta akses Komunitas Sekolah AI Kita.',
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
      'Tautan undangan Komunitas Sekolah AI Kita akan langsung terbuka pada halaman sukses pendaftaran segera setelah Anda berhasil mengunggah bukti transfer.',
  },
  {
    question: 'Apakah setelah pelatihan saya bisa membuat dan menjual aplikasi sendiri?',
    answer:
      'Ya. Fokus utama pelatihan SAKITA adalah kemandirian praktik. Anda dibimbing menguasai alur perancangan hingga pembuatan aplikasi berbasis AI sehingga mampu membangun sistem untuk lembaga sendiri maupun menawarkan jasa dan menjual aplikasi digital kepada sekolah, pesantren, UMKM, atau instansi lain sebagai peluang penghasilan baru.',
  },
  {
    question: 'Bagaimana mengetahui status pembayaran?',
    answer:
      'Simpan tautan status pribadi dan bukti pendaftaran yang diberikan setelah mendaftar. Anda dapat memantau status verifikasi (Menunggu Verifikasi hingga Lunas) melalui halaman status peserta, dan tim admin juga akan menginformasikan setelah verifikasi selesai.',
  },
];

export const DEFAULT_PROGRAM: Program = {
  id: 'sakita-2026-batch-1',
  slug: 'kelas-intensif-ai-sekolah-pesantren-2026',
  name: 'Kelas Intensif AI untuk Pengelolaan Sekolah & Pesantren',
  batchLabel: 'INTENSIVE AI BOOTCAMP 2026',
  description:
    'Pelatihan praktik intensif 4 hari untuk membimbing pengelola sekolah dan pesantren membangun 10 proyek aplikasi digital lembaga dengan bantuan AI tanpa harus bisa coding.',
  dateLabel: '21–24 Desember 2026',
  startDateIso: '2026-12-21T08:00:00+07:00',
  endDateIso: '2026-12-24T17:00:00+07:00',
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
  heroHeadline: 'Saatnya Sekolah dan Pesantren Anda Naik Kelas.',
  heroSubheadline: 'Belajar AI, Bangun Aplikasi Sendiri, dan Buka Peluang Penghasilan Baru.',
  heroDescription:
    'Tanpa harus bisa coding, Anda dibimbing praktik langsung membangun sistem digital untuk sekolah, pesantren, dan lembaga—mulai dari PPDB, SPP, absensi, rapor, hingga tahfidz. Setelah pelatihan, Anda bukan hanya mandiri membangun aplikasi sendiri, tetapi juga mampu membuat dan menjual aplikasi digital sebagai peluang penghasilan baru.',
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
    'Halo {{nama}},\n\nSelamat datang di keluarga besar Sekolah AI Kita (SAKITA).\nNomor Registrasi: {{registrasi}}\nProgram: {{program}}\nStatus Pembayaran: Menunggu Verifikasi\n\nAkses Komunitas Sekolah AI Kita:\n{{komunitas}}\n\nTim kami akan segera memverifikasi bukti pembayaran Anda.',
  adminEmailSubject: 'Bukti Transfer Masuk — Perlu Verifikasi SAKITA',
  adminEmailTemplate:
    'Peserta baru telah mengunggah bukti transfer dan menunggu verifikasi Anda.\n\nNomor Registrasi: {{registrasi}}\nNama Peserta: {{nama}}\nLembaga: {{lembaga}} ({{jabatan}})\nProgram: {{program}}\nPengirim: {{pengirim}} ({{bank}})\nTanggal Transfer: {{tanggal_transfer}}\nNominal: {{nominal}}\nStatus: Menunggu Verifikasi\n\nSegera verifikasi di Dashboard Admin:\n{{dashboard}}',
  adminWhatsappTemplate:
    '*BUKTI TRANSFER MASUK — SAKITA*\n\nNo. Reg: {{registrasi}}\nPeserta: {{nama}}\nLembaga: {{lembaga}}\nProgram: {{program}}\nPengirim: {{pengirim}} ({{bank}})\nNominal: {{nominal}}\nStatus: Menunggu Verifikasi\n\nSilakan cek & verifikasi di Dashboard Admin:\n{{dashboard}}',
  verifiedEmailSubject: 'Pembayaran Terverifikasi (LUNAS) - Sekolah AI Kita',
  verifiedEmailTemplate:
    'Halo {{nama}},\n\nPembayaran Anda untuk program {{program}} dengan nomor registrasi {{registrasi}} telah diverifikasi dan berstatus LUNAS.\n\nJadwal: {{tanggal}}\nLokasi: {{lokasi}}\n\nInformasi persiapan pelatihan akan terus kami sampaikan melalui Komunitas Sekolah AI Kita.',
};
