type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

const variants: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-700 dark:bg-emerald-950/55 dark:text-emerald-300',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/45 dark:text-yellow-200',
  danger: 'bg-red-100 text-red-700 dark:bg-red-950/55 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-950/55 dark:text-blue-300',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-violet-950/55 dark:text-violet-300',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export default function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
