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

// Estructura para los datos agregados desde Supabase RPC
interface ComisionResumen {
    ruc: string | null;
    agencia: string | null;
    meta: number;
    top: string | null;
    altas: number;
    corte_1: number;
    corte_2: number;
    corte_3: number;
    corte_4: number;
    precio_sin_igv_promedio: number;
}

// Interfaz para los totales
interface Totals {
    totalAltas: number;
    totalMeta: number;
    totalCorte1: number;
    totalCorte2: number;
    totalCorte3: number;
    totalCorte4: number;
    avgPrecio: number;
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
            const periodo = `${year}${String(monthNumber).padStart(2, '0')}`;

            try {
                // Llamar a la función RPC de Supabase que calcula todo en la BD
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_comisiones_resumen', {
                    p_zona: zona,
                    p_mes: monthNumber,
                    p_year: year
                });

                if (rpcError) {
                    throw new Error(`Error en RPC: ${rpcError.message}`);
                }

                // Obtener parámetros (META y TOP) de la tabla Parametros
                const { data: paramsData, error: paramsError } = await supabase
                    .from('Parametros')
                    .select('RUC, META, TOP')
                    .eq('ZONA', zona.toUpperCase())
                    .eq('PERIODO', periodo);

                if (paramsError) {
                    throw new Error(`Error obteniendo parámetros: ${paramsError.message}`);
                }

                // Crear mapa de parámetros por RUC
                const paramsMap = new Map((paramsData || []).map(p => [p.RUC, { META: p.META || 0, TOP: p.TOP || 'N/A' }]));

                // Combinar datos de RPC con parámetros
                const combinedData: ComisionResumen[] = (rpcData || []).map((row: {
                    ruc: string | null;
                    agencia: string | null;
                    altas: number;
                    corte_1: number;
                    corte_2: number;
                    corte_3: number;
                    corte_4: number;
                    precio_sin_igv_promedio: number;
                }) => {
                    const params = paramsMap.get(row.ruc) || { META: 0, TOP: 'N/A' };
                    return {
                        ruc: row.ruc,
                        agencia: row.agencia,
                        meta: params.META,
                        top: params.TOP,
                        altas: Number(row.altas) || 0,
                        corte_1: Number(row.corte_1) || 0,
                        corte_2: Number(row.corte_2) || 0,
                        corte_3: Number(row.corte_3) || 0,
                        corte_4: Number(row.corte_4) || 0,
                        precio_sin_igv_promedio: Number(row.precio_sin_igv_promedio) || 0
                    };
                });

                setData(combinedData);

                // Calcular totales
                const totalAltas = combinedData.reduce((sum, row) => sum + row.altas, 0);
                const totalMeta = combinedData.reduce((sum, row) => sum + row.meta, 0);
                const totalCorte1 = combinedData.reduce((sum, row) => sum + row.corte_1, 0);
                const totalCorte2 = combinedData.reduce((sum, row) => sum + row.corte_2, 0);
                const totalCorte3 = combinedData.reduce((sum, row) => sum + row.corte_3, 0);
                const totalCorte4 = combinedData.reduce((sum, row) => sum + row.corte_4, 0);
                const totalPrecio = combinedData.reduce((sum, row) => sum + row.precio_sin_igv_promedio, 0);
                const avgPrecio = combinedData.length > 0 ? totalPrecio / combinedData.length : 0;

                setTotals({ totalAltas, totalMeta, totalCorte1, totalCorte2, totalCorte3, totalCorte4, avgPrecio });

                console.log(`[Resultado Comision] Cargados ${combinedData.length} registros desde RPC`);

            } catch (error: unknown) {
                console.error(`Error fetching comisiones:`, error);
                const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                toast({ title: "Error", description: `No se pudieron cargar los datos: ${errorMessage}`, variant: "destructive" });
            }
            
            setLoading(false);
        };

        fetchData();
    }, [corte, zona, mes, toast]);


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

    return (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/30 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
            <CardHeader className="pb-4 border-b text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #f53c00 0%, #ff8300 50%, #ffa700 100%)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold tracking-tight">Resultado de Comisiones</CardTitle>
                        <CardDescription className="text-orange-100 mt-1">
                            Resumen calculado por agencia • {data.length} agencias
                        </CardDescription>
                    </div>
                    <div className="flex gap-3">
                        <Badge variant="secondary" className="bg-white/25 text-white border-white/40 px-3 py-1.5 font-semibold">
                            Total Altas: {totals?.totalAltas.toLocaleString('es-PE') || 0}
                        </Badge>
                        <Badge variant="secondary" className="bg-white/25 text-white border-white/40 px-3 py-1.5 font-semibold">
                            Total Meta: {totals?.totalMeta.toLocaleString('es-PE') || 0}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 relative">
                <div className="overflow-auto max-h-[500px] max-w-full">
                    <Table className="relative">
                        <TableHeader className="sticky top-0 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-slate-800 dark:to-slate-700">
                            <TableRow className="hover:bg-orange-100 dark:hover:bg-slate-800">
                                <TableHead className="whitespace-nowrap px-3 py-2 border-b-2 border-[#f53c00]">
                                    <SortButton columnKey="ruc">RUC</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 border-b-2 border-[#f53c00]">
                                    <SortButton columnKey="agencia">AGENCIA</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 border-b-2 border-[#ff8300]">
                                    <SortButton columnKey="meta">META</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 border-b-2 border-[#ff8300]">
                                    <SortButton columnKey="top">TOP</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 border-b-2 border-[#ffa700]">
                                    <SortButton columnKey="altas">ALTAS</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 border-b-2 border-[#f53c00]">
                                    <SortButton columnKey="corte_1">CORTE 1</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 border-b-2 border-[#ff8300]">
                                    <SortButton columnKey="corte_2">CORTE 2</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 border-b-2 border-[#ffa700]">
                                    <SortButton columnKey="corte_3">CORTE 3</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 border-b-2 border-[#f53c00]">
                                    <SortButton columnKey="corte_4">CORTE 4</SortButton>
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 border-b-2 border-[#ffa700]">
                                    <SortButton columnKey="precio_sin_igv_promedio">PRECIO S/IGV</SortButton>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
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
                                        <TableCell className="font-mono text-sm px-3 py-2.5 whitespace-nowrap">{row.ruc}</TableCell>
                                        <TableCell className="text-sm px-3 py-2.5 whitespace-nowrap max-w-[200px] truncate font-medium" title={row.agencia || ''}>
                                            {row.agencia}
                                        </TableCell>
                                        <TableCell className="text-sm px-3 py-2.5 whitespace-nowrap text-center">
                                            <Badge variant="outline" className="border-[#ff8300] text-[#f53c00] font-semibold">
                                                {row.meta}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm px-3 py-2.5 whitespace-nowrap text-center">
                                            <Badge 
                                                variant="secondary" 
                                                className={`font-semibold ${
                                                    row.top === 'SI' 
                                                        ? 'bg-[#ffa700]/20 text-[#f53c00] border border-[#ffa700]' 
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                {row.top}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm px-3 py-2.5 whitespace-nowrap text-center">
                                            <span className="font-bold text-[#f53c00] text-lg">{row.altas}</span>
                                        </TableCell>
                                        <TableCell className="text-sm px-3 py-2.5 whitespace-nowrap text-center font-medium">
                                            {row.corte_1}
                                        </TableCell>
                                        <TableCell className="text-sm px-3 py-2.5 whitespace-nowrap text-center font-medium">
                                            {row.corte_2}
                                        </TableCell>
                                        <TableCell className="text-sm px-3 py-2.5 whitespace-nowrap text-center font-medium">
                                            {row.corte_3}
                                        </TableCell>
                                        <TableCell className="text-sm px-3 py-2.5 whitespace-nowrap text-center font-medium">
                                            {row.corte_4}
                                        </TableCell>
                                        <TableCell className="text-sm px-3 py-2.5 whitespace-nowrap text-right font-mono">
                                            S/ {row.precio_sin_igv_promedio.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFooter className="sticky bottom-0 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                            <TableRow className="font-bold">
                                <TableCell colSpan={2} className="text-right px-3 py-3 text-slate-700 dark:text-slate-200">
                                    TOTALES
                                </TableCell>
                                <TableCell className="text-center px-3 py-3">
                                    <Badge className="bg-[#f53c00] text-white">{totals?.totalMeta}</Badge>
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-center px-3 py-3">
                                    <Badge className="bg-[#f53c00] text-white text-lg px-3">{totals?.totalAltas}</Badge>
                                </TableCell>
                                <TableCell className="text-center px-3 py-3 text-slate-700 dark:text-slate-200">{totals?.totalCorte1}</TableCell>
                                <TableCell className="text-center px-3 py-3 text-slate-700 dark:text-slate-200">{totals?.totalCorte2}</TableCell>
                                <TableCell className="text-center px-3 py-3 text-slate-700 dark:text-slate-200">{totals?.totalCorte3}</TableCell>
                                <TableCell className="text-center px-3 py-3 text-slate-700 dark:text-slate-200">{totals?.totalCorte4}</TableCell>
                                <TableCell className="text-right px-3 py-3 font-mono text-slate-700 dark:text-slate-200">
                                    S/ {totals?.avgPrecio.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
