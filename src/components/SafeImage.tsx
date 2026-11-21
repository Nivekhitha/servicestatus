import React, { useState } from 'react';
import { CarFront } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel,
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0A1628] via-[#132440] to-[#1E3A5F] text-slate-200 p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <CarFront className="w-7 h-7 text-[#60A5FA] mb-1.5" />
        <span className="text-xs font-medium text-center text-slate-200 line-clamp-2">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
