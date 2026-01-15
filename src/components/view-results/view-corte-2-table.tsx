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

interface Corte2Data {
    id: number;
    ruc: string;
    agencia: string;
    meta: number | null;
    top: string;
    altas: number;
    corte_1: number;
    corte_2: number;
    primer_recibo_pagado: number;
    recibos_no_pagados_corte_2: number;
    multiplicador_final: number;
    comision_total: number;
    pago_corte_1: number;
    total_a_pagar_corte_2: number;
    penalidad_1_churn_4_5_pct: number;
    penalidad_1_umbral: number;
    penalidad_1_altas_penalizadas: number;
    penalidad_1_monto: number;
    clawback_1_umbral_corte_2: number;
    clawback_1_cumplimiento_pct: number;
    clawback_1_multiplicador: number;
    clawback_1_monto: number;
}

interface Props {
    zona: string;
    mes: string;
    periodo: number;
}

export default function ViewCorte2Table({ zona, mes, periodo }: Props) {
    const [data, setData] = useState<Corte2Data[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [sortConfig, setSortConfig] = useState<{ key: keyof Corte2Data; direction: 'ascending' | 'descending' } | null>(null);

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

    const requestSort = (key: keyof Corte2Data) => {
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
            '1ER_RECIBO_PAGADO': row.primer_recibo_pagado,
            'NO_PAGADOS_C2': row.recibos_no_pagados_corte_2,
            'MULT_FINAL': row.multiplicador_final,
            'COMISION_TOTAL': row.comision_total,
            'PAGO_C1': row.pago_corte_1,
            'TOTAL_A_PAGAR_C2': row.total_a_pagar_corte_2,
            'P1_CHURN_4.5%': row.penalidad_1_churn_4_5_pct,
            'P1_UMBRAL': row.penalidad_1_umbral,
            'P1_ALTAS_PENALIZADAS': row.penalidad_1_altas_penalizadas,
            'P1_MONTO': row.penalidad_1_monto,
            'CB1_UMBRAL': row.clawback_1_umbral_corte_2,
            'CB1_CUMPL_%': row.clawback_1_cumplimiento_pct,
            'CB1_MULT': row.clawback_1_multiplicador,
            'CB1_MONTO': row.clawback_1_monto
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Corte 2');
        XLSX.writeFile(wb, `Corte2_${zona.toUpperCase()}_${mes}_${periodo}.xlsx`);

        toast({ title: "✅ Descarga completada", description: `${data.length} registros exportados.` });
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: result, error } = await supabase
                    .from('resultado_comisiones_corte_2')
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

    const SortButton = ({ columnKey, children }: { columnKey: keyof Corte2Data; children: React.ReactNode }) => (
        <Button variant="ghost" onClick={() => requestSort(columnKey)} className="h-7 px-2 hover:bg-blue-200 font-semibold text-xs">
            {children}
            <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
    );

    const totalPagar = data.reduce((sum, r) => sum + (r.total_a_pagar_corte_2 || 0), 0);
    const totalPenalidad = data.reduce((sum, r) => sum + (r.penalidad_1_monto || 0), 0);
    const totalClawback = data.reduce((sum, r) => sum + (r.clawback_1_monto || 0), 0);

    if (loading) {
        return (
            <Card className="border-0 shadow-lg">
                <CardContent className="flex items-center justify-center py-20">
                    <Icons.Spinner className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-3">Cargando Corte 2...</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
            <CardHeader className="pb-4 border-b text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold">Corte 2 - Comisión + Penalidad 1 + Clawback 1</CardTitle>
                        <CardDescription className="text-blue-100 mt-1">
                            {data.length} agencias • Periodo {periodo}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                        <Badge className="bg-white/20 text-white border-white/40 text-sm py-1">
                            Total C2: S/ {totalPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </Badge>
                        <Badge className="bg-red-500/80 text-white text-sm py-1">
                            Penalidades: S/ {totalPenalidad.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
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
                        <TableHeader className="sticky top-0 bg-gradient-to-r from-blue-100 to-sky-100 dark:from-slate-800 dark:to-slate-700 z-10">
                            <TableRow>
                                <TableHead className="px-2 py-2"><SortButton columnKey="ruc">RUC</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="agencia">AGENCIA</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="altas">ALTAS</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="primer_recibo_pagado">1er REC.</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="recibos_no_pagados_corte_2">NO PAG.</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="comision_total">COM. TOTAL</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="pago_corte_1">PAGO C1</SortButton></TableHead>
                                <TableHead className="px-2 py-2"><SortButton columnKey="total_a_pagar_corte_2">TOTAL C2</SortButton></TableHead>
                                <TableHead className="px-2 py-2 bg-red-50 dark:bg-red-900/20"><SortButton columnKey="penalidad_1_altas_penalizadas">P1 ALTAS</SortButton></TableHead>
                                <TableHead className="px-2 py-2 bg-red-50 dark:bg-red-900/20"><SortButton columnKey="penalidad_1_monto">P1 MONTO</SortButton></TableHead>
                                <TableHead className="px-2 py-2 bg-purple-50 dark:bg-purple-900/20"><SortButton columnKey="clawback_1_monto">CB1 MONTO</SortButton></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                        No hay datos para este periodo y zona.
                                    </TableCell>
                                </TableRow>
                            )}
                            {sortedData.map((row, index) => (
                                <TableRow key={row.id} className={index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-blue-50/50 dark:bg-slate-800/50'}>
                                    <TableCell className="px-2 py-2 font-mono">{row.ruc}</TableCell>
                                    <TableCell className="px-2 py-2 max-w-[120px] truncate" title={row.agencia}>{row.agencia}</TableCell>
                                    <TableCell className="px-2 py-2 text-center font-bold text-blue-600">{row.altas}</TableCell>
                                    <TableCell className="px-2 py-2 text-center text-green-600 font-semibold">{row.primer_recibo_pagado}</TableCell>
                                    <TableCell className="px-2 py-2 text-center text-red-600 font-semibold">{row.recibos_no_pagados_corte_2}</TableCell>
                                    <TableCell className="px-2 py-2 text-right font-mono">S/ {(row.comision_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="px-2 py-2 text-right font-mono">S/ {(row.pago_corte_1 || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="px-2 py-2 text-right font-mono font-bold text-blue-600">S/ {(row.total_a_pagar_corte_2 || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="px-2 py-2 text-center bg-red-50/50 dark:bg-red-900/10 font-semibold">{row.penalidad_1_altas_penalizadas}</TableCell>
                                    <TableCell className="px-2 py-2 text-right bg-red-50/50 dark:bg-red-900/10 font-mono text-red-600">S/ {(row.penalidad_1_monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="px-2 py-2 text-right bg-purple-50/50 dark:bg-purple-900/10 font-mono text-purple-600">S/ {(row.clawback_1_monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter className="sticky bottom-0 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                            <TableRow className="font-bold">
                                <TableCell colSpan={7}>TOTALES</TableCell>
                                <TableCell className="text-right font-mono text-blue-600">S/ {totalPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right font-mono text-red-600">S/ {totalPenalidad.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-right font-mono text-purple-600">S/ {totalClawback.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

