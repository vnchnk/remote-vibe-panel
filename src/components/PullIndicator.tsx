'use client';

export default function PullIndicator({ pullDistance }: { pullDistance: number }) {
  if (pullDistance <= 0) return null;
  return (
    <div
      className="flex items-center justify-center text-slate-400 overflow-hidden transition-all"
      style={{ height: pullDistance * 0.4 }}
    >
      <svg
        className={`w-5 h-5 transition-transform ${pullDistance > 60 ? 'rotate-180' : ''}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
