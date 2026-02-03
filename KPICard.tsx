import React from 'react';
import { formatCurrency, formatPercent } from '../utils';

interface KPICardProps {
  title: string;
  value: number;
  type?: 'currency' | 'percent' | 'number';
  colorCondition?: 'positive-green' | 'always-neutral' | 'cost-warning' | 'alert-low';
  icon?: React.ReactNode;
  privacyMode?: boolean;
  subtitle?: string;
  onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  type = 'currency', 
  colorCondition = 'positive-green',
  icon,
  privacyMode = false,
  subtitle,
  onClick
}) => {
  // Determine styles based on logic with smoother modern palette
  let theme = {
    text: 'text-slate-800',
    iconBg: 'from-slate-700 to-slate-900',
    iconShadow: 'shadow-slate-500/30',
    accentLine: 'bg-slate-400',
    glow: 'bg-slate-400/10',
    border: 'border-white/60'
  };

  if (colorCondition === 'positive-green') {
    if (value > 0) {
      theme = {
        text: 'text-slate-800',
        iconBg: 'from-emerald-400 to-emerald-600',
        iconShadow: 'shadow-emerald-500/40',
        accentLine: 'bg-emerald-500',
        glow: 'bg-emerald-400/20',
        border: 'border-emerald-100/50'
      };
    } else if (value < 0) {
      theme = {
        text: 'text-slate-800',
        iconBg: 'from-rose-400 to-rose-600',
        iconShadow: 'shadow-rose-500/40',
        accentLine: 'bg-rose-500',
        glow: 'bg-rose-400/20',
        border: 'border-rose-100/50'
      };
    }
  } else if (colorCondition === 'cost-warning') {
    theme = {
      text: 'text-slate-800',
      iconBg: 'from-amber-400 to-amber-600',
      iconShadow: 'shadow-amber-500/40',
      accentLine: 'bg-amber-500',
      glow: 'bg-amber-400/20',
      border: 'border-amber-100/50'
    };
  } else if (colorCondition === 'alert-low') {
    if (value < 0.2) {
      theme = {
        text: 'text-slate-800',
        iconBg: 'from-rose-400 to-rose-600',
        iconShadow: 'shadow-rose-500/40',
        accentLine: 'bg-rose-500',
        glow: 'bg-rose-400/20',
        border: 'border-rose-100/50'
      };
    } else {
      theme = {
        text: 'text-slate-800',
        iconBg: 'from-emerald-400 to-emerald-600',
        iconShadow: 'shadow-emerald-500/40',
        accentLine: 'bg-emerald-500',
        glow: 'bg-emerald-400/20',
        border: 'border-emerald-100/50'
      };
    }
  }

  const formattedValue = () => {
    if (privacyMode) return '••••';

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
        p-6 rounded-3xl
        bg-gradient-to-br from-white/90 to-white/50 backdrop-blur-xl
        border ${theme.border}
        shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]
        hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)]
        hover:-translate-y-2 hover:bg-white/90
        transition-all duration-500 ease-out
        overflow-hidden
        flex flex-col justify-between h-40
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Background Decorative Glow Blob */}
      <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl ${theme.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`}></div>

      {/* Top Row: Icon and Title */}
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col">
           <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 transition-colors group-hover:text-slate-600">{title}</h3>
           {/* Color Indicator Line */}
           <div className={`h-1 w-8 rounded-full ${theme.accentLine} opacity-80 group-hover:w-12 transition-all duration-500 ease-in-out`}></div>
        </div>

        {/* 3D Icon Bubble */}
        <div className={`
          flex items-center justify-center
          w-12 h-12 rounded-2xl
          bg-gradient-to-br ${theme.iconBg}
          text-white
          shadow-lg ${theme.iconShadow}
          transform group-hover:scale-110 group-hover:rotate-3
          transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
        `}>
          {icon ? React.cloneElement(icon as React.ReactElement<any>, { size: 22, strokeWidth: 2 }) : null}
        </div>
      </div>
      
      {/* Bottom Row: Value */}
      <div className="relative z-10 mt-auto">
        <div className={`text-4xl font-black ${theme.text} tracking-tight drop-shadow-sm group-hover:scale-105 origin-left transition-transform duration-500`}>
            {formattedValue()}
        </div>
        {subtitle && (
          <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wide opacity-80 group-hover:opacity-100 transition-opacity">{subtitle}</p>
        )}
      </div>
      
      {/* Bottom Shine Reflection */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-white/60 to-transparent pointer-events-none opacity-50"></div>
    </div>
  );
};

export default KPICard;