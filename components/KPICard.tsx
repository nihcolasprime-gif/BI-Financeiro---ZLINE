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
    if (colorCondition === 'cost-warning') return 'text-red-200';
    if (colorCondition === 'alert-low') return 'text-[#ff2400]';
    if (colorCondition === 'positive-green') return value >= 0 ? 'text-red-100' : 'text-[#ff2400]';
    if (colorCondition === 'negative-red') return value > 0 ? 'text-[#ff2400]' : 'text-white';
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
        border border-red-500/35 shadow-2xl
        transition-all duration-500 hover:-translate-y-1 hover:shadow-red-600/25
        ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}
      `}
    >
      <div className="pointer-events-none absolute -top-16 -right-10 h-36 w-36 rounded-full bg-red-600/30 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-36 w-36 rounded-full bg-red-950/60 blur-3xl"></div>

      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-red-100/90">{title}</h3>
          <div className="rounded-xl border border-red-500/35 bg-black/45 p-2 text-red-100 shadow-sm backdrop-blur-xl">
            {icon}
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span className={`text-2xl font-black tracking-tight ${getValueColor()}`}>{formattedValue}</span>
          {subtitle && !privacyMode && (
            <span className="mb-1 text-[10px] font-bold text-red-100/75">{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default KPICard;
