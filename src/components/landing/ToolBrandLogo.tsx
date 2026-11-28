import { useId } from 'react';
import { Cpu } from 'lucide-react';

interface ToolBrandLogoProps {
  name: string;
}

export interface ToolBrandVisual {
  badgeClass: string;
  hoverBorderClass: string;
  subtitle: string;
}

export function getToolBrandVisual(name: string): ToolBrandVisual {
  const lower = name.toLowerCase();
  if (lower.includes('chatgpt') || lower.includes('openai')) {
    return {
      badgeClass: 'border-[#10A37F]/40 bg-[#10A37F]/15 shadow-[0_0_24px_-6px_rgba(16,163,127,0.55)]',
      hoverBorderClass: 'hover:border-[#10A37F]/60',
      subtitle: 'OpenAI',
    };
  }
  if (lower.includes('ai studio')) {
    return {
      badgeClass: 'border-[#4285F4]/45 bg-[#1A73E8]/18 shadow-[0_0_24px_-6px_rgba(66,133,244,0.6)]',
      hoverBorderClass: 'hover:border-[#4285F4]/65',
      subtitle: 'Google Developers',
    };
  }
  if (lower.includes('gemini')) {
    return {
      badgeClass: 'border-[#8B7CF6]/45 bg-[#4F6AF5]/18 shadow-[0_0_24px_-6px_rgba(139,124,246,0.6)]',
      hoverBorderClass: 'hover:border-[#8B7CF6]/65',
      subtitle: 'Google AI',
    };
  }
  if (lower.includes('lovable')) {
    return {
      badgeClass: 'border-[#F7418F]/45 bg-[#F7418F]/15 shadow-[0_0_24px_-6px_rgba(247,65,143,0.55)]',
      hoverBorderClass: 'hover:border-[#F7418F]/65',
      subtitle: 'AI App Builder',
    };
  }
  if (lower.includes('flow')) {
    return {
      badgeClass: 'border-[#34A853]/40 bg-[#4285F4]/15 shadow-[0_0_24px_-6px_rgba(52,168,83,0.5)]',
      hoverBorderClass: 'hover:border-[#34A853]/60',
      subtitle: 'Google Labs',
    };
  }
  if (lower.includes('vercel')) {
    return {
      badgeClass: 'border-white/25 bg-black/90 shadow-[0_0_24px_-6px_rgba(255,255,255,0.35)]',
      hoverBorderClass: 'hover:border-white/50',
      subtitle: 'Cloud Platform',
    };
  }
  if (lower.includes('claude') || lower.includes('anthropic')) {
    return {
      badgeClass: 'border-[#D97757]/45 bg-[#D97757]/15 shadow-[0_0_24px_-6px_rgba(217,119,87,0.5)]',
      hoverBorderClass: 'hover:border-[#D97757]/60',
      subtitle: 'Anthropic',
    };
  }
  if (lower.includes('firebase')) {
    return {
      badgeClass: 'border-[#FFCA28]/45 bg-[#FFA000]/15 shadow-[0_0_24px_-6px_rgba(255,202,40,0.45)]',
      hoverBorderClass: 'hover:border-[#FFCA28]/60',
      subtitle: 'Google Cloud',
    };
  }
  if (lower.includes('github')) {
    return {
      badgeClass: 'border-white/25 bg-[#161B22] shadow-[0_0_20px_-6px_rgba(255,255,255,0.28)]',
      hoverBorderClass: 'hover:border-white/50',
      subtitle: 'Developer Platform',
    };
  }
  if (lower.includes('supabase')) {
    return {
      badgeClass: 'border-[#3ECF8E]/40 bg-[#3ECF8E]/15 shadow-[0_0_24px_-6px_rgba(62,207,142,0.45)]',
      hoverBorderClass: 'hover:border-[#3ECF8E]/60',
      subtitle: 'Postgres Backend',
    };
  }
  if (lower.includes('canva')) {
    return {
      badgeClass: 'border-[#00C4CC]/45 bg-[#00C4CC]/15 shadow-[0_0_24px_-6px_rgba(0,196,204,0.45)]',
      hoverBorderClass: 'hover:border-[#00C4CC]/60',
      subtitle: 'Visual Design',
    };
  }
  return {
    badgeClass: 'border-[#2563EB]/35 bg-[#1246A0]/25',
    hoverBorderClass: 'hover:border-[#2563EB]/60',
    subtitle: 'AI Technology',
  };
}

