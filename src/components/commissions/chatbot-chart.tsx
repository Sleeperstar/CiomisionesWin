"use client";

import React, { useRef, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

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
  const chartRef = useRef<HTMLDivElement>(null);

  // Función para descargar el gráfico como imagen
  const downloadChart = useCallback(async () => {
    if (!chartRef.current) return;

    try {
      // Encontrar el SVG dentro del contenedor
      const svgElement = chartRef.current.querySelector('svg');
      if (!svgElement) {
        console.error('No se encontró el SVG del gráfico');
        return;
      }

      // Obtener dimensiones del SVG
      const svgRect = svgElement.getBoundingClientRect();
      const width = svgRect.width || 600;
      const height = svgRect.height || 400;

      // Clonar el SVG para modificarlo
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      
      // Asegurar que el SVG tenga dimensiones explícitas
      svgClone.setAttribute('width', String(width));
      svgClone.setAttribute('height', String(height));
      
      // Agregar fondo blanco al SVG
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', 'white');
      svgClone.insertBefore(rect, svgClone.firstChild);

      // Convertir SVG a string
      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Crear imagen desde SVG
      const img = new Image();
      img.onload = () => {
        // Crear canvas con padding para el título
        const padding = 60;
        const canvas = document.createElement('canvas');
        canvas.width = width + 40;
        canvas.height = height + padding + 20;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // Fondo blanco
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Agregar título
          ctx.fillStyle = '#334155';
          ctx.font = 'bold 16px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`📊 ${chartData.title}`, canvas.width / 2, 30);

          // Dibujar el gráfico
          ctx.drawImage(img, 20, padding, width, height);

          // Agregar marca de agua
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px Arial, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('Win Telecom - Sistema de Comisiones', canvas.width - 10, canvas.height - 10);

          // Descargar como JPG
          const link = document.createElement('a');
          const fileName = `grafico_${chartData.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.jpg`;
          link.download = fileName;
          link.href = canvas.toDataURL('image/jpeg', 0.95);
          link.click();
        }

        // Limpiar URL
        URL.revokeObjectURL(svgUrl);
      };

      img.onerror = () => {
        console.error('Error al cargar la imagen');
        URL.revokeObjectURL(svgUrl);
      };

      img.src = svgUrl;

    } catch (error) {
      console.error('Error al descargar el gráfico:', error);
    }
  }, [chartData.title]);

  if (!chartData || !chartData.data || chartData.data.length === 0) {
    return null;
  }

  const { type, title, data, dataKeys, colors = ['#f53c00', '#ff8300', '#22c55e'] } = chartData;

  // Calcular altura dinámica según el tipo de gráfico y cantidad de datos
  const getChartHeight = () => {
    switch (type) {
      case 'horizontal_bar':
        return Math.max(250, data.length * 50);
      case 'pie':
        return 320;
      default:
        return 320;
    }
  };

  const renderChart = () => {
    const chartHeight = getChartHeight();

    switch (type) {
      case 'bar':
      case 'grouped_bar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                angle={-35} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={0}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11, fill: '#64748b' }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart 
              data={data} 
              layout="vertical" 
              margin={{ top: 10, right: 40, left: 120, bottom: 20 }}
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
                width={115}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
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
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                angle={-35} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={0}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11, fill: '#64748b' }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={100}
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
                height={40}
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
    <div className="mt-4 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header con título y botón de descarga */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <span className="text-lg">📊</span>
          {title}
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadChart}
          className="h-8 px-3 text-xs bg-white dark:bg-slate-700 hover:bg-orange-50 dark:hover:bg-slate-600 border-orange-200 dark:border-slate-600 text-orange-600 dark:text-orange-400"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Descargar JPG
        </Button>
      </div>
      
      {/* Contenedor del gráfico */}
      <div 
        ref={chartRef} 
        className="p-4 w-full"
        style={{ minHeight: getChartHeight() + 20 }}
      >
        {renderChart()}
      </div>
    </div>
  );
}
