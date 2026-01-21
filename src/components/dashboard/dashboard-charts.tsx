"use client";

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, 
    AreaChart, Area,
    ComposedChart, Line,
    RadialBarChart, RadialBar
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Icons } from "@/components/icons";
import { 
    TrendingUp, TrendingDown, DollarSign, Users, Target, AlertTriangle,
    ArrowUpRight, ArrowDownRight, BarChart3, PieChartIcon, RefreshCw,
    ArrowUpDown, ArrowUp, ArrowDown, Building2, Package
} from "lucide-react";

// Importar el selector de agencias dinámicamente para evitar errores de SSR con cmdk
const AgenciaSelector = dynamic(() => import('./agencia-selector'), { 
    ssr: false,
    loading: () => (
        <Button variant="outline" className="w-[250px] justify-between bg-white dark:bg-slate-800" disabled>
            <span className="text-muted-foreground">Cargando...</span>
        </Button>
    )
});

// Colores corporativos
const COLORS = {
    primary: '#f53c00',
    secondary: '#ff8300',
    tertiary: '#ffa700',
    success: '#10b981',
    danger: '#ef4444',
    purple: '#8b5cf6',
    blue: '#3b82f6',
    teal: '#14b8a6',
};

const PIE_COLORS = ['#f53c00', '#ff8300', '#ffa700', '#8b5cf6', '#3b82f6', '#14b8a6'];

interface ResultadoFinal {
    periodo: number;
    zona: string;
    ruc: string;
    agencia: string;
    altas: number;
    comision_total: number;
    pago_corte_1: number;
    total_a_pagar_corte_2: number;
    penalidad_1_monto: number;
    penalidad_2_monto: number;
    penalidad_3_monto: number;
    total_penalidades: number;
    clawback_1_monto: number;
    clawback_2_monto: number;
    clawback_3_monto: number;
    total_clawbacks: number;
    total_descuentos: number;
    resultado_neto_final: number;
    multiplicador_final: number;
    marcha_blanca: string;
}

interface KPIs {
    totalAgencias: number;
    totalAltas: number;
    totalComision: number;
    totalDescuentos: number;
    totalNetoFinal: number;
    avgMultiplicador: number;
    agenciasConDescuento: number;
    agenciasMarchaBlanca: number;
}

interface AgenciaOption {
    ruc: string;
    agencia: string;
    total_altas: number;
}

interface ProductoData {
    producto: string;
    cantidad: number;
    porcentaje: number;
}

const zonas = [
    { value: "todas", label: "Todas las Zonas" },
    { value: "LIMA", label: "Lima" },
    { value: "PROVINCIA", label: "Provincia" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 2023 }, (_, i) => ({
    value: String(2024 + i),
    label: String(2024 + i)
}));

const meses = [
    { value: "0", label: "Todos los meses" },
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
];