export function ToolBrandLogo({ name }: ToolBrandLogoProps) {
  const uid = useId().replace(/:/g, '');
  const lower = name.toLowerCase();

  // 1. ChatGPT / OpenAI — Official 6-petal interlocking blossom mark
  if (lower.includes('chatgpt') || lower.includes('openai')) {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor" aria-hidden="true">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
      </svg>
    );
  }

  // 2. Google AI Studio — Iconic Studio Frame + Radiant Gemini Corner Sparkle
  if (lower.includes('ai studio')) {
    const frameGrad = `aistudio-frame-${uid}`;
    const starGrad = `aistudio-star-${uid}`;
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={frameGrad} x1="3" y1="21" x2="19" y2="5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1A73E8" />
            <stop offset="55%" stopColor="#4285F4" />
            <stop offset="100%" stopColor="#8AB4F8" />
          </linearGradient>
          <linearGradient id={starGrad} x1="12" y1="2" x2="22" y2="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#A5B4FC" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
        <path
          d="M11.8 4.2H6.6A2.6 2.6 0 0 0 4 6.8v10.6A2.6 2.6 0 0 0 6.6 20h10.6a2.6 2.6 0 0 0 2.6-2.6v-5.2"
          stroke={`url(#${frameGrad})`}
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M8.4 15.6V10.6a1.4 1.4 0 0 1 1.4-1.4h.6m-2 4.2h3.4M12.2 15.6V9.2"
          stroke="#E0F2FE"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.92"
        />
        <path
          d="M17.2 1.8c.32 2.85 2.55 5.08 5.4 5.4-2.85.32-5.08 2.55-5.4 5.4-.32-2.85-2.55-5.08-5.4-5.4 2.85-.32 5.08-2.55 5.4-5.4Z"
          fill={`url(#${starGrad})`}
        />
      </svg>
    );
  }

  // 3. Google Gemini — Official 4-point sparkle with authentic Gemini spectrum gradient
  if (lower.includes('gemini')) {
    const gradId = `gemini-grad-${uid}`;
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1BA1E3" />
            <stop offset="38%" stopColor="#4285F4" />
            <stop offset="72%" stopColor="#9B72CB" />
            <stop offset="100%" stopColor="#D96570" />
          </linearGradient>
        </defs>
        <path
          d="M12 1.5C12.45 7.25 16.75 11.55 22.5 12C16.75 12.45 12.45 16.75 12 22.5C11.55 16.75 7.25 12.45 1.5 12C7.25 11.55 11.55 7.25 12 1.5Z"
          fill={`url(#${gradId})`}
        />
      </svg>
    );
  }

  // 4. Lovable — Iconic multi-color gradient heart emblem
  if (lower.includes('lovable')) {
    const heartGrad = `lovable-heart-${uid}`;
    const lobeGrad = `lovable-lobe-${uid}`;
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={heartGrad} x1="4" y1="20" x2="21" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF8A00" />
            <stop offset="42%" stopColor="#FF2E88" />
            <stop offset="78%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <radialGradient id={lobeGrad} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#FFE066" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#FF5E5B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FF2E88" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d="M12 21.2c-.35 0-.7-.12-.98-.35C6.1 16.95 3 13.6 3 9.35 3 6.18 5.48 3.7 8.55 3.7c1.66 0 3.16.74 4.18 1.92a5.5 5.5 0 0 1 2.72-.72c3.07 0 5.55 2.48 5.55 5.65 0 3.65-3.1 6.72-8.02 10.3a1.65 1.65 0 0 1-.98.35Z"
          fill={`url(#${heartGrad})`}
        />
        <path
          d="M8.55 3.7C5.48 3.7 3 6.18 3 9.35c0 3.68 2.46 6.73 6.62 10.12 1.25-3.35.95-7.45-1.15-10.42C7.42 7.55 7.45 5.25 8.55 3.7Z"
          fill={`url(#${lobeGrad})`}
        />
      </svg>
    );
  }

  // 5. Google Flow — Luminous Google 4-color flowing wave/ribbon emblem
  if (lower.includes('flow')) {
    const wave1 = `flow-w1-${uid}`;
    const wave2 = `flow-w2-${uid}`;
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={wave1} x1="2" y1="8" x2="22" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4285F4" />
            <stop offset="50%" stopColor="#34A853" />
            <stop offset="100%" stopColor="#FBBC05" />
          </linearGradient>
          <linearGradient id={wave2} x1="3" y1="16" x2="21" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EA4335" />
            <stop offset="50%" stopColor="#FBBC05" />
            <stop offset="100%" stopColor="#4285F4" />
          </linearGradient>
        </defs>
        <path
          d="M3 9.5C5.6 6.2 8.9 6.2 12 10.2c3.1 4 6.4 4 9 .7"
          stroke={`url(#${wave1})`}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M3 15.2c2.6 3.3 5.9 3.3 9-.7 3.1-4 6.4-4 9-.7"
          stroke={`url(#${wave2})`}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeOpacity="0.92"
        />
      </svg>
    );
  }

  // 6. Vercel — Exact equilateral pure-white triangle
  if (lower.includes('vercel')) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor" aria-hidden="true">
        <path d="M12 4.25L20.8 19.5H3.2L12 4.25Z" />
      </svg>
    );
  }

  // Bonus: Claude / Anthropic
  if (lower.includes('claude') || lower.includes('anthropic')) {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#D97757]" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
        <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
      </svg>
    );
  }

  // Bonus: Firebase
  if (lower.includes('firebase')) {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
        <path d="M5.5 18.2 7.8 4.4c.12-.68 1.05-.8 1.35-.18l2.5 5.15 2.7-2.6c.42-.4 1.12-.2 1.24.38L18.5 18.2 12 21.6l-6.5-3.4Z" fill="#FFA000" />
        <path d="M18.5 18.2 15.6 7.15c-.12-.58-.82-.78-1.24-.38L5.5 18.2 12 21.6l6.5-3.4Z" fill="#FFCA28" />
      </svg>
    );
  }

  // Bonus: GitHub
  if (lower.includes('github')) {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.59 2 12.253c0 4.53 2.865 8.374 6.839 9.73.5.095.682-.222.682-.493 0-.243-.009-.887-.014-1.741-2.782.619-3.369-1.375-3.369-1.375-.454-1.184-1.11-1.499-1.11-1.499-.908-.637.069-.624.069-.624 1.003.073 1.531 1.056 1.531 1.056.892 1.568 2.341 1.115 2.91.853.092-.663.35-1.115.636-1.371-2.22-.259-4.555-1.139-4.555-5.068 0-1.12.39-2.035 1.029-2.752-.103-.26-.446-1.302.098-2.714 0 0 .84-.276 2.75 1.051A9.36 9.36 0 0 1 12 6.844c.85.004 1.705.118 2.504.346 1.909-1.327 2.747-1.051 2.747-1.051.546 1.412.203 2.454.1 2.714.64.717 1.028 1.632 1.028 2.752 0 3.939-2.339 4.806-4.566 5.06.359.317.678.944.678 1.902 0 1.373-.012 2.48-.012 2.817 0 .274.18.594.688.492C19.138 20.623 22 16.782 22 12.253 22 6.59 17.523 2 12 2Z" />
      </svg>
    );
  }

  // Bonus: Supabase
  if (lower.includes('supabase')) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d="M13.5 21.2c-.55.7-1.68.31-1.68-.58V13.5h8.05c1.1 0 1.7 1.28.99 2.13L13.5 21.2Z" fill="#3ECF8E" />
        <path d="M10.5 2.8c.55-.7 1.68-.31 1.68.58V10.5H4.13c-1.1 0-1.7-1.28-.99-2.13L10.5 2.8Z" fill="#3ECF8E" fillOpacity="0.72" />
      </svg>
    );
  }

  // Bonus: Canva
  if (lower.includes('canva')) {
    const canvaGrad = `canva-grad-${uid}`;
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={canvaGrad} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00C4CC" />
            <stop offset="100%" stopColor="#7D2AE8" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="9.5" fill={`url(#${canvaGrad})`} />
        <path d="M15.4 14.3c-.65 1.15-1.75 2-3.2 2-2.15 0-3.6-1.75-3.6-4.25 0-2.55 1.55-4.35 3.7-4.35 1.35 0 2.35.65 2.85 1.55" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" />
      </svg>
    );
  }

  return <Cpu className="h-5 w-5 text-[#60A5FA]" aria-hidden="true" />;
}
