import type { Timestamp } from 'firebase/firestore';

export type PaymentStatus =
  | 'belum_unggah'
  | 'menunggu_verifikasi'
  | 'lunas'
  | 'ditolak'
  | 'minta_bukti_ulang'
  | 'daftar_tunggu';

export type RegistrationStatus =
  | 'pending_payment'
  | 'active'
  | 'waitlist'
  | 'cancelled'
  | 'expired';

export type ProgramStatus = 'open' | 'closed' | 'archived';

export type TrainingPackageCode = 'paket_hemat' | 'paket_premium';

export interface TrainingPackageOption {
  code: TrainingPackageCode;
  name: 'Paket Hemat' | 'Paket Premium';
  price: 1950000 | 2700000;
  includesLodging: boolean;
  lodgingShortLabel: string;
  lodgingDetailLabel: string;
  highlightLabel: string;
  ctaLabel: string;
  accent: 'cyan' | 'gold';
  confirmedFacilities: string[];
}

export interface ProjectItem {
  number: string;
  icon: string;
  title: string;
  description: string;
  benefit: string;
}

export type DemoAppStatus = 'demo_tersedia' | 'dalam_pengembangan' | 'segera_hadir';

export interface DemoAppItem {
  id: string;
  orderNumber: number;
  name: string;
  subtitle: string;
  category: string;
  description: string;
  features: string[];
  icon: string;
  status: DemoAppStatus;
  demoUrl: string;
  screenshotUrl: string;
  isVisible: boolean;
  createdAt?: Timestamp | unknown;
  updatedAt?: Timestamp | unknown;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface HotelPhotoItem {
  url: string;
  caption: string;
}

export interface MentorProfile {
  enabled: boolean;
  name: string;
  role: string;
  photoUrl: string;
  experience: string;
  bio: string;
}

export interface TrainerExpertiseItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface TrainerPortfolioItem {
  id: string;
  name: string;
  category: string;
  description: string;
  mainFeatures: string[];
  status: string;
  demoUrl: string;
  screenshotUrl: string;
}

export type TrainerSectionKey =
  | 'expertise'
  | 'background'
  | 'tools'
  | 'portfolio'
  | 'whyLearn'
  | 'statement'
  | 'slogan'
  | 'cta';

export interface TrainerSectionVisibility {
  expertise: boolean;
  background: boolean;
  tools: boolean;
  portfolio: boolean;
  whyLearn: boolean;
  statement: boolean;
  slogan: boolean;
  cta: boolean;
}

export interface TrainerProfile {
  id: string;
  isPrimary: boolean;
  isPublished: boolean;
  displayOrder: number;
  eyebrow: string;
  sectionSubtitle: string;
  roleBadge: string;
  fullName: string;
  titlePrimary: string;
  titleSecondary: string;
  pillarsLabel: string;
  photoUrl: string;
  headline: string;
  subheadline: string;
  bio: string;
  expertiseTitle: string;
  expertiseSubtitle: string;
  expertise: TrainerExpertiseItem[];
  backgroundTitle: string;
  backgroundSubtitle: string;
  background: string[];
  toolsTitle: string;
  toolsDisclaimer: string;
  tools: string[];
  portfolioTitle: string;
  portfolioSubtitle: string;
  portfolio: TrainerPortfolioItem[];
  whyLearnTitle: string;
  whyLearnPoints: string[];
  whyLearnNarrative: string;
  personalStatement: string;
  personalStatementAuthor: string;
  sloganLines: string[];
  sloganEnglish: string;
  ctaHeadline: string;
  ctaSubheadline: string;
  ctaButtonLabel: string;
  sectionVisibility: TrainerSectionVisibility;
  sectionOrder: TrainerSectionKey[];
  createdAt?: Timestamp | unknown;
  updatedAt?: Timestamp | unknown;
}

export interface TargetAudienceItem {
  role: string;
  desc: string;
}

export interface Program {
  id: string;
  slug: string;
  name: string;
  batchLabel: string;
  description: string;
  dateLabel: string;
  startDateIso: string;
  endDateIso: string;
  durationLabel: string;
  location: string;
  price: number;
  quota: number;
  confirmedCount: number;
  reservedCount: number;
  waitlistCount: number;
  registrationSeq: number;
  reservationHours: number;
  projectCount: number;
  targetRevenue: number;
  status: ProgramStatus;
  isFeatured: boolean;
  facilities: string[];
  curriculum: ProjectItem[];
  bannerUrl?: string;
  headline?: string;
  subheadline?: string;
  targetAudience?: TargetAudienceItem[];
  createdAt?: Timestamp | unknown;
  updatedAt?: Timestamp | unknown;
}

export interface Registration {
  id: string;
  registrationNumber: string;
  accessToken: string;
  programId: string;
  programName: string;
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
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  packageCode?: TrainingPackageCode;
  packageName?: string;
  packagePrice?: number;
  includesLodging?: boolean;
  rejectionReason: string;
  reservationExpiresAt: string;
  createdAt?: Timestamp | unknown;
  updatedAt?: Timestamp | unknown;
}

export interface RegistrationTicket {
  accessToken: string;
  registrationId: string;
  registrationNumber: string;
  programId: string;
  programName: string;
  programDates: string;
  programLocation: string;
  fullName: string;
  institution: string;
  amount: number;
  packageCode?: TrainingPackageCode;
  packageName?: string;
  packagePrice?: number;
  includesLodging?: boolean;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  rejectionReason: string;
  reservationExpiresAt: string;
  createdAt?: Timestamp | unknown;
  updatedAt?: Timestamp | unknown;
}

export interface Payment {
  id: string;
  registrationId: string;
  registrationNumber: string;
  accessToken: string;
  programId: string;
  packageCode?: TrainingPackageCode;
  packageName?: string;
  senderName: string;
  senderBank: string;
  transferDate: string;
  transferAmount: number;
  proofFilePath: string;
  proofFileName: string;
  proofMimeType: 'image/jpeg' | 'image/png' | 'application/pdf';
  verificationStatus: 'menunggu_verifikasi' | 'lunas' | 'ditolak' | 'minta_bukti_ulang';
  verifiedBy: string;
  verifiedAt: string;
  rejectionReason: string;
  createdAt?: Timestamp | unknown;
  updatedAt?: Timestamp | unknown;
}

export interface WebsiteSettings {
  brandName: string;
  brandSubtitle: string;
  tagline: string;
  logoUrl: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroDescription: string;
  bannerUrl: string;
  whatsappNumber: string;
  contactEmail: string;
  privacyPolicy: string;
  termsConditions: string;
  mentor: MentorProfile;
  hotelGallery: HotelPhotoItem[];
  projects: ProjectItem[];
  facilities: string[];
  faqs: FaqItem[];
  updatedAt?: Timestamp | unknown;
}

export interface BankSettings {
  isConfigured: boolean;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  transferInstructions: string;
  updatedAt?: Timestamp | unknown;
}

export interface CommunitySettings {
  communityName: string;
  whatsappInviteUrl: string;
  description: string;
  isActive: boolean;
  updatedAt?: Timestamp | unknown;
}

export interface NotificationSettings {
  adminEmail: string;
  adminWhatsapp: string;
  participantEmailSubject: string;
  participantEmailTemplate: string;
  adminEmailSubject: string;
  adminEmailTemplate: string;
  adminWhatsappTemplate: string;
  verifiedEmailSubject: string;
  verifiedEmailTemplate: string;
  updatedAt?: Timestamp | unknown;
}

export interface NotificationLog {
  id: string;
  eventKey: string;
  channel: 'email_participant' | 'email_admin' | 'whatsapp_admin' | 'email_verified';
  recipient: string;
  subject: string;
  registrationNumber: string;
  status: 'sent' | 'failed' | 'unconfigured' | 'queued';
  attempts: number;
  errorMessage: string;
  payloadSummary: string;
  createdAt?: Timestamp | unknown;
  updatedAt?: Timestamp | unknown;
}

export interface AuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt?: Timestamp | unknown;
}

export interface AdminUserRecord {
  uid: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  active: boolean;
  createdAt?: Timestamp | unknown;
  updatedAt?: Timestamp | unknown;
}
