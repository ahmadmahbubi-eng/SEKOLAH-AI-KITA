import { useState } from 'react';
import {
  BarChart3,
  BookMarked,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  Users,
} from 'lucide-react';

type PreviewTab = 'ppdb' | 'spp' | 'tahfidz' | 'pimpinan';

const TAB_DATA: Record<
  PreviewTab,
  {
    label: string;
    title: string;
    subtitle: string;
    metrics: Array<{ label: string; value: string; note: string }>;
    rows: Array<{ col1: string; col2: string; col3: string; status: string }>;
    columns: [string, string, string, string];
  }
> = {
  ppdb: {
    label: 'PPDB',
    title: 'Modul Penerimaan Siswa & Santri Baru',
    subtitle: 'Contoh tampilan prototipe pendaftaran online lembaga',
    metrics: [
      { label: 'Calon Terdaftar', value: '148', note: 'Gelombang I' },
      { label: 'Berkas Lengkap', value: '124', note: '83,7% terverifikasi' },
      { label: 'Jadwal Seleksi', value: '14 Jul', note: 'Ruang CBT A–C' },
    ],
    columns: ['Calon Peserta', 'Jenjang', 'Asal Sekolah', 'Status'],
    rows: [
      { col1: 'A. Fauzan Hakim', col2: 'SMP IT', col3: 'SDN 12 Jambi', status: 'Terverifikasi' },
      { col1: 'Nabila Azzahra', col2: 'MA Tahfidz', col3: 'MTs Al-Hidayah', status: 'Menunggu Tes' },
      { col1: 'Rafi Pratama', col2: 'SMA Boarding', col3: 'SMPN 04 Muaro', status: 'Terverifikasi' },
    ],
  },
  spp: {
    label: 'Keuangan SPP',
    title: 'Modul Pencatatan SPP & Arus Kas',
    subtitle: 'Contoh tampilan prototipe pencatatan iuran bulanan',
    metrics: [
      { label: 'Pemasukan Bulan Ini', value: 'Rp84,5 Jt', note: '312 transaksi' },
      { label: 'Tingkat Pelunasan', value: '91,2%', note: 'Periode berjalan' },
      { label: 'Perlu Konfirmasi', value: '8', note: 'Bukti transfer' },
    ],
    columns: ['Nama Siswa', 'Kelas', 'Nominal', 'Keterangan'],
    rows: [
      { col1: 'Zaidan Al-Farizi', col2: 'VIII-A', col3: 'Rp450.000', status: 'Lunas' },
      { col1: 'Siti Rahmawati', col2: 'X-IPA 2', col3: 'Rp600.000', status: 'Lunas' },
      { col1: 'M. Ilham Saputra', col2: 'IX-B', col3: 'Rp450.000', status: 'Menunggu' },
    ],
  },
  tahfidz: {
    label: 'Tahfidz',
    title: "Modul Monitoring Hafalan Al-Qur'an",
    subtitle: 'Contoh tampilan prototipe setoran & murajaah santri',
    metrics: [
      { label: 'Setoran Hari Ini', value: '86', note: '6 halaqah aktif' },
      { label: 'Rata-rata Capaian', value: '4,2 Juz', note: 'Semester ganjil' },
      { label: 'Tasmi Terdekat', value: '12 Santri', note: 'Pekan ini' },
    ],
    columns: ['Nama Santri', 'Halaqah', 'Capaian Terakhir', 'Predikat'],
    rows: [
      { col1: 'Abdullah Syafiq', col2: 'Ustadz Ridwan', col3: 'Juz 14 · Hal. 12', status: 'Mumtaz' },
      { col1: 'Hafshah Kamila', col2: 'Ustadzah Aisyah', col3: 'Juz 9 · Hal. 18', status: 'Jayyid Jiddan' },
      { col1: 'Fathan Mubarak', col2: 'Ustadz Hasan', col3: 'Juz 6 · Hal. 5', status: 'Murajaah' },
    ],
  },
  pimpinan: {
    label: 'Pimpinan',
    title: 'Dashboard Ringkasan Eksekutif Lembaga',
    subtitle: 'Contoh tampilan prototipe pantauan terpadu yayasan',
    metrics: [
      { label: 'Kehadiran Hari Ini', value: '97,4%', note: 'Siswa & pengajar' },
      { label: 'Izin Asrama Aktif', value: '5', note: 'Tercatat digital' },
      { label: 'Porsi Dapur Hari Ini', value: '420', note: '3 waktu makan' },
    ],
    columns: ['Unit Lembaga', 'Kehadiran', 'Keuangan', 'Kondisi'],
    rows: [
      { col1: 'Unit Madrasah Tsanawiyah', col2: '98,1%', col3: '94% Terbayar', status: 'Terkendali' },
      { col1: 'Unit Madrasah Aliyah', col2: '96,8%', col3: '89% Terbayar', status: 'Terkendali' },
      { col1: 'Unit Kepengasuhan Asrama', col2: '97,5%', col3: 'Operasional', status: 'Aktif' },
    ],
  },
};

