"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown, Download, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";

interface ResultadoFinal {
    periodo: number;
    zona: string;
    ruc: string;
    agencia: string;
    meta: number | null;
    top: string | null;
    altas: number;
    precio_sin_igv_promedio: number;
    porcentaje_cumplimiento: number | null;
    marcha_blanca: string;
    bono_arpu: string;
    factor_multiplicador: number;
    multiplicador_final: number;
    corte_1: number;
    corte_2: number;
    corte_3: number;
    corte_4: number;
    comision_total: number;
    pago_corte_1: number;
    total_a_pagar_corte_2: number;
    // Penalidades
    penalidad_1_monto: number;
    penalidad_2_monto: number;
    penalidad_3_monto: number;
    total_penalidades: number;
    // Clawbacks
    clawback_1_monto: number;
    clawback_2_monto: number;
    clawback_3_monto: number;
    total_clawbacks: number;
    // Totales
    total_descuentos: number;
    resultado_neto_final: number;
}

interface Totals {
    totalAltas: number;
    totalComision: number;
    totalPagoCorte1: number;
    totalPagoCorte2: number;
    totalPenalidades: number;
    totalClawbacks: number;
    totalDescuentos: number;
    totalNetoFinal: number;
}

interface ViewResultadosFinalesTableProps {
    zona: string;
    mes: string;
    periodo: number;
}

