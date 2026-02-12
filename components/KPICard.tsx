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
  
  // Lógica de Cores Dinâmicas
  const getValueColor = () => {
    if (colorCondition === 'always-neutral') return 'text-slate-900';
    if (colorCondition === 'cost-warning') return 'text-slate-900'; // Custos geralmente são neutros ou vermelhos se estourarem

    // Lógica padrão (Quanto maior melhor, exceto Churn)
    if (colorCondition === 'alert-low') {
        // Para Churn: Se for > 0, é ruim (vermelho). Se for 0, é ótimo (verde).
        return value > 0.05 ? 'text-rose-600' : 'text-emerald-600';
    }
    
    // Para Receita/Lucro: Se for > 0 verde, < 0 vermelho
    if (colorCondition === 'positive-green') return value >= 0 ? 'text-emerald-600' : 'text-rose-600';
    if (colorCondition === 'negative-red') return value > 0 ? 'text-rose-600' : 'text-slate-900';

    return 'text-slate-900';
  };

  // Formatação do Valor
  const formattedValue = React.useMemo(() => {
    if (privacyMode) return '••••';
    
    switch (type) {
      case 'currency': return formatCurrency(value);
      case 'percent': return formatPercent(value);
      case 'number': return value.toLocaleString('pt-BR'); // Para contagem de clientes
      default: return value;
    }
  }, [value, type, privacyMode]);

  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden
        glass-panel p-6 rounded-[32px] border border-white/40 shadow-xl
        transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl
        ${onClick ? 'cursor-pointer active:scale-95' : ''}
        bg-white/60 backdrop-blur-xl
      `}
    >
      {/* Background Decorativo (Glow) */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{title}</h3>
          <div className="p-2 bg-white/80 rounded-xl text-indigo-600 shadow-sm">
            {icon}
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span className={`text-2xl font-black tracking-tight ${getValueColor()}`}>
            {formattedValue}
          </span>
          {subtitle && !privacyMode && (
            <span className="text-[10px] font-bold text-slate-400 mb-1">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default KPICard;
