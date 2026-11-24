import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetIso: string;
}

interface TimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calculateRemaining(targetIso: string): TimeParts {
  const targetMs = new Date(targetIso).getTime();
  const nowMs = Date.now();
  const diff = targetMs - nowMs;
  if (Number.isNaN(targetMs) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, expired: false };
}

export function CountdownTimer({ targetIso }: CountdownTimerProps) {
  const [time, setTime] = useState<TimeParts>(() => calculateRemaining(targetIso));

  useEffect(() => {
    setTime(calculateRemaining(targetIso));
    const timer = window.setInterval(() => {
      setTime(calculateRemaining(targetIso));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetIso]);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#080F1D]/80 p-5">
      <div className="flex items-center justify-between gap-2 text-xs text-[#94A3B8]">
        <span className="inline-flex items-center gap-1.5 font-medium text-[#F8FAFC]">
          <Clock className="h-3.5 w-3.5 text-[#22D3EE]" />
          Hitung Mundur Pelatihan
        </span>
        <span>Zona Waktu Asia/Jakarta (WIB)</span>
      </div>

      {time.expired ? (
        <p className="mt-4 text-sm font-medium text-[#22D3EE]">
          Jadwal pelaksanaan pelatihan telah tiba atau sedang berlangsung.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { label: 'Hari', value: String(time.days).padStart(2, '0') },
            { label: 'Jam', value: String(time.hours).padStart(2, '0') },
            { label: 'Menit', value: String(time.minutes).padStart(2, '0') },
            { label: 'Detik', value: String(time.seconds).padStart(2, '0') },
          ].map((unit) => (
            <div
              key={unit.label}
              className="rounded-lg border border-slate-800 bg-[#0F172A] px-2 py-3 text-center"
            >
              <div className="font-mono text-2xl font-bold text-[#F8FAFC] tabular-nums sm:text-3xl">
                {unit.value}
              </div>
              <div className="mt-1 text-xs text-[#94A3B8]">{unit.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
