import React from 'react';
import { formatCurrency, formatPercent } from '../utils';

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  privacyMode?: boolean;
  type?: 'currency' | 'percent' | 'number';
  colorCondition?: 'positive-green' | 'negative-red' | 'alert-low' | 'cost-warning' | 'always-neutral';
  subtitle?: string;
  onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  privacyMode = false,
  type = 'currency',
  colorCondition,
  subtitle,
  onClick
}) => {
  const getValueColor = () => {
    if (colorCondition === 'always-neutral') return 'text-white';
    if (colorCondition === 'cost-warning') return 'text-rose-200';
    if (colorCondition === 'alert-low') return 'text-rose-300';
    if (colorCondition === 'positive-green') return value >= 0 ? 'text-rose-100' : 'text-rose-300';
    if (colorCondition === 'negative-red') return value > 0 ? 'text-rose-300' : 'text-white';
    return 'text-white';
  };

  const formattedValue = React.useMemo(() => {
    if (privacyMode) return '••••';

    switch (type) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return formatPercent(value);
      case 'number':
        return value.toLocaleString('pt-BR');
      default:
        return value;
    }
  }, [value, type, privacyMode]);

  return (
    <div
      onClick={onClick}
      className={`
        glass-panel-3d relative overflow-hidden rounded-[32px] p-6
        border border-white/25 shadow-2xl
        transition-all duration-500 hover:-translate-y-1 hover:shadow-rose-500/20
        ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}
      `}
    >
      <div className="pointer-events-none absolute -top-16 -right-10 h-36 w-36 rounded-full bg-rose-500/25 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-36 w-36 rounded-full bg-rose-900/40 blur-3xl"></div>

      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-rose-100/90">{title}</h3>
          <div className="rounded-xl border border-white/35 bg-white/15 p-2 text-rose-100 shadow-sm backdrop-blur-xl">
            {icon}
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span className={`text-2xl font-black tracking-tight ${getValueColor()}`}>{formattedValue}</span>
          {subtitle && !privacyMode && (
            <span className="mb-1 text-[10px] font-bold text-rose-100/75">{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default KPICard;
