"use client";

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// Tipos de gráficos disponibles
type ChartType = 'bar' | 'pie' | 'horizontal_bar' | 'stacked_bar' | 'grouped_bar' | null;

// Interfaz para datos del gráfico
interface ChartData {
  type: ChartType;
  title: string;
  data: Array<Record<string, string | number>>;
  dataKeys: string[];
  colors?: string[];
}

interface ChatbotChartProps {
  chartData: ChartData;
}

// Formateador de números para moneda peruana
const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `S/ ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `S/ ${(value / 1000).toFixed(1)}K`;
  }
  return `S/ ${value.toFixed(0)}`;
};

// Tooltip personalizado
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
        <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: S/ {Number(entry.value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Tooltip para gráficos de pie
const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
        <p className="font-semibold text-slate-900 dark:text-slate-100" style={{ color: data.payload.fill }}>
          {data.name}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          S/ {Number(data.value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export default function ChatbotChart({ chartData }: ChatbotChartProps) {
  if (!chartData || !chartData.data || chartData.data.length === 0) {
    return null;
  }

  const { type, title, data, dataKeys, colors = ['#f53c00', '#ff8300', '#22c55e'] } = chartData;

  const renderChart = () => {
    switch (type) {
      case 'bar':
      case 'grouped_bar':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={70}
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={0}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'horizontal_bar':
        return (
          <ResponsiveContainer width="100%" height={Math.max(200, data.length * 45)}>
            <BarChart 
              data={data} 
              layout="vertical" 
              margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={95}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  radius={[0, 4, 4, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'stacked_bar':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={70}
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={0}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={colors[index % colors.length]}
                  radius={index === dataKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill as string || colors[index % colors.length]} 
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-sm text-slate-600 dark:text-slate-400">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mt-3 p-4 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
        <span className="text-lg">📊</span>
        {title}
      </h4>
      {renderChart()}
    </div>
  );
}

