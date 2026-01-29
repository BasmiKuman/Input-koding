import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'primary' | 'warning' | 'success';
}

export function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  trend,
  variant = 'default' 
}: StatCardProps) {
  const variants = {
    default: 'bg-card',
    primary: 'bg-primary/5 border-primary/20',
    warning: 'bg-warning/5 border-warning/20',
    success: 'bg-success/5 border-success/20',
  };

  const iconVariants = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
  };

  return (
    <motion.div
      className={cn('stat-card', variants[variant])}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', iconVariants[variant])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            trend === 'up' && 'bg-success/10 text-success',
            trend === 'down' && 'bg-destructive/10 text-destructive',
            trend === 'neutral' && 'bg-muted text-muted-foreground'
          )}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        )}
      </div>
    </motion.div>
  );
}
