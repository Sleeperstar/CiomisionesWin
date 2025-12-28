"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";

const monthMap: { [key: string]: number } = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};

// Extraer número del corte de "corte-1" → 1
const getCorteNumber = (corte: string): number => {
    const match = corte.match(/corte-(\d+)/i);
    return match ? parseInt(match[1], 10) : 1;
};

// Estructura para los datos agregados desde Supabase RPC
interface ComisionResumen {
    ruc: string | null;
    agencia: string | null;
    meta: number | null;  // null para marcha blanca
    top: string | null;
    altas: number;
    corte_1: number;
    corte_2: number;
    corte_3: number;
    corte_4: number;
    precio_sin_igv_promedio: number;
    // Campos calculados
    porcentaje_cumplimiento: number | null;  // null para marcha blanca
    marcha_blanca: string;
    bono_arpu: string;
    factor_multiplicador: number;
    multiplicador_final: number;
    total_a_pagar: number;
}

// Interfaz para los totales
interface Totals {
    totalAltas: number;
    totalMeta: number;
    totalCorteSeleccionado: number;
    avgPrecio: number;
    avgCumplimiento: number;
    totalPagar: number;
}

export default function ResultadoComision({ corte, zona, mes }: { corte: string; zona: string; mes: string }) {
    const [data, setData] = useState<ComisionResumen[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [sortConfig, setSortConfig] = useState<{ key: keyof ComisionResumen; direction: 'ascending' | 'descending' } | null>(null);
    const [totals, setTotals] = useState<Totals | null>(null);

    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === null || bValue === null) return 0;

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const requestSort = (key: keyof ComisionResumen) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Obtener número del corte seleccionado
    const corteNumber = getCorteNumber(corte);

    useEffect(() => {
        const fetchData = async () => {
            setData([]);
            setTotals(null);
            setLoading(true);

            const monthNumber = monthMap[mes];
            if (!monthNumber) {
                toast({ title: "Error", description: "Mes inválido seleccionado.", variant: "destructive" });
                setLoading(false);
                return;
            }

            const year = 2025;

            try {
                // UNA SOLA CONSULTA: La función RPC calcula todo incluyendo % cumplimiento, factor y total
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_comisiones_resumen', {
                    p_zona: zona,
                    p_mes: monthNumber,
                    p_year: year,
                    p_corte: corteNumber  // Nuevo parámetro: corte seleccionado
                });

                if (rpcError) {
                    throw new Error(`Error en RPC: ${rpcError.message}`);
                }

                // Mapear los datos directamente (ya vienen completos desde la BD)
                const processedData: ComisionResumen[] = (rpcData || []).map((row: ComisionResumen) => ({
                    ruc: row.ruc,
                    agencia: row.agencia,
                    meta: row.meta === null ? null : Number(row.meta),  // Preservar null para marcha blanca
                    top: row.top || 'N/A',
                    altas: Number(row.altas) || 0,
                    corte_1: Number(row.corte_1) || 0,
                    corte_2: Number(row.corte_2) || 0,
                    corte_3: Number(row.corte_3) || 0,
                    corte_4: Number(row.corte_4) || 0,
                    precio_sin_igv_promedio: Number(row.precio_sin_igv_promedio) || 0,
                    porcentaje_cumplimiento: row.porcentaje_cumplimiento === null ? null : Number(row.porcentaje_cumplimiento),  // Preservar null
                    marcha_blanca: row.marcha_blanca || 'No',
                    bono_arpu: row.bono_arpu || 'No',
                    factor_multiplicador: Number(row.factor_multiplicador) || 1.3,
                    multiplicador_final: Number(row.multiplicador_final) || Number(row.factor_multiplicador) || 1.3,
                    total_a_pagar: Number(row.total_a_pagar) || 0
                }));

                setData(processedData);

                // Obtener el corte seleccionado para los totales
                const getCorteValue = (row: ComisionResumen) => {
                    switch (corteNumber) {
                        case 1: return row.corte_1;
                        case 2: return row.corte_2;
                        case 3: return row.corte_3;
                        case 4: return row.corte_4;
                        default: return row.corte_1;
                    }
                };

                // Calcular totales (ignorando null para meta y % cumplimiento)
                const totalAltas = processedData.reduce((sum, row) => sum + row.altas, 0);
                const totalMeta = processedData.reduce((sum, row) => sum + (row.meta ?? 0), 0);
                const totalCorteSeleccionado = processedData.reduce((sum, row) => sum + getCorteValue(row), 0);
                const totalPrecio = processedData.reduce((sum, row) => sum + row.precio_sin_igv_promedio, 0);
                const avgPrecio = processedData.length > 0 ? totalPrecio / processedData.length : 0;
                // Solo calcular promedio de % cumplimiento para agencias que no tienen marcha blanca
                const agenciasSinMarchaBlanca = processedData.filter(row => row.porcentaje_cumplimiento !== null);
                const totalCumplimiento = agenciasSinMarchaBlanca.reduce((sum, row) => sum + (row.porcentaje_cumplimiento ?? 0), 0);
                const avgCumplimiento = agenciasSinMarchaBlanca.length > 0 ? totalCumplimiento / agenciasSinMarchaBlanca.length : 0;
                const totalPagar = processedData.reduce((sum, row) => sum + row.total_a_pagar, 0);

                setTotals({ totalAltas, totalMeta, totalCorteSeleccionado, avgPrecio, avgCumplimiento, totalPagar });

                console.log(`[Resultado Comision] ✅ Cargados ${processedData.length} registros para Corte ${corteNumber}`);

            } catch (error: unknown) {
                console.error(`Error fetching comisiones:`, error);
                const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                toast({ title: "Error", description: `No se pudieron cargar los datos: ${errorMessage}`, variant: "destructive" });
            }
            
            setLoading(false);
        };

        fetchData();
    }, [corte, zona, mes, corteNumber, toast]);


    // Componente para el botón de ordenar
    const SortButton = ({ columnKey, children }: { columnKey: keyof ComisionResumen; children: React.ReactNode }) => (
        <Button 
            variant="ghost" 
            onClick={() => requestSort(columnKey)}
            className="text-slate-700 dark:text-slate-200 hover:text-[#f53c00] hover:bg-orange-100/50 font-bold px-2 h-auto py-1"
        >
            {children}
            <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
    );

    if (loading) {
        return (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-900 dark:to-slate-800">
                <div className="flex justify-center items-center h-64">
                    <div className="flex flex-col items-center gap-3">
                        <Icons.Spinner className="h-10 w-10 animate-spin text-[#f53c00]" />
                        <p className="text-sm text-muted-foreground animate-pulse">Calculando comisiones...</p>
                    </div>
                </div>
            </Card>
        );
    }

    // Función para obtener el valor del corte seleccionado
    const getCorteValue = (row: ComisionResumen) => {
        switch (corteNumber) {
            case 1: return row.corte_1;
            case 2: return row.corte_2;
            case 3: return row.corte_3;
            case 4: return row.corte_4;
            default: return row.corte_1;
        }
    };

    // Función para obtener el color del % cumplimiento
    const getCumplimientoColor = (pct: number) => {
        if (pct >= 100) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
        if (pct >= 90) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
        if (pct >= 80) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
        if (pct >= 70) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
        return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    };

    return (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/30 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
            <CardHeader className="pb-4 border-b text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #f53c00 0%, #ff8300 50%, #ffa700 100%)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold tracking-tight">
                            Resultado de Comisiones - Corte {corteNumber}
                        </CardTitle>
                        <CardDescription className="text-orange-100 mt-1">
                            {data.length} agencias • {mes.charAt(0).toUpperCase() + mes.slice(1)} 2025 • {zona.charAt(0).toUpperCase() + zona.slice(1)}
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="bg-white/25 text-white border-white/40 px-3 py-1.5 font-semibold">
                            Altas: {totals?.totalAltas.toLocaleString('es-PE') || 0}
                        </Badge>
                        <Badge variant="secondary" className="bg-white/25 text-white border-white/40 px-3 py-1.5 font-semibold">
                            Meta: {totals?.totalMeta.toLocaleString('es-PE') || 0}
                        </Badge>
                        <Badge variant="secondary" className="bg-green-500/80 text-white border-green-400/40 px-3 py-1.5 font-semibold">
                            Total a Pagar: S/ {totals?.totalPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 }) || '0.00'}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 relative">
                <div className="overflow-auto max-h-[500px] max-w-full">
                    <Table className="relative">
                        <TableHeader className="sticky top-0 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-slate-800 dark:to-slate-700">
                            <TableRow className="hover:bg-orange-100 dark:hover:bg-slate-800">
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#f53c00]">
                                    <SortButton columnKey="ruc">RUC</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#f53c00]">
                                    <SortButton columnKey="agencia">AGENCIA</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ff8300]">
                                    <SortButton columnKey="meta">META</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ff8300]">
                                    <SortButton columnKey="top">TOP</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ffa700]">
                                    <SortButton columnKey="altas">ALTAS</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#f53c00]">
                                    <SortButton columnKey="porcentaje_cumplimiento">% CUMPL.</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ff8300] text-center text-xs font-bold text-slate-600">
                                    M.BLANCA
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ffa700] text-center text-xs font-bold text-slate-600">
                                    BONO ARPU
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#f53c00]">
                                    <SortButton columnKey="factor_multiplicador">FACTOR</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ff8300]">
                                    <SortButton columnKey="multiplicador_final">MULT. FINAL</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ffa700]">
                                    <SortButton columnKey={`corte_${corteNumber}` as keyof ComisionResumen}>CORTE {corteNumber}</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#f53c00]">
                                    <SortButton columnKey="precio_sin_igv_promedio">PRECIO S/IGV</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ffa700]">
                                    <SortButton columnKey="total_a_pagar">TOTAL PAGAR</SortButton>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg className="h-12 w-12 text-orange-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span>No se encontraron datos de comisiones</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedData.map((row, index) => (
                                    <TableRow 
                                        key={row.ruc || index}
                                        className={`
                                            transition-colors duration-150
                                            ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-orange-50/40 dark:bg-slate-800/50'}
                                            hover:bg-orange-100/60 dark:hover:bg-orange-900/20
                                        `}
                                    >
                                        <TableCell className="font-mono text-xs px-2 py-2 whitespace-nowrap">{row.ruc}</TableCell>
                                        <TableCell className="text-xs px-2 py-2 whitespace-nowrap max-w-[150px] truncate font-medium" title={row.agencia || ''}>
                                            {row.agencia}
                                        </TableCell>
                                        <TableCell className="text-xs px-2 py-2 whitespace-nowrap text-center">
                                            {row.meta === null ? (
                                                <span className="text-slate-400 font-medium">-</span>
                                            ) : (
                                                <Badge variant="outline" className="border-[#ff8300] text-[#f53c00] font-semibold text-xs">
                                                    {row.meta}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs px-2 py-2 whitespace-nowrap text-center">
                                            <Badge 
                                                variant="secondary" 
                                                className={`font-semibold text-xs ${
                                                    row.top === 'GOLD' 
                                                        ? 'bg-yellow-400/30 text-yellow-700 border border-yellow-500'
                                                        : row.top === 'SILVER'
                                                        ? 'bg-slate-300/30 text-slate-600 border border-slate-400'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                {row.top}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm px-2 py-2 whitespace-nowrap text-center">
                                            <span className="font-bold text-[#f53c00]">{row.altas}</span>
                                        </TableCell>
                                        <TableCell className="text-xs px-2 py-2 whitespace-nowrap text-center">
                                            {row.porcentaje_cumplimiento === null ? (
                                                <span className="text-slate-400 font-medium">-</span>
                                            ) : (
                                                <Badge className={`font-bold text-xs ${getCumplimientoColor(row.porcentaje_cumplimiento)}`}>
                                                    {row.porcentaje_cumplimiento.toFixed(1)}%
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs px-2 py-2 whitespace-nowrap text-center">
                                            <Badge 
                                                variant="secondary"
                                                className={`text-xs ${
                                                    row.marcha_blanca.toUpperCase() === 'SÍ' || row.marcha_blanca.toUpperCase() === 'SI'
                                                        ? 'bg-purple-100 text-purple-700 border border-purple-400'
                                                        : 'bg-slate-100 text-slate-400'
                                                }`}
                                            >
                                                {row.marcha_blanca}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs px-2 py-2 whitespace-nowrap text-center">
                                            <Badge 
                                                variant="secondary"
                                                className={`text-xs ${
                                                    row.bono_arpu.toUpperCase() === 'SÍ' || row.bono_arpu.toUpperCase() === 'SI'
                                                        ? 'bg-blue-100 text-blue-700 border border-blue-400'
                                                        : 'bg-slate-100 text-slate-400'
                                                }`}
                                            >
                                                {row.bono_arpu}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs px-2 py-2 whitespace-nowrap text-center font-bold text-[#ff8300]">
                                            x{row.factor_multiplicador.toFixed(1)}
                                        </TableCell>
                                        <TableCell className="text-xs px-2 py-2 whitespace-nowrap text-center">
                                            <span className={`font-bold ${row.multiplicador_final > row.factor_multiplicador ? 'text-green-600' : 'text-slate-600'}`}>
                                                x{row.multiplicador_final.toFixed(1)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm px-2 py-2 whitespace-nowrap text-center font-medium">
                                            {getCorteValue(row)}
                                        </TableCell>
                                        <TableCell className="text-xs px-2 py-2 whitespace-nowrap text-right font-mono">
                                            S/ {row.precio_sin_igv_promedio.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-xs px-2 py-2 whitespace-nowrap text-right">
                                            <span className="font-bold text-green-600 dark:text-green-400">
                                                S/ {row.total_a_pagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFooter className="sticky bottom-0 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                            <TableRow className="font-bold">
                                <TableCell colSpan={2} className="text-right px-2 py-2 text-slate-700 dark:text-slate-200 text-xs">
                                    TOTALES
                                </TableCell>
                                <TableCell className="text-center px-2 py-2">
                                    <Badge className="bg-[#f53c00] text-white text-xs">{totals?.totalMeta}</Badge>
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-center px-2 py-2">
                                    <Badge className="bg-[#f53c00] text-white px-2">{totals?.totalAltas}</Badge>
                                </TableCell>
                                <TableCell className="text-center px-2 py-2 text-slate-700 dark:text-slate-200 text-xs">
                                    {totals?.avgCumplimiento.toFixed(1)}%
                                </TableCell>
                                <TableCell className="text-center px-2 py-2 text-slate-400 text-xs">-</TableCell>
                                <TableCell className="text-center px-2 py-2 text-slate-400 text-xs">-</TableCell>
                                <TableCell className="text-center px-2 py-2 text-slate-400 text-xs">-</TableCell>
                                <TableCell className="text-center px-2 py-2 text-slate-400 text-xs">-</TableCell>
                                <TableCell className="text-center px-2 py-2 text-slate-700 dark:text-slate-200 text-xs">
                                    {totals?.totalCorteSeleccionado}
                                </TableCell>
                                <TableCell className="text-right px-2 py-2 font-mono text-slate-700 dark:text-slate-200 text-xs">
                                    S/ {totals?.avgPrecio.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right px-2 py-2">
                                    <Badge className="bg-green-600 text-white text-sm px-2 py-1">
                                        S/ {totals?.totalPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
