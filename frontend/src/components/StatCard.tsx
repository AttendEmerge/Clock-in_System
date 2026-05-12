interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',
  green: 'bg-green-50 text-green-600 dark:bg-emerald-950/50 dark:text-emerald-300',
  yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',
  purple: 'bg-purple-50 text-purple-600 dark:bg-violet-950/50 dark:text-violet-300',
};

export default function StatCard({ label, value, sub, icon, color = 'blue' }: StatCardProps) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-app">{value}</p>
        <p className="text-sm text-app-muted mt-0.5">{label}</p>
        {sub && <p className="text-xs text-app-subtle mt-1">{sub}</p>}
      </div>
    </div>
  );
}
