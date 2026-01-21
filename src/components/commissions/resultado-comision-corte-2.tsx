"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const monthMap: { [key: string]: number } = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};

// Estructura para los datos del Corte 2
interface ComisionCorte2 {
    // Validación
    altas_corte_1_guardado: number | null;
    corte_1_guardado: number | null;
    altas_actual: number | null;
    corte_1_actual: number | null;
    validacion_ok: boolean;
    
    // Identificación
    ruc: string | null;
    agencia: string | null;
    
    // Datos base
    meta: number | null;
    top: string | null;
    altas: number;
    precio_sin_igv_promedio: number;
    
    // Cortes
    corte_1: number;
    corte_2: number;
    corte_3: number;
    corte_4: number;
    
    // Cálculos Corte 2
    primer_recibo_pagado: number;
    recibos_no_pagados_corte_2: number;
    
    // Cumplimiento
    porcentaje_cumplimiento: number | null;
    marcha_blanca: string;
    bono_arpu: string;
    
    // Multiplicadores
    factor_multiplicador: number;
    multiplicador_final: number;
    
    // Comisiones
    comision_total: number;
    pago_corte_1: number;
    total_a_pagar_corte_2: number;
    
    // Penalidad 1
    penalidad_1_churn_4_5_pct: number;
    penalidad_1_umbral: number;
    penalidad_1_altas_penalizadas: number;
    penalidad_1_monto: number;
    
    // Clawback 1
    clawback_1_umbral_corte_2: number;
    clawback_1_cumplimiento_pct: number;
    clawback_1_multiplicador: number;
    clawback_1_monto: number;
}

// Interfaz para los totales
interface Totals {
    totalAltas: number;
    totalPrimerReciboPagado: number;
    totalRecibosNoPagados: number;
    totalComision: number;
    totalPagoCorte1: number;
    totalPagarCorte2: number;
    totalPenalidad1: number;
    totalClawback1: number;
    agenciasConError: number;
}

