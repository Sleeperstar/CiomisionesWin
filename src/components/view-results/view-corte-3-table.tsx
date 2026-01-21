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

interface Corte3Data {
    id: number;
    ruc: string;
    agencia: string;
    meta: number | null;
    top: string;
    altas: number;
    corte_1: number;
    corte_2: number;
    corte_3: number;
    primer_recibo_pagado: number;
    segundo_recibo_pagado: number;
    recibos_no_pagados_corte_3: number;
    multiplicador_final: number;
    penalidad_2_churn_3_5_pct: number;
    penalidad_2_umbral: number;
    penalidad_2_altas_penalizadas: number;
    penalidad_2_monto: number;
    clawback_2_umbral_corte_3: number;
    clawback_2_cumplimiento_pct: number;
    clawback_2_multiplicador: number;
    clawback_2_monto: number;
}

interface Props {
    zona: string;
    mes: string;
    periodo: number;
}

export default function ViewCorte3Table({ zona, mes, periodo }: Props) {
    const [data, setData] = useState<Corte3Data[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [sortConfig, setSortConfig] = useState<{ key: keyof Corte3Data; direction: 'ascending' | 'descending' } | null>(null);

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

    const requestSort = (key: keyof Corte3Data) => {
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
            '1ER_RECIBO_PAGADO': row.primer_recibo_pagado,
            '2DO_RECIBO_PAGADO': row.segundo_recibo_pagado,
            'NO_PAGADOS_C3': row.recibos_no_pagados_corte_3,
            'MULT_FINAL': row.multiplicador_final,
            'P2_CHURN_3.5%': row.penalidad_2_churn_3_5_pct,
            'P2_UMBRAL': row.penalidad_2_umbral,
            'P2_ALTAS_PENALIZADAS': row.penalidad_2_altas_penalizadas,
            'P2_MONTO': row.penalidad_2_monto,
            'CB2_UMBRAL': row.clawback_2_umbral_corte_3,
            'CB2_CUMPL_%': row.clawback_2_cumplimiento_pct,
            'CB2_MULT': row.clawback_2_multiplicador,
            'CB2_MONTO': row.clawback_2_monto
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Corte 3');
        XLSX.writeFile(wb, `Corte3_${zona.toUpperCase()}_${mes}_${periodo}.xlsx`);

        toast({ title: "✅ Descarga completada", description: `${data.length} registros exportados.` });
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: result, error } = await supabase
                    .from('resultado_comisiones_corte_3')
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

    const SortButton = ({ columnKey, children }: { columnKey: keyof Corte3Data; children: React.ReactNode }) => (
        <Button variant="ghost" onClick={() => requestSort(columnKey)} className="h-7 px-2 hover:bg-purple-200 font-semibold text-xs">
            {children}
            <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
    );

    const totalPenalidad = data.reduce((sum, r) => sum + (r.penalidad_2_monto || 0), 0);
    const totalClawback = data.reduce((sum, r) => sum + (r.clawback_2_monto || 0), 0);

    if (loading) {
        return (
            <Card className="border-0 shadow-lg">
                <CardContent className="flex items-center justify-center py-20">
                    <Icons.Spinner className="h-8 w-8 animate-spin text-purple-500" />
                    <span className="ml-3">Cargando Corte 3...</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-slate-800 overflow-clip">
            <CardHeader className="pb-4 border-b text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold">Corte 3 - Penalidad 2 + Clawback 2</CardTitle>
                        <CardDescription className="text-purple-100 mt-1">
                            {data.length} agencias • Periodo {periodo}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                        <Badge className="bg-red-500/80 text-white text-sm py-1">
                            Penalidad 2: S/ {totalPenalidad.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </Badge>
                        <Badge className="bg-purple-300/80 text-purple-900 text-sm py-1">
                            Clawback 2: S/ {totalClawback.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </Badge>
                        <Button onClick={handleDownload} disabled={data.length === 0} className="bg-white/25 text-white border-white/40 hover:bg-white/40">
                            <Download className="mr-2 h-4 w-4" />
                            Descargar Excel
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 overflow-clip">
                <div className="overflow-auto max-h-[500px] relative">
                    <Table className="text-xs">
                        <TableHeader className="sticky top-0 bg-gradient-to-r from-purple-100 to-violet-100 dark:from-slate-800 dark:to-slate-700 z-1">
                            <TableRow>
                                <TableHead className="px-2 py-2"><SortButton columnKey="ruc">RUC</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="agencia">AGENCIA</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="altas">ALTAS</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="primer_recibo_pagado">1er REC.</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="segundo_recibo_pagado">2do REC.</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="recibos_no_pagados_corte_3">NO PAG.</SortButton></TableHead>
                                <TableHead className="px-2 py-2 bg-red-50 dark:bg-red-900/20"><SortButton columnKey="penalidad_2_altas_penalizadas">P2 ALTAS</SortButton></TableHead>
                                <TableHead className="px-2 py-2 bg-red-50 dark:bg-red-900/20"><SortButton columnKey="penalidad_2_monto">P2 MONTO</SortButton></TableHead>
                                <TableHead className="px-2 py-2 bg-purple-50 dark:bg-purple-900/20"><SortButton columnKey="clawback_2_cumplimiento_pct">CB2 %</SortButton></TableHead>
                                <TableHead className="px-2 py-2 bg-purple-50 dark:bg-purple-900/20"><SortButton columnKey="clawback_2_monto">CB2 MONTO</SortButton></TableHead>
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
                                <TableRow key={row.id} className={index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-purple-50/50 dark:bg-slate-800/50'}>
                                    <TableCell className="px-2 py-2 font-mono">{row.ruc}</TableCell>
                                    <TableCell className="px-2 py-2 max-w-[120px] truncate" title={row.agencia}>{row.agencia}</TableCell>
                                    <TableCell className="px-2 py-2 text-center font-bold text-purple-600">{row.altas}</TableCell>
                                    <TableCell className="px-2 py-2 text-center text-green-600">{row.primer_recibo_pagado || 0}</TableCell>
                                    <TableCell className="px-2 py-2 text-center text-green-600 font-semibold">{row.segundo_recibo_pagado || 0}</TableCell>
                                    <TableCell className="px-2 py-2 text-center text-red-600 font-semibold">{row.recibos_no_pagados_corte_3 || 0}</TableCell>
                                    <TableCell className="px-2 py-2 text-center bg-red-50/50 dark:bg-red-900/10 font-semibold">{row.penalidad_2_altas_penalizadas || 0}</TableCell>
                                    <TableCell className="px-2 py-2 text-right bg-red-50/50 dark:bg-red-900/10 font-mono text-red-600">S/ {(row.penalidad_2_monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="px-2 py-2 text-center bg-purple-50/50 dark:bg-purple-900/10">{(row.clawback_2_cumplimiento_pct || 0).toFixed(1)}%</TableCell>
                                    <TableCell className="px-2 py-2 text-right bg-purple-50/50 dark:bg-purple-900/10 font-mono text-purple-600">S/ {(row.clawback_2_monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter className="sticky bottom-0 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                            <TableRow className="font-bold">
                                <TableCell colSpan={7}>TOTALES</TableCell>
                                <TableCell className="text-right font-mono text-red-600">S/ {totalPenalidad.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right font-mono text-purple-600">S/ {totalClawback.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

