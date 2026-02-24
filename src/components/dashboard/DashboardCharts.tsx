import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import type { BarChartData, DonutChartData } from '../../lib/dashboard-aggregations';

interface ResumoMensalProps {
  barData: BarChartData[];
  totalOrcamentos: number;
  taxaAprovacao: number;
}

export function ResumoMensal({ barData, totalOrcamentos, taxaAprovacao }: ResumoMensalProps) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))]/40 bg-[rgb(var(--card))]/50 dark:bg-[rgb(var(--card))]/40 p-4 lg:p-6">
      <h3 className="text-base font-bold text-[rgb(var(--fg))] mb-4">Resumo mensal</h3>
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <p className="text-xs text-[rgb(var(--muted))]">Total de orçamentos</p>
          <p className="text-lg font-bold text-[rgb(var(--fg))] tabular-nums">{totalOrcamentos}</p>
        </div>
        <div>
          <p className="text-xs text-[rgb(var(--muted))]">Taxa de aprovação</p>
          <p className="text-lg font-bold text-[rgb(var(--fg))] tabular-nums">{taxaAprovacao.toFixed(0)}%</p>
        </div>
      </div>
      <div className="h-[200px] pointer-events-none select-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }}
              axisLine={{ stroke: 'rgb(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface FunilMensalProps {
  donutData: DonutChartData[];
  emAberto: number;
  aprovado: number;
  emRisco: number;
}

export function FunilMensal({ donutData, emAberto, aprovado, emRisco }: FunilMensalProps) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))]/40 bg-[rgb(var(--card))]/50 dark:bg-[rgb(var(--card))]/40 p-4 lg:p-6">
      <h3 className="text-base font-bold text-[rgb(var(--fg))] mb-4">Funil do mês</h3>
      <div className="h-[180px] mb-4 pointer-events-none select-none">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
              stroke="transparent"
              isAnimationActive={false}
            >
              {donutData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span style={{ color: 'rgb(var(--fg))' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[rgb(var(--border))]/40">
        <div>
          <p className="text-[10px] text-[rgb(var(--muted))]">Em aberto</p>
          <p className="text-sm font-semibold text-[rgb(var(--fg))] tabular-nums">{formatCurrency(emAberto)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[rgb(var(--muted))]">Aprovado</p>
          <p className="text-sm font-semibold text-[rgb(var(--fg))] tabular-nums">{formatCurrency(aprovado)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[rgb(var(--muted))]">Em risco</p>
          <p className="text-sm font-semibold text-[rgb(var(--fg))] tabular-nums">{formatCurrency(emRisco)}</p>
        </div>
      </div>
    </div>
  );
}
