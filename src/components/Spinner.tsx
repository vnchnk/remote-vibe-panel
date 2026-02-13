'use client';

const sizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
};

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  inline?: boolean;
}

export default function Spinner({ size = 'lg', className, inline }: SpinnerProps) {
  const svg = (
    <svg className={`animate-spin ${sizes[size]} ${className ?? 'text-blue-400'}`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );

  if (inline) return svg;

  return (
    <div className="flex items-center justify-center py-12">
      {svg}
    </div>
  );
}