export default function ResultadoComisionCorte2({ zona, mes, year = '2025' }: { zona: string; mes: string; year?: string }) {
    const [data, setData] = useState<ComisionCorte2[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const [sortConfig, setSortConfig] = useState<{ key: keyof ComisionCorte2; direction: 'ascending' | 'descending' } | null>(null);
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

    const requestSort = (key: keyof ComisionCorte2) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Función para guardar resultados en Supabase
    const handleSaveResults = async () => {
        if (data.length === 0) {
            toast({
                title: "Sin datos",
                description: "No hay datos para guardar.",
                variant: "destructive"
            });
            return;
        }

        // Verificar si hay errores de validación
        const agenciasConError = data.filter(row => !row.validacion_ok);
        if (agenciasConError.length > 0) {
            toast({
                title: "⚠️ Advertencia",
                description: `Hay ${agenciasConError.length} agencias con discrepancias. ¿Desea continuar?`,
                variant: "destructive"
            });
            // Por ahora permitimos guardar con advertencia
        }

        setSaving(true);

        try {
            const monthNumber = monthMap[mes];
            const yearNumber = parseInt(year, 10);
            const periodo = (yearNumber * 100) + monthNumber;

            // Preparar datos para inserción en tabla resultado_comisiones_corte_2
            const dataToSave = data.map(row => ({
                periodo,
                zona: zona.toUpperCase(),
                ruc: row.ruc || '',
                agencia: row.agencia || '',
                meta: row.meta,
                top: row.top || 'REGULAR',
                altas: row.altas,
                precio_sin_igv_promedio: row.precio_sin_igv_promedio,
                corte_1: row.corte_1,
                corte_2: row.corte_2,
                corte_3: row.corte_3,
                corte_4: row.corte_4,
                primer_recibo_pagado: row.primer_recibo_pagado,
                recibos_no_pagados_corte_2: row.recibos_no_pagados_corte_2,
                porcentaje_cumplimiento: row.porcentaje_cumplimiento,
                marcha_blanca: row.marcha_blanca,
                bono_arpu: row.bono_arpu,
                factor_multiplicador: row.factor_multiplicador,
                multiplicador_final: row.multiplicador_final,
                comision_total: row.comision_total,
                pago_corte_1: row.pago_corte_1,
                total_a_pagar_corte_2: row.total_a_pagar_corte_2,
                penalidad_1_churn_4_5_pct: row.penalidad_1_churn_4_5_pct,
                penalidad_1_umbral: row.penalidad_1_umbral,
                penalidad_1_altas_penalizadas: row.penalidad_1_altas_penalizadas,
                penalidad_1_monto: row.penalidad_1_monto,
                clawback_1_umbral_corte_2: row.clawback_1_umbral_corte_2,
                clawback_1_cumplimiento_pct: row.clawback_1_cumplimiento_pct,
                clawback_1_multiplicador: row.clawback_1_multiplicador,
                clawback_1_monto: row.clawback_1_monto
            }));

            // Insertar o actualizar (upsert) en tabla de Corte 2
            const { error } = await supabase
                .from('resultado_comisiones_corte_2')
                .upsert(dataToSave, {
                    onConflict: 'periodo,zona,ruc',
                    ignoreDuplicates: false
                });

            if (error) {
                throw new Error(`Error al guardar: ${error.message}`);
            }

            toast({
                title: "✅ Resultados guardados",
                description: `Se guardaron ${dataToSave.length} registros para ${mes.toUpperCase()} ${year} - Corte 2 - ${zona.toUpperCase()}`,
                duration: 5000
            });

            console.log(`[Resultado Comision Corte 2] ✅ Guardados ${dataToSave.length} registros`);

        } catch (error: unknown) {
            console.error(`Error guardando resultados:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            toast({
                title: "❌ Error al guardar",
                description: errorMessage,
                variant: "destructive"
            });
        }

        setSaving(false);
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const monthNumber = monthMap[mes];
            const yearNumber = parseInt(year, 10);

            console.log(`[Corte 2] Fetching data for zona=${zona}, mes=${monthNumber}, year=${yearNumber}`);

            try {
                // Llamar a la función RPC para Corte 2
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_comisiones_corte_2', {
                    p_zona: zona,
                    p_mes: monthNumber,
                    p_year: yearNumber
                });

                if (rpcError) {
                    throw new Error(`Error RPC: ${rpcError.message}`);
                }

                console.log(`[Corte 2] Received ${rpcData?.length || 0} rows from RPC`);

                const processedData: ComisionCorte2[] = (rpcData || []).map((row: ComisionCorte2) => ({
                    // Validación
                    altas_corte_1_guardado: Number(row.altas_corte_1_guardado) || 0,
                    corte_1_guardado: Number(row.corte_1_guardado) || 0,
                    altas_actual: Number(row.altas_actual) || 0,
                    corte_1_actual: Number(row.corte_1_actual) || 0,
                    validacion_ok: row.validacion_ok,
                    
                    // Identificación
                    ruc: row.ruc,
                    agencia: row.agencia,
                    
                    // Datos base
                    meta: row.meta,
                    top: row.top || 'REGULAR',
                    altas: Number(row.altas) || 0,
                    precio_sin_igv_promedio: Number(row.precio_sin_igv_promedio) || 0,
                    
                    // Cortes
                    corte_1: Number(row.corte_1) || 0,
                    corte_2: Number(row.corte_2) || 0,
                    corte_3: Number(row.corte_3) || 0,
                    corte_4: Number(row.corte_4) || 0,
                    
                    // Cálculos Corte 2
                    primer_recibo_pagado: Number(row.primer_recibo_pagado) || 0,
                    recibos_no_pagados_corte_2: Number(row.recibos_no_pagados_corte_2) || 0,
                    
                    // Cumplimiento
                    porcentaje_cumplimiento: row.porcentaje_cumplimiento,
                    marcha_blanca: row.marcha_blanca || 'No',
                    bono_arpu: row.bono_arpu || 'No',
                    
                    // Multiplicadores
                    factor_multiplicador: Number(row.factor_multiplicador) || 1.3,
                    multiplicador_final: Number(row.multiplicador_final) || 1.3,
                    
                    // Comisiones
                    comision_total: Number(row.comision_total) || 0,
                    pago_corte_1: Number(row.pago_corte_1) || 0,
                    total_a_pagar_corte_2: Number(row.total_a_pagar_corte_2) || 0,
                    
                    // Penalidad 1
                    penalidad_1_churn_4_5_pct: Number(row.penalidad_1_churn_4_5_pct) || 0,
                    penalidad_1_umbral: Number(row.penalidad_1_umbral) || 0,
                    penalidad_1_altas_penalizadas: Number(row.penalidad_1_altas_penalizadas) || 0,
                    penalidad_1_monto: Number(row.penalidad_1_monto) || 0,
                    
                    // Clawback 1
                    clawback_1_umbral_corte_2: Number(row.clawback_1_umbral_corte_2) || 0,
                    clawback_1_cumplimiento_pct: Number(row.clawback_1_cumplimiento_pct) || 0,
                    clawback_1_multiplicador: Number(row.clawback_1_multiplicador) || 1.3,
                    clawback_1_monto: Number(row.clawback_1_monto) || 0
                }));

                setData(processedData);

                // Calcular totales
                const calculatedTotals: Totals = {
                    totalAltas: processedData.reduce((sum, r) => sum + r.altas, 0),
                    totalPrimerReciboPagado: processedData.reduce((sum, r) => sum + r.primer_recibo_pagado, 0),
                    totalRecibosNoPagados: processedData.reduce((sum, r) => sum + r.recibos_no_pagados_corte_2, 0),
                    totalComision: processedData.reduce((sum, r) => sum + r.comision_total, 0),
                    totalPagoCorte1: processedData.reduce((sum, r) => sum + r.pago_corte_1, 0),
                    totalPagarCorte2: processedData.reduce((sum, r) => sum + r.total_a_pagar_corte_2, 0),
                    totalPenalidad1: processedData.reduce((sum, r) => sum + r.penalidad_1_monto, 0),
                    totalClawback1: processedData.reduce((sum, r) => sum + r.clawback_1_monto, 0),
                    agenciasConError: processedData.filter(r => !r.validacion_ok).length
                };

                setTotals(calculatedTotals);

            } catch (error: unknown) {
                console.error(`[Corte 2] Error:`, error);
                const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                toast({
                    title: "Error",
                    description: `Error al cargar datos: ${errorMessage}`,
                    variant: "destructive"
                });
            }

            setLoading(false);
        };

        fetchData();
    }, [zona, mes, year, toast]);

    // Componente para los botones de ordenación
    const SortButton = ({ columnKey, children }: { columnKey: keyof ComisionCorte2; children: React.ReactNode }) => (
        <Button
            variant="ghost"
            onClick={() => requestSort(columnKey)}
            className="h-7 px-2 hover:bg-orange-200 dark:hover:bg-slate-600 font-semibold text-xs"
        >
            {children}
            <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
    );

    if (loading) {
        return (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/30 dark:from-slate-900 dark:to-slate-800">
                <CardContent className="flex items-center justify-center py-20">
                    <Icons.Spinner className="h-8 w-8 animate-spin text-[#f53c00]" />
                    <span className="ml-3 text-lg">Calculando Corte 2...</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Panel de Validación */}
            {totals && totals.agenciasConError > 0 && (
                <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>⚠️ Discrepancias Detectadas</AlertTitle>
                    <AlertDescription>
                        Hay <strong>{totals.agenciasConError}</strong> agencia(s) con diferencias entre los datos 
                        guardados del Corte 1 y los datos actuales. Revise la columna "VALID." para más detalles.
                    </AlertDescription>
                </Alert>
            )}

            {totals && totals.agenciasConError === 0 && data.length > 0 && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-700">✅ Validación Correcta</AlertTitle>
                    <AlertDescription className="text-green-600">
                        Todos los datos coinciden con el Corte 1 guardado.
                    </AlertDescription>
                </Alert>
            )}

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/30 dark:from-slate-900 dark:to-slate-800 overflow-clip">
                <CardHeader className="pb-4 border-b text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #f53c00 0%, #ff8300 50%, #ffa700 100%)' }}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold tracking-tight">
                                Resultado de Comisiones - Corte 2
                            </CardTitle>
                            <CardDescription className="text-orange-100 mt-1">
                                {data.length} agencias • {mes.charAt(0).toUpperCase() + mes.slice(1)} {year} • {zona.charAt(0).toUpperCase() + zona.slice(1)}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            {totals && (
                                <>
                                    <Badge className="bg-white/20 text-white border-white/40 text-sm py-1">
                                        Total Comisión: S/ {totals.totalComision.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </Badge>
                                    <Badge className="bg-white/20 text-white border-white/40 text-sm py-1">
                                        Total Corte 2: S/ {totals.totalPagarCorte2.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </Badge>
                                    <Badge className="bg-red-500/80 text-white text-sm py-1">
                                        Penalidades: S/ {totals.totalPenalidad1.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </Badge>
                                </>
                            )}
                            <Button
                                onClick={handleSaveResults}
                                disabled={saving || data.length === 0}
                                className="bg-white/25 text-white border-white/40 hover:bg-white/40"
                            >
                                {saving ? <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Resultados
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 relative overflow-clip">
                    <div className="overflow-auto max-h-[600px] max-w-full relative">
                        <Table className="relative text-xs">
                            <TableHeader className="sticky top-0 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-slate-800 dark:to-slate-700 z-10">
                                <TableRow className="hover:bg-orange-100 dark:hover:bg-slate-800">
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#f53c00] w-[60px]">
                                        <SortButton columnKey="validacion_ok">VALID.</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ff8300]">
                                        <SortButton columnKey="ruc">RUC</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ffa700]">
                                        <SortButton columnKey="agencia">AGENCIA</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#f53c00]">
                                        <SortButton columnKey="meta">META</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ff8300]">
                                        <SortButton columnKey="altas">ALTAS</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ffa700]">
                                        <SortButton columnKey="corte_1">C1</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#f53c00]">
                                        <SortButton columnKey="corte_2">C2</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ff8300]">
                                        <SortButton columnKey="primer_recibo_pagado">1er REC.</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ffa700]">
                                        <SortButton columnKey="recibos_no_pagados_corte_2">NO PAG.</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#f53c00]">
                                        <SortButton columnKey="multiplicador_final">MULT.</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ff8300]">
                                        <SortButton columnKey="comision_total">COM. TOTAL</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#ffa700]">
                                        <SortButton columnKey="pago_corte_1">PAGO C1</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-[#f53c00]">
                                        <SortButton columnKey="total_a_pagar_corte_2">TOTAL C2</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20">
                                        <SortButton columnKey="penalidad_1_churn_4_5_pct">P1 CHURN</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20">
                                        <SortButton columnKey="penalidad_1_umbral">P1 UMB.</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20">
                                        <SortButton columnKey="penalidad_1_altas_penalizadas">P1 ALTAS</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20">
                                        <SortButton columnKey="penalidad_1_monto">P1 MONTO</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20">
                                        <SortButton columnKey="clawback_1_umbral_corte_2">CB1 UMB.</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20">
                                        <SortButton columnKey="clawback_1_cumplimiento_pct">CB1 %</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20">
                                        <SortButton columnKey="clawback_1_multiplicador">CB1 MULT.</SortButton>
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap px-2 py-2 border-b-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20">
                                        <SortButton columnKey="clawback_1_monto">CB1 MONTO</SortButton>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={21} className="text-center py-8 text-muted-foreground">
                                            No hay datos. Asegúrese de haber guardado el Corte 1 primero.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {sortedData.map((row, index) => (
                                    <TableRow 
                                        key={row.ruc || index} 
                                        className={`
                                            ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-orange-50/50 dark:bg-slate-800/50'}
                                            hover:bg-orange-100 dark:hover:bg-slate-700
                                            ${!row.validacion_ok ? 'bg-red-50 dark:bg-red-900/20' : ''}
                                        `}
                                    >
                                        {/* Validación */}
                                        <TableCell className="px-2 py-2 text-center">
                                            {row.validacion_ok ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                            ) : (
                                                <AlertTriangle className="h-4 w-4 text-red-600 mx-auto" />
                                            )}
                                        </TableCell>
                                        
                                        {/* Identificación */}
                                        <TableCell className="px-2 py-2 font-mono">{row.ruc}</TableCell>
                                        <TableCell className="px-2 py-2 font-medium max-w-[150px] truncate" title={row.agencia || ''}>
                                            {row.agencia}
                                        </TableCell>
                                        
                                        {/* Meta */}
                                        <TableCell className="px-2 py-2 text-center">
                                            {row.meta !== null ? row.meta : '-'}
                                        </TableCell>
                                        
                                        {/* Altas */}
                                        <TableCell className="px-2 py-2 text-center font-bold text-[#f53c00]">
                                            {row.altas}
                                        </TableCell>
                                        
                                        {/* Cortes */}
                                        <TableCell className="px-2 py-2 text-center">{row.corte_1}</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{row.corte_2}</TableCell>
                                        
                                        {/* Primer Recibo Pagado */}
                                        <TableCell className="px-2 py-2 text-center font-semibold text-green-600">
                                            {row.primer_recibo_pagado}
                                        </TableCell>
                                        
                                        {/* Recibos No Pagados */}
                                        <TableCell className="px-2 py-2 text-center font-semibold text-red-600">
                                            {row.recibos_no_pagados_corte_2}
                                        </TableCell>
                                        
                                        {/* Multiplicador */}
                                        <TableCell className="px-2 py-2 text-center font-bold text-[#ff8300]">
                                            x{row.multiplicador_final.toFixed(1)}
                                        </TableCell>
                                        
                                        {/* Comisiones */}
                                        <TableCell className="px-2 py-2 text-right font-mono">
                                            S/ {row.comision_total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-right font-mono">
                                            S/ {row.pago_corte_1.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-right font-mono font-bold text-[#f53c00]">
                                            S/ {row.total_a_pagar_corte_2.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        
                                        {/* Penalidad 1 */}
                                        <TableCell className="px-2 py-2 text-center bg-red-50/50 dark:bg-red-900/10">
                                            {row.penalidad_1_churn_4_5_pct}
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-center bg-red-50/50 dark:bg-red-900/10">
                                            {row.penalidad_1_umbral}
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-center bg-red-50/50 dark:bg-red-900/10 font-semibold">
                                            {row.penalidad_1_altas_penalizadas}
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-right bg-red-50/50 dark:bg-red-900/10 font-mono text-red-600">
                                            S/ {row.penalidad_1_monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        
                                        {/* Clawback 1 */}
                                        <TableCell className="px-2 py-2 text-center bg-purple-50/50 dark:bg-purple-900/10">
                                            {row.clawback_1_umbral_corte_2}
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-center bg-purple-50/50 dark:bg-purple-900/10">
                                            {row.clawback_1_cumplimiento_pct.toFixed(1)}%
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-center bg-purple-50/50 dark:bg-purple-900/10">
                                            x{row.clawback_1_multiplicador.toFixed(1)}
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-right bg-purple-50/50 dark:bg-purple-900/10 font-mono text-purple-600">
                                            S/ {row.clawback_1_monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter className="sticky bottom-0 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                                <TableRow className="font-bold">
                                    <TableCell className="px-2 py-2" colSpan={4}>TOTALES</TableCell>
                                    <TableCell className="px-2 py-2 text-center text-[#f53c00]">{totals?.totalAltas || 0}</TableCell>
                                    <TableCell className="px-2 py-2" colSpan={2}></TableCell>
                                    <TableCell className="px-2 py-2 text-center text-green-600">{totals?.totalPrimerReciboPagado || 0}</TableCell>
                                    <TableCell className="px-2 py-2 text-center text-red-600">{totals?.totalRecibosNoPagados || 0}</TableCell>
                                    <TableCell className="px-2 py-2"></TableCell>
                                    <TableCell className="px-2 py-2 text-right font-mono">
                                        S/ {(totals?.totalComision || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="px-2 py-2 text-right font-mono">
                                        S/ {(totals?.totalPagoCorte1 || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="px-2 py-2 text-right font-mono text-[#f53c00]">
                                        S/ {(totals?.totalPagarCorte2 || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="px-2 py-2" colSpan={3}></TableCell>
                                    <TableCell className="px-2 py-2 text-right font-mono text-red-600">
                                        S/ {(totals?.totalPenalidad1 || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="px-2 py-2" colSpan={3}></TableCell>
                                    <TableCell className="px-2 py-2 text-right font-mono text-purple-600">
                                        S/ {(totals?.totalClawback1 || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

