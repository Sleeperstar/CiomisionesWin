"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { SalesRecord } from '@/lib/schemas';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const monthMap: { [key: string]: number } = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};

// Define the structure for our aggregated data
interface AggregatedResult {
    RUC: string | null;
    AGENCIA: string | null;
    META: number;
    TOP: string | null;
    ALTAS: number;
    PRECIO_SIN_IGV: number;
}

// Define types for processing
interface PartialSalesRecord {
    DNI_ASESOR: string | null;
    ASESOR: string | null;
    COD_PEDIDO: number | null; // Corrected type from string to number
    PRECIO_CON_IGV_EXTERNO: number | null;
}

interface GroupedResult {
    RUC: string | null;
    AGENCIA: string | null;
    pedidos: (number | null)[]; // Corrected type for the pedidos array
    preciosSinIgv: number[];
}

export default function ResultadoComision({ corte, zona, mes }: { corte: string; zona: string; mes: string }) {
    const [aggregatedData, setAggregatedData] = useState<AggregatedResult[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [sortConfig, setSortConfig] = useState<{ key: keyof AggregatedResult; direction: 'ascending' | 'descending' } | null>(null);
    const [totals, setTotals] = useState<{ totalAltas: number; totalMeta: number; avgPrecio: number } | null>(null);

    const sortedData = useMemo(() => {
        let sortableItems = [...aggregatedData];
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
    }, [aggregatedData, sortConfig]);

    const requestSort = (key: keyof AggregatedResult) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    useEffect(() => {
        const fetchAndProcessData = async () => {
            setAggregatedData([]);
            setTotals(null);
            setLoading(true);

            const monthNumber = monthMap[mes];
            if (!monthNumber) {
                toast({ title: "Error", description: "Mes inválido seleccionado.", variant: "destructive" });
                setLoading(false);
                return;
            }

            const year = 2025;
            const startDate = `${year}-${String(monthNumber).padStart(2, '0')}-01`;
            const nextMonthDate = new Date(year, monthNumber, 1);
            const endDate = nextMonthDate.toISOString().split('T')[0];
            const periodo = `${year}${String(monthNumber).padStart(2, '0')}`;

            let query = supabase
                .from('SalesRecord')
                .select('*', { count: 'exact' }) // Match base-calculo to fetch all data
                .not('FECHA_VALIDACION', 'is', null)
                .gte('FECHA_INSTALADO', startDate)
                .lt('FECHA_INSTALADO', endDate);

            if (zona === 'lima') {
                query = query.eq('CANAL', 'Agencias');
            }
            
                        // Fetch parameters data
            const fetchParamsData = async () => {
                const { data, error } = await supabase
                    .from('Parametros')
                    .select('RUC, META, TOP')
                    .eq('ZONA', zona.toUpperCase())
                    .eq('PERIODO', periodo);

                if (error) throw new Error(`Error fetching parameters: ${error.message}`);
                return data || [];
            };

            const fetchAllPaginatedData = async () => {
                let allRecords: (Partial<SalesRecord>)[] = [];
                let page = 0;
                const pageSize = 1000;
                let totalCount = 0;

                while (true) {
                    const from = page * pageSize;
                    const to = from + pageSize - 1;

                    const { data, error, count } = await query.range(from, to);

                    if (error) throw error;
                    if (data) allRecords = allRecords.concat(data);
                    if (page === 0 && count) totalCount = count;

                    if (!data || data.length < pageSize || (totalCount > 0 && allRecords.length >= totalCount)) {
                        break;
                    }
                    
                    page++;
                }
                return { data: allRecords, count: totalCount };
            };

                        try {
                // Fetch both datasets in parallel
                const [salesData, paramsData] = await Promise.all([
                    fetchAllPaginatedData(),
                    fetchParamsData(),
                ]);

                const { data: records, count } = salesData;
                console.log(`[Resultado Comision] Successfully fetched all ${records.length} of ${count} sales records.`);
                console.log(`[Resultado Comision] Successfully fetched ${paramsData.length} parameter records.`);

                // Create a map for quick lookup of parameters by RUC
                const paramsMap = new Map(paramsData.map(p => [p.RUC, { META: p.META, TOP: p.TOP }]));

                // Pivot table logic with explicit types
                const groupedData = (records as PartialSalesRecord[]).reduce((acc: { [key: string]: GroupedResult }, record) => {
                    const key = `${record.DNI_ASESOR}-${record.ASESOR}`;
                    if (!acc[key]) {
                        acc[key] = {
                            RUC: record.DNI_ASESOR,
                            AGENCIA: record.ASESOR,
                            pedidos: [],
                            preciosSinIgv: []
                        };
                    }
                    acc[key].pedidos.push(record.COD_PEDIDO);
                    if (record.PRECIO_CON_IGV_EXTERNO) {
                        acc[key].preciosSinIgv.push(record.PRECIO_CON_IGV_EXTERNO / 1.18);
                    }
                    return acc;
                }, {});

                                const finalResult: AggregatedResult[] = Object.values(groupedData).map((group: GroupedResult) => {
                    const params = paramsMap.get(group.RUC) || { META: 0, TOP: 'N/A' };
                    const totalPrecios = group.preciosSinIgv.reduce((sum, p) => sum + p, 0);
                    const avgPrecio = group.preciosSinIgv.length > 0 ? totalPrecios / group.preciosSinIgv.length : 0;
                    
                                        return {
                        RUC: group.RUC,
                        AGENCIA: group.AGENCIA,
                        META: params.META,
                        TOP: params.TOP,
                        ALTAS: group.pedidos.length,
                        PRECIO_SIN_IGV: avgPrecio
                    };
                });

                                setAggregatedData(finalResult);

                                const totalAltas = finalResult.reduce((sum, row) => sum + row.ALTAS, 0);
                const totalMeta = finalResult.reduce((sum, row) => sum + row.META, 0);
                const allPreciosSinIgv = Object.values(groupedData).flatMap(g => g.preciosSinIgv);
                const totalSumPrecios = allPreciosSinIgv.reduce((sum, p) => sum + p, 0);
                const avgPrecio = allPreciosSinIgv.length > 0 ? totalSumPrecios / allPreciosSinIgv.length : 0;
                setTotals({ totalAltas, totalMeta, avgPrecio });

            } catch (error: any) {
                console.error(`Error fetching paginated SalesRecord:`, error);
                toast({ title: "Error", description: `No se pudieron cargar los registros: ${error.message}`, variant: "destructive" });
            }
            
            setLoading(false);
        };

        fetchAndProcessData();
    }, [corte, zona, mes, toast]);


    if (loading) {
        return <div className="flex justify-center items-center h-64"><Icons.Spinner className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Resultado de Comisiones</CardTitle>
                <CardDescription>
                    Resultados finales agregados por agencia.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="whitespace-nowrap rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <Button variant="ghost" onClick={() => requestSort('RUC')}>
                                        RUC
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                                                <TableHead>
                                    <Button variant="ghost" onClick={() => requestSort('AGENCIA')}>
                                        AGENCIA
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                     <Button variant="ghost" onClick={() => requestSort('META')}>
                                        META
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                                                <TableHead>
                                     <Button variant="ghost" onClick={() => requestSort('TOP')}>
                                        TOP
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button variant="ghost" onClick={() => requestSort('ALTAS')}>
                                        ALTAS
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button variant="ghost" onClick={() => requestSort('PRECIO_SIN_IGV')}>
                                        PRECIO SIN IGV (Promedio)
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedData.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell>{row.RUC}</TableCell>
                                                                         <TableCell>{row.AGENCIA}</TableCell>
                                     <TableCell>{row.META}</TableCell>
                                                                          <TableCell>{row.TOP}</TableCell>
                                    <TableCell>{row.ALTAS}</TableCell>
                                    <TableCell>{row.PRECIO_SIN_IGV.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                                                <TableFooter>
                            <TableRow>
                                <TableCell colSpan={2} className="font-bold text-right">TOTALES</TableCell>
                                <TableCell className="font-bold">{totals?.totalMeta}</TableCell>
                                                                <TableCell></TableCell> {/* Empty cell for TOP */}
                                <TableCell className="font-bold">{totals?.totalAltas}</TableCell>
                                <TableCell className="font-bold">{totals?.avgPrecio.toFixed(2)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