export default function DashboardCharts() {
    const [data, setData] = useState<ResultadoFinal[]>([]);
    const [loading, setLoading] = useState(true);
    const [zona, setZona] = useState("todas");
    const [year, setYear] = useState(String(currentYear));
    const [mes, setMes] = useState("0");
    const [eficienciaSort, setEficienciaSort] = useState<'comision' | 'eficiencia-asc' | 'eficiencia-desc'>('comision');
    
    // Estados para filtro de agencia
    const [agenciasDisponibles, setAgenciasDisponibles] = useState<AgenciaOption[]>([]);
    const [agenciasSeleccionadas, setAgenciasSeleccionadas] = useState<string[]>([]);
    const [agenciaPopoverOpen, setAgenciaPopoverOpen] = useState(false);
    const [loadingAgencias, setLoadingAgencias] = useState(false);
    
    // Datos para gráficos de agencia individual
    const [productosData, setProductosData] = useState<ProductoData[]>([]);
    const [loadingProductos, setLoadingProductos] = useState(false);
    
    // Verificar si hay una sola agencia seleccionada
    const agenciaUnicaSeleccionada = agenciasSeleccionadas.length === 1 ? agenciasSeleccionadas[0] : null;
    const agenciaInfo = agenciaUnicaSeleccionada 
        ? agenciasDisponibles.find(a => a.ruc === agenciaUnicaSeleccionada) 
        : null;

    // Calcular KPIs (usando filteredData cuando hay agencias seleccionadas)
    const kpis: KPIs = useMemo(() => {
        const dataToUse = agenciasSeleccionadas.length > 0 ? filteredData : data;
        if (dataToUse.length === 0) return {
            totalAgencias: 0,
            totalAltas: 0,
            totalComision: 0,
            totalDescuentos: 0,
            totalNetoFinal: 0,
            avgMultiplicador: 0,
            agenciasConDescuento: 0,
            agenciasMarchaBlanca: 0,
        };

        return {
            totalAgencias: dataToUse.length,
            totalAltas: dataToUse.reduce((sum, r) => sum + r.altas, 0),
            totalComision: dataToUse.reduce((sum, r) => sum + r.comision_total, 0),
            totalDescuentos: dataToUse.reduce((sum, r) => sum + r.total_descuentos, 0),
            totalNetoFinal: dataToUse.reduce((sum, r) => sum + r.resultado_neto_final, 0),
            avgMultiplicador: dataToUse.reduce((sum, r) => sum + r.multiplicador_final, 0) / dataToUse.length,
            agenciasConDescuento: dataToUse.filter(r => r.total_descuentos > 0).length,
            agenciasMarchaBlanca: dataToUse.filter(r => r.marcha_blanca === 'Sí').length,
        };
    }, [data, filteredData, agenciasSeleccionadas]);

    // Datos para el gráfico de top 10 agencias (solo cuando NO hay agencia única seleccionada)
    const topAgenciasData = useMemo(() => {
        const dataToUse = agenciasSeleccionadas.length > 0 ? filteredData : data;
        return [...dataToUse]
            .sort((a, b) => b.resultado_neto_final - a.resultado_neto_final)
            .slice(0, 10)
            .map(r => ({
                agencia: r.agencia.length > 15 ? r.agencia.substring(0, 15) + '...' : r.agencia,
                comision: r.comision_total,
                descuentos: r.total_descuentos,
                neto: r.resultado_neto_final,
            }));
    }, [data, filteredData, agenciasSeleccionadas]);

    // Datos para el gráfico de distribución de descuentos (usa datos filtrados)
    const descuentosDistribucion = useMemo(() => {
        const dataToUse = agenciasSeleccionadas.length > 0 ? filteredData : data;
        const totalPen1 = dataToUse.reduce((sum, r) => sum + r.penalidad_1_monto, 0);
        const totalPen2 = dataToUse.reduce((sum, r) => sum + r.penalidad_2_monto, 0);
        const totalPen3 = dataToUse.reduce((sum, r) => sum + r.penalidad_3_monto, 0);
        const totalCB1 = dataToUse.reduce((sum, r) => sum + r.clawback_1_monto, 0);
        const totalCB2 = dataToUse.reduce((sum, r) => sum + r.clawback_2_monto, 0);
        const totalCB3 = dataToUse.reduce((sum, r) => sum + r.clawback_3_monto, 0);

        return [
            { name: 'Penalidad 1', value: totalPen1, color: '#ef4444' },
            { name: 'Penalidad 2', value: totalPen2, color: '#f97316' },
            { name: 'Penalidad 3', value: totalPen3, color: '#eab308' },
            { name: 'Clawback 1', value: totalCB1, color: '#8b5cf6' },
            { name: 'Clawback 2', value: totalCB2, color: '#a855f7' },
            { name: 'Clawback 3', value: totalCB3, color: '#c084fc' },
        ].filter(d => d.value > 0);
    }, [data, filteredData, agenciasSeleccionadas]);

    // Datos para el gráfico de comisión vs neto por agencia (usa datos filtrados)
    const comisionVsNetoData = useMemo(() => {
        const dataToUse = agenciasSeleccionadas.length > 0 ? filteredData : data;
        // Primero calculamos la eficiencia para todos
        const dataWithEficiencia = [...dataToUse].map(r => ({
            agencia: r.agencia,
            agenciaCorta: r.agencia.length > 12 ? r.agencia.substring(0, 12) + '...' : r.agencia,
            comision: r.comision_total,
            neto: r.resultado_neto_final,
            descuentos: r.total_descuentos,
            eficiencia: r.comision_total > 0 ? (r.resultado_neto_final / r.comision_total * 100) : 100,
        }));

        // Ordenamos según el criterio seleccionado
        let sortedData;
        if (eficienciaSort === 'eficiencia-desc') {
            sortedData = dataWithEficiencia.sort((a, b) => b.eficiencia - a.eficiencia);
        } else if (eficienciaSort === 'eficiencia-asc') {
            sortedData = dataWithEficiencia.sort((a, b) => a.eficiencia - b.eficiencia);
        } else {
            sortedData = dataWithEficiencia.sort((a, b) => b.comision - a.comision);
        }

        // Si es una sola agencia, mostrar todo; si no, mostrar top 8
        const limit = agenciaUnicaSeleccionada ? dataWithEficiencia.length : 8;

        return sortedData.slice(0, limit).map(r => ({
            agencia: r.agenciaCorta,
            comision: r.comision,
            neto: r.neto,
            descuentos: r.descuentos,
            eficiencia: r.eficiencia,
        }));
    }, [data, filteredData, agenciasSeleccionadas, agenciaUnicaSeleccionada, eficienciaSort]);

    // Datos para el gráfico radial de eficiencia
    const eficienciaData = useMemo(() => {
        const eficiencia = kpis.totalComision > 0 
            ? (kpis.totalNetoFinal / kpis.totalComision * 100) 
            : 100;
        return [{ name: 'Eficiencia', value: eficiencia, fill: COLORS.success }];
    }, [kpis]);

    // Cargar datos
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let query = supabase.from('resultados_finales').select('*');
                
                // Filtrar por zona
                if (zona !== "todas") {
                    query = query.eq('zona', zona);
                }
                
                // Filtrar por año
                const yearNum = parseInt(year);
                if (mes === "0") {
                    // Todos los meses del año
                    query = query.gte('periodo', yearNum * 100 + 1).lte('periodo', yearNum * 100 + 12);
                } else {
                    // Mes específico
                    const periodo = yearNum * 100 + parseInt(mes);
                    query = query.eq('periodo', periodo);
                }

                const { data: resultData, error } = await query;
                
                if (error) throw error;

                setData((resultData || []).map(r => ({
                    ...r,
                    altas: Number(r.altas) || 0,
                    comision_total: Number(r.comision_total) || 0,
                    pago_corte_1: Number(r.pago_corte_1) || 0,
                    total_a_pagar_corte_2: Number(r.total_a_pagar_corte_2) || 0,
                    penalidad_1_monto: Number(r.penalidad_1_monto) || 0,
                    penalidad_2_monto: Number(r.penalidad_2_monto) || 0,
                    penalidad_3_monto: Number(r.penalidad_3_monto) || 0,
                    total_penalidades: Number(r.total_penalidades) || 0,
                    clawback_1_monto: Number(r.clawback_1_monto) || 0,
                    clawback_2_monto: Number(r.clawback_2_monto) || 0,
                    clawback_3_monto: Number(r.clawback_3_monto) || 0,
                    total_clawbacks: Number(r.total_clawbacks) || 0,
                    total_descuentos: Number(r.total_descuentos) || 0,
                    resultado_neto_final: Number(r.resultado_neto_final) || 0,
                    multiplicador_final: Number(r.multiplicador_final) || 1.3,
                })));
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }
            setLoading(false);
        };

        fetchData();
    }, [zona, year, mes]);

    // Cargar agencias disponibles cuando cambia zona/mes/año
    useEffect(() => {
        const fetchAgencias = async () => {
            // Solo cargar si hay zona y mes específicos seleccionados
            if (zona === "todas" || mes === "0") {
                setAgenciasDisponibles([]);
                setAgenciasSeleccionadas([]);
                return;
            }

            setLoadingAgencias(true);
            try {
                const { data: agenciasData, error } = await supabase.rpc('get_agencias_por_periodo', {
                    p_zona: zona.toLowerCase(),
                    p_mes: parseInt(mes),
                    p_year: parseInt(year)
                });

                if (error) throw error;
                setAgenciasDisponibles(agenciasData || []);
            } catch (error) {
                console.error('Error fetching agencias:', error);
                setAgenciasDisponibles([]);
            }
            setLoadingAgencias(false);
        };

        fetchAgencias();
    }, [zona, year, mes]);

    // Cargar productos cuando se selecciona una agencia única
    useEffect(() => {
        const fetchProductos = async () => {
            if (!agenciaUnicaSeleccionada || zona === "todas" || mes === "0") {
                setProductosData([]);
                return;
            }

            setLoadingProductos(true);
            try {
                const { data: productosResult, error } = await supabase.rpc('get_productos_por_agencia', {
                    p_zona: zona.toLowerCase(),
                    p_ruc: agenciaUnicaSeleccionada,
                    p_mes: parseInt(mes),
                    p_year: parseInt(year)
                });

                if (error) throw error;
                setProductosData(productosResult || []);
            } catch (error) {
                console.error('Error fetching productos:', error);
                setProductosData([]);
            }
            setLoadingProductos(false);
        };

        fetchProductos();
    }, [agenciaUnicaSeleccionada, zona, year, mes]);

    // Filtrar datos por agencias seleccionadas
    const filteredData = useMemo(() => {
        if (agenciasSeleccionadas.length === 0) return data;
        return data.filter(r => agenciasSeleccionadas.includes(r.ruc));
    }, [data, agenciasSeleccionadas]);

    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `S/ ${(value / 1000000).toFixed(2)}M`;
        } else if (value >= 1000) {
            return `S/ ${(value / 1000).toFixed(1)}K`;
        }
        return `S/ ${value.toFixed(2)}`;
    };

    const formatCurrencyFull = (value: number) => {
        return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-sm mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => {
                        // Si es eficiencia, formatear como porcentaje, no como moneda
                        const isEficiencia = entry.dataKey === 'eficiencia' || entry.name?.includes('Eficiencia');
                        const formattedValue = isEficiencia 
                            ? `${Number(entry.value).toFixed(1)}%` 
                            : formatCurrencyFull(entry.value);
                        
                        return (
                            <p key={index} className="text-xs" style={{ color: entry.color }}>
                                {entry.name}: {formattedValue}
                            </p>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Icons.Spinner className="h-12 w-12 animate-spin text-[#f53c00]" />
                <span className="ml-4 text-xl text-muted-foreground">Cargando dashboard...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filtros */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <CardContent className="pt-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-[#f53c00]" />
                            <span className="font-semibold text-lg">Filtros</span>
                        </div>
                        <div className="flex flex-wrap gap-3 flex-1">
                            <Select value={zona} onValueChange={setZona}>
                                <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800">
                                    <SelectValue placeholder="Zona" />
                                </SelectTrigger>
                                <SelectContent>
                                    {zonas.map((z) => (
                                        <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="w-[120px] bg-white dark:bg-slate-800">
                                    <SelectValue placeholder="Año" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((y) => (
                                        <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={mes} onValueChange={(value) => {
                                setMes(value);
                                setAgenciasSeleccionadas([]); // Limpiar selección al cambiar mes
                            }}>
                                <SelectTrigger className="w-[160px] bg-white dark:bg-slate-800">
                                    <SelectValue placeholder="Mes" />
                                </SelectTrigger>
                                <SelectContent>
                                    {meses.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Selector de Agencias - Cargado dinámicamente para evitar errores de SSR */}
                            {zona !== "todas" && mes !== "0" && (
                                <AgenciaSelector
                                    agenciasDisponibles={agenciasDisponibles}
                                    agenciasSeleccionadas={agenciasSeleccionadas}
                                    setAgenciasSeleccionadas={setAgenciasSeleccionadas}
                                    loadingAgencias={loadingAgencias}
                                    open={agenciaPopoverOpen}
                                    setOpen={setAgenciaPopoverOpen}
                                />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {agenciasSeleccionadas.length > 0 && (
                                <Badge variant="secondary" className="text-sm py-2 px-4 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                    {agenciasSeleccionadas.length} agencia{agenciasSeleccionadas.length > 1 ? 's' : ''} seleccionada{agenciasSeleccionadas.length > 1 ? 's' : ''}
                                </Badge>
                            )}
                            <Badge variant="outline" className="text-sm py-2 px-4">
                                {agenciasSeleccionadas.length > 0 ? filteredData.length : data.length} registros
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard 
                    title="Comisión Total"
                    value={formatCurrency(kpis.totalComision)}
                    subtitle={`${kpis.totalAgencias} agencias`}
                    icon={<DollarSign className="h-6 w-6" />}
                    trend="up"
                    trendValue="Bruto"
                    color="blue"
                />
                <KPICard 
                    title="Total Descuentos"
                    value={formatCurrency(kpis.totalDescuentos)}
                    subtitle={`${kpis.agenciasConDescuento} agencias afectadas`}
                    icon={<TrendingDown className="h-6 w-6" />}
                    trend="down"
                    trendValue={`${((kpis.totalDescuentos / kpis.totalComision) * 100 || 0).toFixed(1)}% del bruto`}
                    color="red"
                />
                <KPICard 
                    title="Neto Final"
                    value={formatCurrency(kpis.totalNetoFinal)}
                    subtitle="Después de descuentos"
                    icon={<TrendingUp className="h-6 w-6" />}
                    trend="up"
                    trendValue={`${((kpis.totalNetoFinal / kpis.totalComision) * 100 || 0).toFixed(1)}% eficiencia`}
                    color="green"
                />
                <KPICard 
                    title="Total Altas"
                    value={kpis.totalAltas.toLocaleString()}
                    subtitle={`${kpis.agenciasMarchaBlanca} en marcha blanca`}
                    icon={<Users className="h-6 w-6" />}
                    trend="neutral"
                    trendValue={`x${kpis.avgMultiplicador.toFixed(1)} mult. prom.`}
                    color="purple"
                />
            </div>

            {/* Gráficos principales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico condicional: Top 10 Agencias o Top 10 Productos */}
                <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className={`bg-gradient-to-r ${agenciaUnicaSeleccionada ? 'from-[#8b5cf6] to-[#a855f7]' : 'from-[#f53c00] to-[#ff8300]'} text-white`}>
                        <CardTitle className="flex items-center gap-2">
                            {agenciaUnicaSeleccionada ? (
                                <>
                                    <Package className="h-5 w-5" />
                                    Top 10 Productos Más Vendidos
                                </>
                            ) : (
                                <>
                                    <BarChart3 className="h-5 w-5" />
                                    Top 10 Agencias por Resultado Neto
                                </>
                            )}
                        </CardTitle>
                        <CardDescription className={agenciaUnicaSeleccionada ? 'text-purple-100' : 'text-orange-100'}>
                            {agenciaUnicaSeleccionada 
                                ? `Productos de ${agenciaInfo?.agencia || 'la agencia'}`
                                : 'Ranking de las agencias con mayor comisión neta'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {agenciaUnicaSeleccionada ? (
                            // Gráfico de productos para agencia única
                            loadingProductos ? (
                                <div className="flex items-center justify-center h-[350px]">
                                    <Icons.Spinner className="h-8 w-8 animate-spin text-purple-500" />
                                </div>
                            ) : productosData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={productosData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis type="number" />
                                        <YAxis 
                                            dataKey="producto" 
                                            type="category" 
                                            width={150} 
                                            tick={{ fontSize: 10 }}
                                            tickFormatter={(v) => v.length > 25 ? v.substring(0, 25) + '...' : v}
                                        />
                                        <Tooltip 
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                                                            <p className="font-semibold text-sm mb-2">{label}</p>
                                                            <p className="text-xs text-purple-600">Cantidad: {payload[0].value}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {productosData.find(p => p.producto === label)?.porcentaje || 0}% del total
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="cantidad" name="Cantidad" fill={COLORS.purple} radius={[0, 4, 4, 0]}>
                                            {productosData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                                    <Package className="h-16 w-16 mb-4 opacity-50" />
                                    <p className="text-lg font-medium">Sin productos</p>
                                    <p className="text-sm">No hay ventas en este periodo</p>
                                </div>
                            )
                        ) : (
                            // Gráfico de top agencias (modo normal)
                            topAgenciasData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={topAgenciasData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                                        <YAxis dataKey="agencia" type="category" width={100} tick={{ fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar dataKey="neto" name="Neto Final" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState />
                            )
                        )}
                    </CardContent>
                </Card>

                {/* Distribución de Descuentos */}
                <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] text-white">
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5" />
                            Distribución de Descuentos
                            {agenciaUnicaSeleccionada && (
                                <Badge variant="outline" className="ml-2 bg-white/20 border-white/40 text-xs">
                                    1 agencia
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription className="text-purple-100">
                            {agenciaUnicaSeleccionada 
                                ? `Penalidades y Clawbacks de ${agenciaInfo?.agencia || 'la agencia'}`
                                : 'Penalidades y Clawbacks por tipo'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {descuentosDistribucion.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart>
                                    <Pie
                                        data={descuentosDistribucion}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {descuentosDistribucion.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrencyFull(value)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                                <Target className="h-16 w-16 mb-4 text-green-500" />
                                <p className="text-lg font-medium">¡Sin descuentos!</p>
                                <p className="text-sm">No hay penalidades ni clawbacks en este periodo</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico de Comisión vs Neto */}
            <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[#059669] to-[#10b981] text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                {agenciaUnicaSeleccionada 
                                    ? 'Comisión Bruta vs Neto Final'
                                    : 'Comisión Bruta vs Neto Final por Agencia'
                                }
                            </CardTitle>
                            <CardDescription className="text-emerald-100">
                                {agenciaUnicaSeleccionada 
                                    ? `Resultado de ${agenciaInfo?.agencia || 'la agencia'}`
                                    : 'Comparativa de comisión total y resultado neto (Top 8 agencias)'
                                }
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-100">Ordenar por:</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (eficienciaSort === 'comision') {
                                        setEficienciaSort('eficiencia-desc');
                                    } else if (eficienciaSort === 'eficiencia-desc') {
                                        setEficienciaSort('eficiencia-asc');
                                    } else {
                                        setEficienciaSort('comision');
                                    }
                                }}
                                className="bg-white/20 text-white border-white/40 hover:bg-white/30 text-xs h-8"
                            >
                                {eficienciaSort === 'comision' && (
                                    <>
                                        <DollarSign className="h-3 w-3 mr-1" />
                                        Comisión
                                    </>
                                )}
                                {eficienciaSort === 'eficiencia-desc' && (
                                    <>
                                        <ArrowDown className="h-3 w-3 mr-1" />
                                        Eficiencia ↓
                                    </>
                                )}
                                {eficienciaSort === 'eficiencia-asc' && (
                                    <>
                                        <ArrowUp className="h-3 w-3 mr-1" />
                                        Eficiencia ↑
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {comisionVsNetoData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <ComposedChart data={comisionVsNetoData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis 
                                    dataKey="agencia" 
                                    angle={-45} 
                                    textAnchor="end" 
                                    height={80}
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis yAxisId="left" tickFormatter={(v) => formatCurrency(v)} />
                                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" height={36} />
                                <Bar yAxisId="left" dataKey="comision" name="Comisión Bruta" fill={COLORS.blue} radius={[4, 4, 0, 0]} opacity={0.8} />
                                <Bar yAxisId="left" dataKey="neto" name="Neto Final" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="eficiencia" name="Eficiencia %" stroke={COLORS.primary} strokeWidth={3} dot={{ r: 5 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState />
                    )}
                </CardContent>
            </Card>

            {/* Resumen de Agencias más afectadas - Solo se muestra cuando NO hay agencia única seleccionada */}
            {!agenciaUnicaSeleccionada && (
                <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-[#ef4444] to-[#f97316] text-white">
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Agencias con Mayor Descuento
                        </CardTitle>
                        <CardDescription className="text-red-100">
                            Top 5 agencias con mayores penalidades y clawbacks
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {data.filter(r => r.total_descuentos > 0).length > 0 ? (
                            <div className="space-y-4">
                                {[...data]
                                    .filter(r => r.total_descuentos > 0)
                                    .sort((a, b) => b.total_descuentos - a.total_descuentos)
                                    .slice(0, 5)
                                    .map((agencia, index) => (
                                        <div key={agencia.ruc} className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                                                index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : 'bg-yellow-500'
                                            }`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold">{agencia.agencia}</p>
                                                <p className="text-sm text-muted-foreground">RUC: {agencia.ruc}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">Comisión</p>
                                                <p className="font-semibold text-blue-600">{formatCurrencyFull(agencia.comision_total)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">Descuentos</p>
                                                <p className="font-bold text-red-600">{formatCurrencyFull(agencia.total_descuentos)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">Neto</p>
                                                <p className="font-bold text-emerald-600">{formatCurrencyFull(agencia.resultado_neto_final)}</p>
                                            </div>
                                            <Badge variant="outline" className={`${
                                                (agencia.total_descuentos / agencia.comision_total * 100) > 20 
                                                    ? 'border-red-500 text-red-500' 
                                                    : 'border-yellow-500 text-yellow-500'
                                            }`}>
                                                -{((agencia.total_descuentos / agencia.comision_total) * 100).toFixed(1)}%
                                            </Badge>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Target className="h-16 w-16 mb-4 text-green-500" />
                                <p className="text-lg font-medium">¡Excelente!</p>
                                <p className="text-sm">No hay agencias con descuentos en este periodo</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Información detallada de la agencia seleccionada */}
            {agenciaUnicaSeleccionada && agenciaInfo && filteredData.length > 0 && (
                <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white">
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Resumen de {agenciaInfo.agencia}
                        </CardTitle>
                        <CardDescription className="text-blue-100">
                            Detalles de comisiones y descuentos de la agencia
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {filteredData.map((agencia) => (
                                <React.Fragment key={agencia.ruc}>
                                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                        <p className="text-sm text-muted-foreground">Comisión Bruta</p>
                                        <p className="text-xl font-bold text-blue-600">{formatCurrencyFull(agencia.comision_total)}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                                        <p className="text-sm text-muted-foreground">Total Descuentos</p>
                                        <p className="text-xl font-bold text-red-600">{formatCurrencyFull(agencia.total_descuentos)}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                                        <p className="text-sm text-muted-foreground">Neto Final</p>
                                        <p className="text-xl font-bold text-emerald-600">{formatCurrencyFull(agencia.resultado_neto_final)}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                        <p className="text-sm text-muted-foreground">Eficiencia</p>
                                        <p className="text-xl font-bold text-purple-600">
                                            {agencia.comision_total > 0 
                                                ? ((agencia.resultado_neto_final / agencia.comision_total) * 100).toFixed(1) 
                                                : 100}%
                                        </p>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {filteredData.map((agencia) => (
                                <React.Fragment key={agencia.ruc + '-details'}>
                                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                        <p className="text-xs text-muted-foreground">Altas Totales</p>
                                        <p className="text-lg font-semibold">{agencia.altas}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                        <p className="text-xs text-muted-foreground">Multiplicador</p>
                                        <p className="text-lg font-semibold">x{agencia.multiplicador_final}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                        <p className="text-xs text-muted-foreground">Marcha Blanca</p>
                                        <Badge variant={agencia.marcha_blanca === 'Sí' ? 'default' : 'outline'}>
                                            {agencia.marcha_blanca}
                                        </Badge>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Componente KPI Card
interface KPICardProps {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    trend: 'up' | 'down' | 'neutral';
    trendValue: string;
    color: 'blue' | 'red' | 'green' | 'purple';
}

function KPICard({ title, value, subtitle, icon, trend, trendValue, color }: KPICardProps) {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        red: 'from-red-500 to-red-600',
        green: 'from-emerald-500 to-emerald-600',
        purple: 'from-purple-500 to-purple-600',
    };

    const iconBgClasses = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    };

    return (
        <Card className="border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <div className={`h-1 bg-gradient-to-r ${colorClasses[color]}`} />
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold mt-1">{value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                    </div>
                    <div className={`p-3 rounded-full ${iconBgClasses[color]}`}>
                        {icon}
                    </div>
                </div>
                <div className="flex items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />}
                    {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />}
                    <span className={`text-xs font-medium ${
                        trend === 'up' ? 'text-emerald-600' : 
                        trend === 'down' ? 'text-red-600' : 
                        'text-slate-600'
                    }`}>
                        {trendValue}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
            <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Sin datos</p>
            <p className="text-sm">No hay datos para mostrar en este periodo</p>
        </div>
    );
}

