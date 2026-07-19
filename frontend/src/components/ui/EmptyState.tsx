import { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[250px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
      <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