export function HeroDashboardPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('ppdb');
  const current = TAB_DATA[activeTab];

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-[#0F172A] p-4 sm:p-5 shadow-2xl shadow-black/40">
      {/* Window chrome + product illustration label */}
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-[#22D3EE]" />
            <span className="text-xs font-medium text-[#F8FAFC]">
              Ilustrasi Produk — Sistem Digital Lembaga
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#94A3B8]">Simulasi Antarmuka</span>
        </div>

        {/* Interactive module switcher */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg bg-[#080F1D] p-1 border border-slate-800/80">
          {(
            [
              { id: 'ppdb', icon: Users, label: 'PPDB' },
              { id: 'spp', icon: CreditCard, label: 'Keuangan SPP' },
              { id: 'tahfidz', icon: BookMarked, label: 'Tahfidz' },
              { id: 'pimpinan', icon: BarChart3, label: 'Pimpinan' },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#0F172A] text-[#22D3EE] ring-1 ring-[#22D3EE]/30'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Title */}
        <div className="mt-5">
          <p className="font-display text-sm font-semibold text-[#F8FAFC]">{current.title}</p>
          <p className="mt-0.5 text-xs text-[#94A3B8]">{current.subtitle}</p>
        </div>

        {/* 3 metrics strip */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {current.metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-lg border border-slate-800 bg-[#080F1D]/80 p-3"
            >
              <p className="text-[11px] text-[#94A3B8] truncate">{m.label}</p>
              <p className="mt-1 font-mono text-base font-semibold text-[#F8FAFC] tabular-nums">
                {m.value}
              </p>
              <p className="mt-0.5 text-[11px] text-[#94A3B8]/80 truncate">{m.note}</p>
            </div>
          ))}
        </div>

        {/* Data table preview */}
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-800 bg-[#080F1D]/70">
          <div className="grid grid-cols-12 border-b border-slate-800 px-3 py-2 text-[11px] font-medium text-[#94A3B8]">
            <span className="col-span-4">{current.columns[0]}</span>
            <span className="col-span-3">{current.columns[1]}</span>
            <span className="col-span-3">{current.columns[2]}</span>
            <span className="col-span-2 text-right">{current.columns[3]}</span>
          </div>
          <div className="divide-y divide-slate-800/80">
            {current.rows.map((row) => (
              <div
                key={row.col1}
                className="grid grid-cols-12 items-center px-3 py-2.5 text-xs text-[#F8FAFC]"
              >
                <span className="col-span-4 truncate font-medium">{row.col1}</span>
                <span className="col-span-3 truncate text-[#94A3B8]">{row.col2}</span>
                <span className="col-span-3 truncate font-mono text-[11px] text-[#94A3B8] tabular-nums">
                  {row.col3}
                </span>
                <span className="col-span-2 text-right text-[11px] font-medium text-[#10B981]">
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Caption footer */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-[11px] text-[#94A3B8]">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
          <span>Contoh ilustrasi proyek praktik peserta SAKITA</span>
        </span>
        <span className="font-mono text-[#22D3EE]/80">4 Hari · 10 Proyek</span>
      </div>
    </div>
  );
}
