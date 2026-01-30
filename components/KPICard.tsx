import React from 'react';
import { formatCurrency, formatPercent } from '../utils';

interface KPICardProps {
  title: string;
  value: number;
  type?: 'currency' | 'percent' | 'number';
  colorCondition?: 'positive-green' | 'always-neutral' | 'cost-warning' | 'alert-low';
  icon?: React.ReactNode;
  privacyMode?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  type = 'currency', 
  colorCondition = 'positive-green',
  icon,
  privacyMode = false
}) => {
  // Styles configuration
  let theme = {
    text: 'text-[#06283D]',
    iconBg: 'from-slate-700 to-slate-900',
    iconShadow: 'shadow-slate-500/20',
    accentLine: 'bg-slate-300',
    glow: 'bg-slate-400/5',
    border: 'border-white/60'
  };

  if (colorCondition === 'positive-green') {
    if (value > 0) {
      theme = {
        text: 'text-emerald-700',
        iconBg: 'from-emerald-500 to-emerald-700',
        iconShadow: 'shadow-emerald-500/30',
        accentLine: 'bg-emerald-400',
        glow: 'bg-emerald-400/10',
        border: 'border-emerald-100/60'
      };
    } else if (value < 0) {
      theme = {
        text: 'text-rose-700',
        iconBg: 'from-rose-500 to-rose-700',
        iconShadow: 'shadow-rose-500/30',
        accentLine: 'bg-rose-400',
        glow: 'bg-rose-400/10',
        border: 'border-rose-100/60'
      };
    }
  } else if (colorCondition === 'cost-warning') {
    theme = {
      text: 'text-[#06283D]',
      iconBg: 'from-amber-400 to-amber-600',
      iconShadow: 'shadow-amber-500/40',
      accentLine: 'bg-amber-400',
      glow: 'bg-amber-400/20',
      border: 'border-amber-100/60'
    };
  }

  const formattedValue = () => {
    switch (type) {
      case 'currency': return formatCurrency(value);
      case 'percent': return formatPercent(value);
      case 'number': return value.toLocaleString('pt-BR');
      default: return value;
    }
  };

  return (
    <div 
      className={`
        relative group
        p-5 md:p-6 rounded-2xl md:rounded-3xl
        bg-white/70 backdrop-blur-2xl
        border ${theme.border}
        shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)]
        hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)]
        hover:-translate-y-1 hover:bg-white/90
        transition-all duration-300 ease-out
        overflow-hidden
        flex flex-col justify-between
        h-auto min-h-[140px] md:h-40
      `}
    >
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl ${theme.glow} transition-all duration-500 pointer-events-none`}></div>

      <div className="flex justify-between items-start z-10 mb-4 md:mb-0">
        <div className="flex flex-col gap-1">
           <h3 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-hover:text-slate-500">{title}</h3>
           <div className={`h-1 w-6 rounded-full ${theme.accentLine} group-hover:w-10 transition-all duration-300`}></div>
        </div>

        <div className={`
          flex items-center justify-center
          w-9 h-9 md:w-10 md:h-10 rounded-xl
          bg-gradient-to-br ${theme.iconBg}
          text-white
          shadow-lg ${theme.iconShadow}
          transform group-hover:scale-110 group-hover:rotate-6
          transition-transform duration-300
        `}>
          {icon ? React.cloneElement(icon as React.ReactElement<any>, { size: 16, strokeWidth: 2.5 }) : null}
        </div>
      </div>
      
      <div className="relative z-10 mt-auto">
        <div className={`text-3xl md:text-3xl lg:text-4xl font-black ${theme.text} tracking-tighter drop-shadow-sm font-mono`}>
            {privacyMode ? (
              <span className="blur-md opacity-30 select-none grayscale">R$ 9.999</span>
            ) : (
              formattedValue()
            )}
        </div>
      </div>
    </div>
  );
};

export default KPICard;