export default function ViewResultadosFinalesTable({ zona, mes, periodo }: ViewResultadosFinalesTableProps) {
    const [data, setData] = useState<ResultadoFinal[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [sortConfig, setSortConfig] = useState<{ key: keyof ResultadoFinal; direction: 'ascending' | 'descending' } | null>(null);
    const [totals, setTotals] = useState<Totals | null>(null);

    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue === null || bValue === null) return 0;
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const requestSort = (key: keyof ResultadoFinal) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Consultar la vista resultados_finales
                const { data: viewData, error } = await supabase
                    .from('resultados_finales')
                    .select('*')
                    .eq('periodo', periodo)
                    .eq('zona', zona.toUpperCase());

                if (error) {
                    throw new Error(`Error al cargar datos: ${error.message}`);
                }

                const processedData: ResultadoFinal[] = (viewData || []).map((row: ResultadoFinal) => ({
                    periodo: row.periodo,
                    zona: row.zona,
                    ruc: row.ruc,
                    agencia: row.agencia,
                    meta: row.meta,
                    top: row.top || 'REGULAR',
                    altas: Number(row.altas) || 0,
                    precio_sin_igv_promedio: Number(row.precio_sin_igv_promedio) || 0,
                    porcentaje_cumplimiento: row.porcentaje_cumplimiento !== null ? Number(row.porcentaje_cumplimiento) : null,
                    marcha_blanca: row.marcha_blanca || 'No',
                    bono_arpu: row.bono_arpu || 'No',
                    factor_multiplicador: Number(row.factor_multiplicador) || 1.3,
                    multiplicador_final: Number(row.multiplicador_final) || 1.3,
                    corte_1: Number(row.corte_1) || 0,
                    corte_2: Number(row.corte_2) || 0,
                    corte_3: Number(row.corte_3) || 0,
                    corte_4: Number(row.corte_4) || 0,
                    comision_total: Number(row.comision_total) || 0,
                    pago_corte_1: Number(row.pago_corte_1) || 0,
                    total_a_pagar_corte_2: Number(row.total_a_pagar_corte_2) || 0,
                    penalidad_1_monto: Number(row.penalidad_1_monto) || 0,
                    penalidad_2_monto: Number(row.penalidad_2_monto) || 0,
                    penalidad_3_monto: Number(row.penalidad_3_monto) || 0,
                    total_penalidades: Number(row.total_penalidades) || 0,
                    clawback_1_monto: Number(row.clawback_1_monto) || 0,
                    clawback_2_monto: Number(row.clawback_2_monto) || 0,
                    clawback_3_monto: Number(row.clawback_3_monto) || 0,
                    total_clawbacks: Number(row.total_clawbacks) || 0,
                    total_descuentos: Number(row.total_descuentos) || 0,
                    resultado_neto_final: Number(row.resultado_neto_final) || 0,
                }));

                setData(processedData);

                // Calcular totales
                const newTotals: Totals = processedData.reduce((acc, curr) => {
                    acc.totalAltas += curr.altas;
                    acc.totalComision += curr.comision_total;
                    acc.totalPagoCorte1 += curr.pago_corte_1;
                    acc.totalPagoCorte2 += curr.total_a_pagar_corte_2;
                    acc.totalPenalidades += curr.total_penalidades;
                    acc.totalClawbacks += curr.total_clawbacks;
                    acc.totalDescuentos += curr.total_descuentos;
                    acc.totalNetoFinal += curr.resultado_neto_final;
                    return acc;
                }, {
                    totalAltas: 0,
                    totalComision: 0,
                    totalPagoCorte1: 0,
                    totalPagoCorte2: 0,
                    totalPenalidades: 0,
                    totalClawbacks: 0,
                    totalDescuentos: 0,
                    totalNetoFinal: 0,
                });

                setTotals(newTotals);

            } catch (error) {
                console.error('Error fetching resultados finales:', error);
                toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Error desconocido",
                    variant: "destructive"
                });
            }
            setLoading(false);
        };

        fetchData();
    }, [periodo, zona, toast]);

    const handleDownload = () => {
        if (data.length === 0) {
            toast({
                title: "Sin datos",
                description: "No hay datos para descargar.",
                variant: "destructive"
            });
            return;
        }

        // Crear CSV
        const headers = [
            'RUC', 'Agencia', 'Meta', 'Top', 'Altas', '% Cumpl.', 'M. Blanca', 'Bono ARPU',
            'Mult. Final', 'Corte 1', 'Corte 2', 'Corte 3', 'Corte 4',
            'Comisión Total', 'Pago Corte 1', 'Pago Corte 2',
            'Penalidad 1', 'Penalidad 2', 'Penalidad 3', 'Total Penalidades',
            'Clawback 1', 'Clawback 2', 'Clawback 3', 'Total Clawbacks',
            'Total Descuentos', 'RESULTADO NETO FINAL'
        ];
        
        const csvRows = [
            headers.join(','),
            ...data.map(row => [
                row.ruc,
                `"${row.agencia}"`,
                row.meta !== null ? row.meta : '-',
                row.top,
                row.altas,
                row.porcentaje_cumplimiento !== null ? row.porcentaje_cumplimiento.toFixed(1) : '-',
                row.marcha_blanca,
                row.bono_arpu,
                row.multiplicador_final.toFixed(1),
                row.corte_1,
                row.corte_2,
                row.corte_3,
                row.corte_4,
                row.comision_total.toFixed(2),
                row.pago_corte_1.toFixed(2),
                row.total_a_pagar_corte_2.toFixed(2),
                row.penalidad_1_monto.toFixed(2),
                row.penalidad_2_monto.toFixed(2),
                row.penalidad_3_monto.toFixed(2),
                row.total_penalidades.toFixed(2),
                row.clawback_1_monto.toFixed(2),
                row.clawback_2_monto.toFixed(2),
                row.clawback_3_monto.toFixed(2),
                row.total_clawbacks.toFixed(2),
                row.total_descuentos.toFixed(2),
                row.resultado_neto_final.toFixed(2)
            ].join(','))
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `resultados_finales_${zona}_${periodo}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "✅ Descarga iniciada",
            description: `Archivo resultados_finales_${zona}_${periodo}.csv`,
        });
    };

    const SortButton = ({ columnKey, children }: { columnKey: keyof ResultadoFinal; children: React.ReactNode }) => (
        <Button
            variant="ghost"
            onClick={() => requestSort(columnKey)}
            className="h-auto p-0 text-xs font-bold text-inherit hover:bg-transparent hover:text-inherit"
        >
            {children}
            {sortConfig?.key === columnKey && (
                <ArrowUpDown className={`ml-1 h-3 w-3 ${sortConfig.direction === 'descending' ? 'rotate-180' : ''}`} />
            )}
        </Button>
    );

    const formatCurrency = (value: number) => {
        return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-lg">
                <CardContent className="flex items-center justify-center p-8">
                    <Icons.Spinner className="h-8 w-8 animate-spin text-emerald-600" />
                    <span className="ml-3 text-lg text-muted-foreground">Cargando resultados finales...</span>
                </CardContent>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <Card className="border-0 shadow-lg">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Sin datos disponibles</h3>
                    <p className="text-muted-foreground">
                        No hay resultados finales para este periodo. Asegúrate de haber guardado los datos del Corte 2.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
            <CardHeader className="pb-4 border-b text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <DollarSign className="h-8 w-8" />
                        <div>
                            <CardTitle className="text-xl font-bold tracking-tight">
                                Resultados Finales Consolidados
                            </CardTitle>
                            <CardDescription className="text-emerald-100 mt-1">
                                {data.length} agencias • Periodo {periodo} • {zona.charAt(0).toUpperCase() + zona.slice(1)}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {totals && (
                            <>
                                <Badge className="bg-white/25 text-white border-white/40 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    Comisión: {formatCurrency(totals.totalComision)}
                                </Badge>
                                <Badge className="bg-red-500/40 text-white border-red-300/40 flex items-center gap-1">
                                    <TrendingDown className="h-3 w-3" />
                                    Descuentos: {formatCurrency(totals.totalDescuentos)}
                                </Badge>
                                <Badge className="bg-emerald-800/60 text-white border-emerald-200/40 font-bold flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    NETO: {formatCurrency(totals.totalNetoFinal)}
                                </Badge>
                            </>
                        )}
                        <Button
                            onClick={handleDownload}
                            variant="outline"
                            className="bg-white/25 text-white border-white/40 hover:bg-white/40"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Descargar CSV
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 relative">
                <div className="overflow-auto max-h-[600px] max-w-full">
                    <Table className="relative">
                        <TableHeader className="sticky top-0 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-slate-800 dark:to-slate-700 z-10">
                            <TableRow className="hover:bg-emerald-100 dark:hover:bg-slate-800">
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-emerald-600">
                                    <SortButton columnKey="agencia">AGENCIA</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-emerald-500">
                                    <SortButton columnKey="ruc">RUC</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-emerald-600">
                                    <SortButton columnKey="altas">ALTAS</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-emerald-500">
                                    <SortButton columnKey="multiplicador_final">MULT.</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-emerald-600 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                                    <SortButton columnKey="comision_total">COMISIÓN TOTAL</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200">
                                    <SortButton columnKey="pago_corte_1">PAGO C1</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200">
                                    <SortButton columnKey="total_a_pagar_corte_2">PAGO C2</SortButton>
                                </TableHead>
                                {/* Penalidades */}
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
                                    <SortButton columnKey="penalidad_1_monto">P1</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
                                    <SortButton columnKey="penalidad_2_monto">P2</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
                                    <SortButton columnKey="penalidad_3_monto">P3</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-red-600 bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 font-bold">
                                    <SortButton columnKey="total_penalidades">∑ PENAL.</SortButton>
                                </TableHead>
                                {/* Clawbacks */}
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                                    <SortButton columnKey="clawback_1_monto">CB1</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                                    <SortButton columnKey="clawback_2_monto">CB2</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                                    <SortButton columnKey="clawback_3_monto">CB3</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-purple-600 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 font-bold">
                                    <SortButton columnKey="total_clawbacks">∑ CLAWB.</SortButton>
                                </TableHead>
                                {/* Totales */}
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 font-bold">
                                    <SortButton columnKey="total_descuentos">TOTAL DESC.</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-emerald-700 bg-emerald-200 dark:bg-emerald-800/50 text-emerald-900 dark:text-emerald-100 font-bold">
                                    <SortButton columnKey="resultado_neto_final">NETO FINAL</SortButton>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedData.map((row, index) => (
                                <TableRow 
                                    key={row.ruc || index} 
                                    className={`
                                        ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-emerald-50/50 dark:bg-slate-800'}
                                        hover:bg-emerald-100/70 dark:hover:bg-slate-700
                                    `}
                                >
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap font-medium text-emerald-700 dark:text-emerald-400">
                                        {row.agencia}
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-muted-foreground">
                                        {row.ruc}
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-center font-bold">
                                        {row.altas}
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-center">
                                        <Badge variant="outline" className="border-emerald-400 text-emerald-700">
                                            x{row.multiplicador_final.toFixed(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10">
                                        {formatCurrency(row.comision_total)}
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right text-orange-600 bg-orange-50/50 dark:bg-orange-900/10">
                                        {formatCurrency(row.pago_corte_1)}
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right text-amber-600 bg-amber-50/50 dark:bg-amber-900/10">
                                        {formatCurrency(row.total_a_pagar_corte_2)}
                                    </TableCell>
                                    {/* Penalidades */}
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right text-red-600 bg-red-50/50 dark:bg-red-900/10">
                                        {row.penalidad_1_monto > 0 ? formatCurrency(row.penalidad_1_monto) : '-'}
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right text-red-600 bg-red-50/50 dark:bg-red-900/10">
                                        {row.penalidad_2_monto > 0 ? formatCurrency(row.penalidad_2_monto) : '-'}
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right text-red-600 bg-red-50/50 dark:bg-red-900/10">
                                        {row.penalidad_3_monto > 0 ? formatCurrency(row.penalidad_3_monto) : '-'}
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right font-bold text-red-700 bg-red-100/50 dark:bg-red-900/20">
                                        {row.total_penalidades > 0 ? formatCurrency(row.total_penalidades) : '-'}
                                    </TableCell>
                                    {/* Clawbacks */}
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right text-purple-600 bg-purple-50/50 dark:bg-purple-900/10">
                                        {row.clawback_1_monto > 0 ? formatCurrency(row.clawback_1_monto) : '-'}
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right text-purple-600 bg-purple-50/50 dark:bg-purple-900/10">
                                        {row.clawback_2_monto > 0 ? formatCurrency(row.clawback_2_monto) : '-'}
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right text-purple-600 bg-purple-50/50 dark:bg-purple-900/10">
                                        {row.clawback_3_monto > 0 ? formatCurrency(row.clawback_3_monto) : '-'}
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right font-bold text-purple-700 bg-purple-100/50 dark:bg-purple-900/20">
                                        {row.total_clawbacks > 0 ? formatCurrency(row.total_clawbacks) : '-'}
                                    </TableCell>
                                    {/* Totales */}
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right font-bold text-orange-700 bg-orange-50/50 dark:bg-orange-900/10">
                                        {row.total_descuentos > 0 ? formatCurrency(row.total_descuentos) : '-'}
                                    </TableCell>
                                    <TableCell className="text-sm px-2 py-2.5 whitespace-nowrap text-right font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30">
                                        {formatCurrency(row.resultado_neto_final)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        {totals && (
                            <TableFooter className="sticky bottom-0 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700">
                                <TableRow className="font-bold">
                                    <TableCell colSpan={2} className="text-right text-base">TOTALES:</TableCell>
                                    <TableCell className="text-center text-base">{totals.totalAltas}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right text-base text-blue-700 dark:text-blue-400">
                                        {formatCurrency(totals.totalComision)}
                                    </TableCell>
                                    <TableCell className="text-right text-base text-orange-600">
                                        {formatCurrency(totals.totalPagoCorte1)}
                                    </TableCell>
                                    <TableCell className="text-right text-base text-amber-600">
                                        {formatCurrency(totals.totalPagoCorte2)}
                                    </TableCell>
                                    <TableCell colSpan={3}></TableCell>
                                    <TableCell className="text-right text-base text-red-700">
                                        {formatCurrency(totals.totalPenalidades)}
                                    </TableCell>
                                    <TableCell colSpan={3}></TableCell>
                                    <TableCell className="text-right text-base text-purple-700">
                                        {formatCurrency(totals.totalClawbacks)}
                                    </TableCell>
                                    <TableCell className="text-right text-base text-orange-700">
                                        {formatCurrency(totals.totalDescuentos)}
                                    </TableCell>
                                    <TableCell className="text-right text-lg text-emerald-700 dark:text-emerald-400">
                                        {formatCurrency(totals.totalNetoFinal)}
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

