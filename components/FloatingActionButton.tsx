'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface FloatingActionButtonProps {
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  label?: string;
  variant?: 'primary' | 'secondary';
  'aria-label': string;
}

export function FloatingActionButton({
  href,
  onClick,
  icon = '+',
  label,
  variant = 'primary',
  'aria-label': ariaLabel,
}: FloatingActionButtonProps) {
  const baseClasses = `
    fixed bottom-6 right-6 z-50
    w-14 h-14 rounded-full
    flex items-center justify-center
    font-bold text-xl
    shadow-lg transition-all duration-300
    hover:scale-110 active:scale-95
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
    ${variant === 'primary' 
      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600' 
      : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20'
    }
  `;

  const safeAreaPadding = {
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    paddingRight: 'env(safe-area-inset-right, 0px)',
  };

  const buttonContent = (
    <div
      className={baseClasses}
      style={safeAreaPadding}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {icon}
      {label && (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel}>
        {buttonContent}
      </Link>
    );
  }

  return buttonContent;
}
