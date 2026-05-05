import { forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  MoreHorizontal, 
  MessageCircle, 
  Heart, 
  BarChart3, 
  Sparkles 
} from 'lucide-react';

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
  authorInfo?: {
    name: string;
    handle: string;
    avatarSeed: string;
  };
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
  authorInfo = { name: 'Jinger', handle: '@Jinger_Vibe', avatarSeed: 'Jinger' },
  className
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative bg-white shadow-xl overflow-hidden flex flex-col",
        "w-[1080px] h-[1440px] shrink-0",
        className
      )}
    >
      {/* Dynamic Background Pattern for aesthetic */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-900 to-transparent"></div>
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-gray-900 to-transparent"></div>
      </div>

      {/* Header (Authentic Twitter Style) */}
      <div className="px-16 pt-20 flex items-start justify-between shrink-0">
        <div className="flex gap-5">
          {/* Avatar Area */}
          <div className="w-20 h-20 rounded-full bg-red-500 flex-shrink-0 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-white font-black text-4xl italic">
             <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${authorInfo.avatarSeed}`}
              alt="Avatar"
              className="w-full h-full object-cover"
             />
          </div>
          <div className="flex flex-col mt-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-[36px] tracking-tight text-gray-900">{authorInfo.name}</span>
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#1D9BF0] fill-current">
                <path d="M22.5 12.5c0-1.58-.8-2.47-1.24-3.19-.36-.58-.44-1.1-.25-1.74.21-.69.67-1.44 1.1-2.02.38-.52.7-1.07.7-1.8 0-1.27-.99-2.25-2.25-2.25-.72 0-1.27.31-1.8.69-.58.42-1.33.89-2.02 1.1-.64.19-1.16.11-1.74-.25-.72-.44-1.61-1.24-3.19-1.24s-2.47.8-3.19 1.24c-.58.36-1.1.44-1.74.25-.69-.21-1.44-.67-2.02-1.1-.52-.38-1.07-.69-1.8-.69-1.27 0-2.25.99-2.25 2.25 0 .72.31 1.27.69 1.8.42.58.89 1.33 1.1 2.02.19.64.11 1.16-.25 1.74-.44.72-1.24 1.61-1.24 3.19s.8 2.47 1.24 3.19c.36.58.44 1.1.25 1.74-.21.69-.67 1.44-1.1 2.02-.38.52-.69 1.07-.69 1.8 0 1.27.99 2.25 2.25 2.25.72 0 1.27-.31 1.8-.69.58-.42 1.33-.89 2.02-1.1.64-.19 1.16-.11 1.74.25.72.44 1.61 1.24 3.19 1.24s 2.47-.8 3.19-1.24c.58-.36 1.1-.44 1.74-.25.69.21 1.44.67 2.02 1.1.52.38 1.07.69 1.8.69 1.27 0 2.25-.99 2.25-2.25 0-.73-.31-1.28-.69-1.8-.42-.58-.89-1.33-1.1-2.02-.19-.64-.11-1.16.25-1.74.44-.72 1.24-1.61 1.24-3.19zM10 17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <span className="text-gray-500 text-2xl font-medium tracking-tight">{authorInfo.handle}</span>
          </div>
        </div>
        <MoreHorizontal className="text-gray-400 w-10 h-10" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-16 mt-14 flex flex-col min-h-0">
        {isCover ? (
          <div className="flex flex-col h-full">
            <div className="mb-14 z-10">
              <div className="inline-block px-5 py-2 bg-red-50 text-red-500 rounded-2xl text-xl font-black tracking-widest uppercase mb-8 shadow-sm">
                NEW VIBE UNLOCKED ⚡️
              </div>
              <h1 className="text-[110px] font-black leading-[0.95] tracking-tighter text-gray-900 drop-shadow-sm">
                {title.split('：')[0] || title}
              </h1>
              {title.includes('：') && (
                <div className="mt-4 text-[76px] font-black text-red-500 tracking-tighter">
                  {title.split('：')[1]}
                </div>
              )}
              {subtitle && (
                <p className="mt-10 text-[42px] font-bold text-gray-400 max-w-[850px] leading-tight">
                  {subtitle}
                </p>
              )}
            </div>
            
            <div className="relative flex-1 bg-gray-50 rounded-[60px] border border-gray-100 overflow-hidden shadow-inner mb-8 group/cover">
                <div className="absolute inset-0 p-16 flex items-center justify-center">
                  <div className="w-full h-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col transform transition-transform group-hover/cover:scale-[1.02] duration-700">
                    <div className="h-6 bg-gray-50 border-b border-gray-100 flex gap-2 px-4 items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                    </div>
                    {image ? (
                      <img src={image} className="flex-1 object-cover" />
                    ) : (
                      <div className="flex-1 bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                        <Sparkles className="w-32 h-32 text-red-500/20" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="absolute -bottom-6 -right-6 px-12 py-5 bg-black text-white shadow-2xl rounded-[30px] font-black text-4xl rotate-[-2deg] tracking-tighter">
                   #{total} CARDS PACK
                </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <h2 className="text-[64px] font-black leading-tight mb-12 text-gray-900 tracking-tighter">
              {title}
            </h2>
            <div className="text-[44px] leading-[1.5] text-gray-700 whitespace-pre-wrap flex-1 font-bold tracking-tight bg-gray-50/30 p-10 rounded-[40px] border border-dashed border-gray-200">
              {content}
            </div>
            
            {image && (
              <div className="mt-12 mb-8 rounded-[50px] border-8 border-white overflow-hidden bg-white shadow-2xl max-h-[650px] relative group/img">
                  <img src={image} className="w-full h-full object-cover rounded-[42px]" />
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-[42px]"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Twitter Actions Footer */}
      <div className="px-16 py-12 flex items-center justify-between border-t border-gray-50 shrink-0">
        <div className="flex gap-16 text-gray-400 font-black text-3xl italic tracking-tighter">
            <span className="flex items-center gap-3">
              <MessageCircle className="w-8 h-8" /> {128 + index * 12}
            </span>
            <span className="flex items-center gap-3 text-red-500">
              <Heart className="w-8 h-8 fill-current" /> {1024 + index * 99}
            </span>
            <span className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8" /> {Math.floor(index * 2.4)}k
            </span>
        </div>
        <div className="px-8 py-3 bg-gray-100 text-gray-400 text-3xl font-black font-mono rounded-2xl tracking-tighter">
          {index.toString().padStart(2, '0')} / {total.toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  );
});

TweetCard.displayName = "TweetCard";
