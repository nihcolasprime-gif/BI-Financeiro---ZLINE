
import React from 'react';
import { formatCurrency, formatPercent } from '../utils';
import { ArrowRight } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  type?: 'currency' | 'percent' | 'number';
  colorCondition?: 'positive-green' | 'always-neutral' | 'cost-warning' | 'alert-low';
  icon?: React.ReactNode;
  privacyMode?: boolean;
  onClick?: () => void;
  subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  type = 'currency', 
  colorCondition = 'positive-green',
  icon,
  privacyMode = false,
  onClick,
  subtitle
}) => {
  // Styles configuration
  let theme = {
    text: 'text-slate-800',
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
      text: 'text-slate-800',
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
      onClick={onClick}
      className={`
        relative group
        p-5 md:p-6 rounded-2xl md:rounded-[2rem]
        bg-white/70 backdrop-blur-2xl
        border ${theme.border}
        shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)]
        hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)]
        hover:-translate-y-1 hover:bg-white/90
        transition-all duration-300 ease-out
        overflow-hidden
        flex flex-col justify-between
        h-auto min-h-[150px]
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl ${theme.glow} transition-all duration-500 pointer-events-none group-hover:scale-125`}></div>

      <div className="flex justify-between items-start z-10 mb-4 md:mb-0">
        <div className="flex flex-col gap-1.5">
           <h3 className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-hover:text-slate-600 flex items-center gap-1">
             {title}
             {onClick && <ArrowRight size={10} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-500" />}
           </h3>
           <div className={`h-1 w-6 rounded-full ${theme.accentLine} group-hover:w-12 transition-all duration-500 ease-out`}></div>
        </div>

        <div className={`
          flex items-center justify-center
          w-10 h-10 md:w-11 md:h-11 rounded-2xl
          bg-gradient-to-br ${theme.iconBg}
          text-white
          shadow-lg ${theme.iconShadow}
          transform group-hover:scale-110 group-hover:rotate-3
          transition-transform duration-300
        `}>
          {icon ? React.cloneElement(icon as React.ReactElement<any>, { size: 18, strokeWidth: 2.5 }) : null}
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
        {subtitle && (
          <p className="text-[10px] font-bold text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default KPICard;
