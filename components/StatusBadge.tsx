'use client';

import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'ADEQUATE' | 'WATCH' | 'STRESS';
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-3 py-1 text-xs gap-1.5',
    md: 'px-4 py-1.5 text-sm gap-2',
    lg: 'px-5 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const statusConfig = {
    ADEQUATE: {
      bg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      icon: CheckCircle,
    },
    WATCH: {
      bg: 'bg-amber-500/15 dark:bg-amber-500/25',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-500/30',
      icon: AlertTriangle,
    },
    STRESS: {
      bg: 'bg-red-500/15 dark:bg-red-500/25',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-500/30',
      icon: XCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center font-bold rounded-full border
        ${sizeClasses[size]}
        ${config.bg}
        ${config.text}
        ${config.border}
        ${status === 'STRESS' ? 'animate-pulse-glow' : ''}
      `}
    >
      <Icon className={iconSizes[size]} />
      {status}
    </span>
  );
}
