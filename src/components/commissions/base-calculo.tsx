"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { SalesRecord } from '@/lib/schemas';
import { Badge } from "@/components/ui/badge";

const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return dateString;
    }
};

const monthMap: { [key: string]: number } = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};

// Límite de muestra para mostrar en la tabla (evita timeouts)
const SAMPLE_LIMIT = 100;

export default function BaseCalculo({ corte, zona, mes, year = '2025' }: { corte: string; zona: string; mes: string; year?: string }) {
    const [records, setRecords] = useState<SalesRecord[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAndFilterData = async () => {
            setLoading(true);
            setRecords([]);
            setTotalCount(0);

            const monthNumber = monthMap[mes];
            if (!monthNumber) {
                toast({ title: "Error", description: "Mes inválido seleccionado.", variant: "destructive" });
                setLoading(false);
                return;
            }

            const yearNumber = parseInt(year, 10);
            const startDate = `${yearNumber}-${String(monthNumber).padStart(2, '0')}-01`;
            const nextMonthDate = new Date(yearNumber, monthNumber, 1);
            const endDate = nextMonthDate.toISOString().split('T')[0];

            // Construir los filtros base
            const buildBaseQuery = () => {
                let query = supabase
                    .from('SalesRecord')
                    .select('*', { count: 'exact', head: false })
                    .not('FECHA_VALIDACION', 'is', null)
                    .gte('FECHA_INSTALADO', startDate)
                    .lt('FECHA_INSTALADO', endDate);

                if (zona === 'lima') {
                    query = query.eq('CANAL', 'Agencias');
                }
                return query;
            };

            try {
                // Consulta 1: Solo obtener el conteo total (rápida, sin traer datos)
                const countQuery = supabase
                    .from('SalesRecord')
                    .select('*', { count: 'exact', head: true })
                    .not('FECHA_VALIDACION', 'is', null)
                    .gte('FECHA_INSTALADO', startDate)
                    .lt('FECHA_INSTALADO', endDate);

                if (zona === 'lima') {
                    countQuery.eq('CANAL', 'Agencias');
                }

                // Consulta 2: Obtener solo una muestra de datos para mostrar
                const sampleQuery = buildBaseQuery().limit(SAMPLE_LIMIT);

                // Ejecutar ambas consultas en paralelo
                const [countResult, sampleResult] = await Promise.all([
                    countQuery,
                    sampleQuery
                ]);

                if (countResult.error) {
                    throw new Error(`Error al contar registros: ${countResult.error.message}`);
                }

                if (sampleResult.error) {
                    throw new Error(`Error al obtener muestra: ${sampleResult.error.message}`);
                }

                setTotalCount(countResult.count || 0);
                setRecords(sampleResult.data || []);

            } catch (error: any) {
                console.error(`Error fetching SalesRecord:`, error);
                toast({ 
                    title: "Error", 
                    description: error.message || "No se pudieron cargar los registros de ventas", 
                    variant: "destructive" 
                });
                setRecords([]);
                setTotalCount(0);
            }
            
            setLoading(false);
        };

        fetchAndFilterData();
    }, [corte, zona, mes, year, toast]);


    if (loading) {
        return (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-900 dark:to-slate-800">
                <div className="flex justify-center items-center h-64">
                    <div className="flex flex-col items-center gap-3">
                        <Icons.Spinner className="h-10 w-10 animate-spin text-[#f53c00]" />
                        <p className="text-sm text-muted-foreground animate-pulse">Cargando datos...</p>
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
                        <CardTitle className="text-xl font-bold tracking-tight">Base de Cálculo Filtrada</CardTitle>
                        <CardDescription className="text-orange-100 mt-1">
                            Vista previa de los registros que cumplen los filtros aplicados
                        </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="bg-white/25 text-white border-white/40 text-lg px-4 py-2 font-bold shadow-sm">
                            {totalCount.toLocaleString('es-PE')} registros
                        </Badge>
                        {totalCount > SAMPLE_LIMIT && (
                            <span className="text-xs text-orange-100">
                                Mostrando {SAMPLE_LIMIT} de {totalCount.toLocaleString('es-PE')}
                            </span>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 relative">
                <div className="overflow-auto max-h-[500px] max-w-full">
                    <Table className="relative">
                        <TableHeader className="sticky top-0 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-slate-800 dark:to-slate-700">
                            <TableRow className="hover:bg-orange-100 dark:hover:bg-slate-800">
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-4 py-3 border-b-2 border-[#f53c00]">COD_PEDIDO</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-4 py-3 border-b-2 border-[#f53c00]">DNI_CLIENTE</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-4 py-3 border-b-2 border-[#ff8300]">FECHA_VENTA</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-4 py-3 border-b-2 border-[#ff8300]">FECHA_VALIDACION</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-4 py-3 border-b-2 border-[#ffa700]">FECHA_INSTALADO</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-4 py-3 border-b-2 border-[#ffa700]">OFERTA</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-4 py-3 border-b-2 border-[#f53c00]">TIPO_VENTA</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-4 py-3 border-b-2 border-[#f53c00]">ASESOR</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-4 py-3 border-b-2 border-[#ff8300]">CANAL</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap px-4 py-3 border-b-2 border-[#ffa700]">TIPO_ESTADO</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg className="h-12 w-12 text-orange-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span>No se encontraron registros con los filtros seleccionados</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                records.map((row, index) => (
                                    <TableRow 
                                        key={row.COD_PEDIDO} 
                                        className={`
                                            transition-colors duration-150
                                            ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-orange-50/40 dark:bg-slate-800/50'}
                                            hover:bg-orange-100/60 dark:hover:bg-orange-900/20
                                        `}
                                    >
                                        <TableCell className="font-mono text-sm px-4 py-3 whitespace-nowrap">{row.COD_PEDIDO}</TableCell>
                                        <TableCell className="font-mono text-sm px-4 py-3 whitespace-nowrap">{row.DNI_CLIENTE}</TableCell>
                                        <TableCell className="text-sm px-4 py-3 whitespace-nowrap">{formatDate(row.FECHA_VENTA)}</TableCell>
                                        <TableCell className="text-sm px-4 py-3 whitespace-nowrap">{formatDate(row.FECHA_VALIDACION)}</TableCell>
                                        <TableCell className="text-sm px-4 py-3 whitespace-nowrap">{formatDate(row.FECHA_INSTALADO)}</TableCell>
                                        <TableCell className="text-sm px-4 py-3 whitespace-nowrap max-w-[200px] truncate" title={row.OFERTA || ''}>
                                            {row.OFERTA}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                            <Badge variant="outline" className="text-xs border-[#ff8300] text-[#f53c00]">
                                                {row.TIPO_VENTA}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm px-4 py-3 whitespace-nowrap max-w-[180px] truncate" title={row.ASESOR || ''}>
                                            {row.ASESOR}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                            <Badge 
                                                variant="secondary" 
                                                className={`text-xs ${
                                                    row.CANAL === 'Agencias' 
                                                        ? 'bg-[#ffa700]/20 text-[#f53c00] border border-[#ffa700]/40' 
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                {row.CANAL}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                            <Badge 
                                                variant="secondary"
                                                className={`text-xs ${
                                                    row.TIPO_ESTADO === 'INSTALADO' 
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                {row.TIPO_ESTADO}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
} 