import { forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MoreHorizontal, ArrowRight, Check } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  index: number;
  total: number;
  title: string;
  subtitle?: string;
  content: string;
  image?: string;
  isCover?: boolean;
  className?: string;
}

export const TweetCard = forwardRef<HTMLDivElement, CardProps>(({
  index,
  total,
  title,
  subtitle,
  content,
  image,
  isCover = false,
  className
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative bg-white shadow-xl overflow-hidden flex flex-col",
        "w-[1080px] h-[1440px] shrink-0 transform origin-top-left",
        className
      )}
      style={{ scale: '0.4' }} // Scale down for preview if needed, but the actual dimensions are 1080x1440
    >
      {/* Header (Twitter Style) */}
      <div className="px-12 pt-16 flex items-start justify-between shrink-0">
        <div className="flex gap-4">
          {/* Avatar with specific style: red long hair, cat-eye glasses, red lips */}
          <div className="w-16 h-16 rounded-full bg-gray-100 flex-shrink-0 border border-gray-200 overflow-hidden relative">
             <div className="absolute inset-0 bg-red-700 rounded-full scale-110 -translate-y-1" /> {/* Background Hair */}
             <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jinger&hairColor=af1919&glasses=catEye&mouth=serious&top=longHair"
              alt="Avatar"
              className="w-full h-full object-cover relative z-10"
             />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[28px] tracking-tight">讨厌吃Ginger的Jinger</span>
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#1D9BF0] fill-current">
                <path d="M22.5 12.5c0-1.58-.8-2.47-1.24-3.19-.36-.58-.44-1.1-.25-1.74.21-.69.67-1.44 1.1-2.02.38-.52.7-1.07.7-1.8 0-1.27-.99-2.25-2.25-2.25-.72 0-1.27.31-1.8.69-.58.42-1.33.89-2.02 1.1-.64.19-1.16.11-1.74-.25-.72-.44-1.61-1.24-3.19-1.24s-2.47.8-3.19 1.24c-.58.36-1.1.44-1.74.25-.69-.21-1.44-.67-2.02-1.1-.52-.38-1.07-.69-1.8-.69-1.27 0-2.25.99-2.25 2.25 0 .72.31 1.27.69 1.8.42.58.89 1.33 1.1 2.02.19.64.11 1.16-.25 1.74-.44.72-1.24 1.61-1.24 3.19s.8 2.47 1.24 3.19c.36.58.44 1.1.25 1.74-.21.69-.67 1.44-1.1 2.02-.38.52-.69 1.07-.69 1.8 0 1.27.99 2.25 2.25 2.25.72 0 1.27-.31 1.8-.69.58-.42 1.33-.89 2.02-1.1.64-.19 1.16-.11 1.74.25.72.44 1.61 1.24 3.19 1.24s 2.47-.8 3.19-1.24c.58-.36 1.1-.44 1.74-.25.69.21 1.44.67 2.02 1.1.52.38 1.07.69 1.8.69 1.27 0 2.25-.99 2.25-2.25 0-.73-.31-1.28-.69-1.8-.42-.58-.89-1.33-1.1-2.02-.19-.64-.11-1.16.25-1.74.44-.72 1.24-1.61 1.24-3.19zM10 17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <span className="text-gray-500 text-xl">@讨厌吃Ginger的Jinger</span>
          </div>
        </div>
        <MoreHorizontal className="text-gray-500 w-8 h-8" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-12 mt-12 flex flex-col min-h-0">
        {isCover ? (
          <div className="flex flex-col h-full">
            {/* Foreground: Titles */}
            <div className="mb-12 z-10">
              <h1 className="text-[96px] font-black leading-[1.05] tracking-tighter bg-white inline-block px-2 py-0.5 shadow-[8px_8px_0_rgba(0,0,0,0.02)]">
                {title.split('：')[0] || title}
              </h1>
              <br />
              {title.includes('：') && (
                <h1 className="text-[72px] font-black leading-tight bg-white inline-block px-2 py-0.5 mt-2 shadow-[8px_8px_0_rgba(0,0,0,0.02)]">
                  {title.split('：')[1]}
                </h1>
              )}
              {subtitle && (
                <p className="mt-8 text-[32px] font-bold text-gray-700 max-w-[800px] leading-snug">
                  {subtitle}
                </p>
              )}
            </div>
            
            {/* Cover Visuals (Mid-ground) */}
            <div className="relative flex-1 bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden shadow-inner mb-6">
               <div className="absolute inset-0 p-12 flex items-center justify-center">
                  <div className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
                    <div className="h-4 bg-gray-200 border-b border-gray-300 flex gap-1 px-2 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    </div>
                    <img src={image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1080&auto=format&fit=crop'} className="flex-1 object-cover" />
                  </div>
               </div>
               
               {/* Decorative stickers/shapes */}
               <div className="absolute top-10 right-10 w-32 h-32 bg-yellow-400 rounded-full mix-blend-multiply opacity-20 blur-xl animate-pulse" />
               <div className="absolute bottom-20 left-10 w-48 h-48 bg-blue-400 rounded-full mix-blend-multiply opacity-20 blur-xl" />
               
               {/* 星星装饰 */}
               <div className="absolute top-10 right-14 text-yellow-400 text-6xl opacity-30">✦</div>
               <div className="absolute bottom-16 left-12 text-blue-400 text-5xl opacity-30">✧</div>
               
               <div className="absolute -bottom-4 right-10 px-8 py-3 bg-white border border-gray-100 shadow-xl rounded-2xl font-black text-3xl rotate-3 tracking-widest text-red-500">
                  AI WORKFLOW ⚡️
               </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <h2 className="text-[56px] font-black leading-tight mb-10 text-black border-b-8 border-red-500 inline-block self-start px-2">
              {index}. {title}
            </h2>
            <div className="text-[34px] leading-[1.6] text-gray-800 whitespace-pre-wrap flex-1 font-medium bg-gray-50/50 p-8 rounded-3xl border border-dashed border-gray-200">
              {content}
            </div>
            
            {image && (
              <div className="mt-8 mb-6 rounded-3xl border border-gray-200 overflow-hidden bg-white flex items-center justify-center p-6 max-h-[550px] shadow-lg">
                  <img src={image} className="max-w-full max-h-full object-contain rounded-xl" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Twitter Actions Footer (Simplified for XHS style) */}
      <div className="px-12 py-8 flex gap-12 text-gray-300 font-bold text-xl shrink-0">
          <span className="flex items-center gap-2">💬 {100 + index * 12}</span>
          <span className="flex items-center gap-2">🔄 {40 + index * 5}</span>
          <span className="flex items-center gap-2 text-red-100">❤️ {1000 + index * 88}</span>
      </div>

      {/* Footer / Page Indicator */}
      <div className="absolute bottom-12 right-12 flex items-center gap-4">
        <div className="text-gray-400 text-xl font-black uppercase tracking-tighter italic">
          Next Page →
        </div>
        <div className="px-5 py-2 bg-black text-white text-2xl font-mono font-bold rounded-xl shadow-xl flex items-center justify-center">
          {index.toString().padStart(2, '0')}/{total.toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  );
});

TweetCard.displayName = "TweetCard";
