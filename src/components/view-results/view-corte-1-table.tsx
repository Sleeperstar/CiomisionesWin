"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import * as XLSX from 'xlsx';

interface Corte1Data {
    id: number;
    ruc: string;
    agencia: string;
    meta: number | null;
    top: string;
    altas: number;
    corte_1: number;
    corte_2: number;
    corte_3: number;
    corte_4: number;
    precio_sin_igv_promedio: number;
    porcentaje_cumplimiento: number | null;
    marcha_blanca: string;
    bono_arpu: string;
    factor_multiplicador: number;
    multiplicador_final: number;
    total_a_pagar_corte_1: number;
}

interface Props {
    zona: string;
    mes: string;
    periodo: number;
}

export default function ViewCorte1Table({ zona, mes, periodo }: Props) {
    const [data, setData] = useState<Corte1Data[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [sortConfig, setSortConfig] = useState<{ key: keyof Corte1Data; direction: 'ascending' | 'descending' } | null>(null);

    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue === null || bValue === null) return 0;
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const requestSort = (key: keyof Corte1Data) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleDownload = () => {
        if (data.length === 0) {
            toast({ title: "Sin datos", description: "No hay datos para descargar.", variant: "destructive" });
            return;
        }

        const exportData = data.map(row => ({
            'RUC': row.ruc,
            'AGENCIA': row.agencia,
            'META': row.meta || '-',
            'TOP': row.top,
            'ALTAS': row.altas,
            'CORTE_1': row.corte_1,
            'CORTE_2': row.corte_2,
            'CORTE_3': row.corte_3,
            'CORTE_4': row.corte_4,
            'PRECIO_SIN_IGV_PROM': row.precio_sin_igv_promedio,
            '%_CUMPLIMIENTO': row.porcentaje_cumplimiento !== null ? row.porcentaje_cumplimiento : '-',
            'MARCHA_BLANCA': row.marcha_blanca,
            'BONO_ARPU': row.bono_arpu,
            'FACTOR_MULT': row.factor_multiplicador,
            'MULT_FINAL': row.multiplicador_final,
            'TOTAL_A_PAGAR_C1': row.total_a_pagar_corte_1
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Corte 1');
        XLSX.writeFile(wb, `Corte1_${zona.toUpperCase()}_${mes}_${periodo}.xlsx`);

        toast({ title: "✅ Descarga completada", description: `${data.length} registros exportados.` });
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: result, error } = await supabase
                    .from('resultado_comisiones_corte_1')
                    .select('*')
                    .eq('periodo', periodo)
                    .eq('zona', zona.toUpperCase())
                    .order('altas', { ascending: false });

                if (error) throw error;
                setData(result || []);
            } catch (error) {
                console.error('Error:', error);
                toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
            }
            setLoading(false);
        };
        fetchData();
    }, [periodo, zona, toast]);

    const SortButton = ({ columnKey, children }: { columnKey: keyof Corte1Data; children: React.ReactNode }) => (
        <Button variant="ghost" onClick={() => requestSort(columnKey)} className="h-7 px-2 hover:bg-orange-200 font-semibold text-xs">
            {children}
            <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
    );

    const totalPagar = data.reduce((sum, r) => sum + (r.total_a_pagar_corte_1 || 0), 0);
    const totalAltas = data.reduce((sum, r) => sum + r.altas, 0);

    if (loading) {
        return (
            <Card className="border-0 shadow-lg">
                <CardContent className="flex items-center justify-center py-20">
                    <Icons.Spinner className="h-8 w-8 animate-spin text-orange-500" />
                    <span className="ml-3">Cargando Corte 1...</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/30 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
            <CardHeader className="pb-4 border-b text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #f53c00 0%, #ff8300 50%, #ffa700 100%)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold">Corte 1 - Solo Comisión</CardTitle>
                        <CardDescription className="text-orange-100 mt-1">
                            {data.length} agencias • Periodo {periodo}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 items-center">
                        <Badge className="bg-white/20 text-white border-white/40 text-sm py-1">
                            Total: S/ {totalPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </Badge>
                        <Button onClick={handleDownload} disabled={data.length === 0} className="bg-white/25 text-white border-white/40 hover:bg-white/40">
                            <Download className="mr-2 h-4 w-4" />
                            Descargar Excel
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-auto max-h-[500px]">
                    <Table className="text-xs">
                        <TableHeader className="sticky top-0 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-slate-800 dark:to-slate-700 z-10">
                            <TableRow>
                                <TableHead className="px-2 py-2"><SortButton columnKey="ruc">RUC</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="agencia">AGENCIA</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="meta">META</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="top">TOP</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="altas">ALTAS</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="corte_1">C1</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="porcentaje_cumplimiento">% CUMPL.</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="marcha_blanca">M.BLANCA</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="multiplicador_final">MULT.</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="total_a_pagar_corte_1">TOTAL C1</SortButton></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                        No hay datos para este periodo y zona.
                                    </TableCell>
                                </TableRow>
                            )}
                            {sortedData.map((row, index) => (
                                <TableRow key={row.id} className={index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-orange-50/50 dark:bg-slate-800/50'}>
                                    <TableCell className="px-2 py-2 font-mono">{row.ruc}</TableCell>
                                    <TableCell className="px-2 py-2 max-w-[150px] truncate" title={row.agencia}>{row.agencia}</TableCell>
                                    <TableCell className="px-2 py-2 text-center">{row.meta !== null ? row.meta : '-'}</TableCell>
                                    <TableCell className="px-2 py-2 text-center">
                                        <Badge variant="outline" className={
                                            row.top === 'GOLD' ? 'border-yellow-500 text-yellow-600' :
                                            row.top === 'SILVER' ? 'border-gray-400 text-gray-500' :
                                            'border-orange-400 text-orange-500'
                                        }>{row.top}</Badge>
                                    </TableCell>
                                    <TableCell className="px-2 py-2 text-center font-bold text-orange-600">{row.altas}</TableCell>
                                    <TableCell className="px-2 py-2 text-center">{row.corte_1}</TableCell>
                                    <TableCell className="px-2 py-2 text-center">
                                        {row.porcentaje_cumplimiento !== null ? `${row.porcentaje_cumplimiento.toFixed(1)}%` : '-'}
                                    </TableCell>
                                    <TableCell className="px-2 py-2 text-center">
                                        <Badge className={row.marcha_blanca === 'Sí' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}>
                                            {row.marcha_blanca}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-2 py-2 text-center font-bold text-orange-500">x{row.multiplicador_final.toFixed(1)}</TableCell>
                                    <TableCell className="px-2 py-2 text-right font-mono font-bold text-green-600">
                                        S/ {row.total_a_pagar_corte_1.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter className="sticky bottom-0 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                            <TableRow className="font-bold">
                                <TableCell colSpan={4}>TOTALES</TableCell>
                                <TableCell className="text-center text-orange-600">{totalAltas}</TableCell>
                                <TableCell colSpan={4}></TableCell>
                                <TableCell className="text-right font-mono text-green-600">
                                    S/ {totalPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

