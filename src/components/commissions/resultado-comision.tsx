"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    ALTAS: number;
    PRECIO_SIN_IGV: number;
}

// Define types for processing
interface PartialSalesRecord {
    DNI_ASESOR: string | null;
    ASESOR: string | null;
    COD_PEDIDO: string | null;
    PRECIO_CON_IGV_EXTERNO: number | null;
}

interface GroupedResult {
    RUC: string | null;
    AGENCIA: string | null;
    pedidos: (string | null)[];
    preciosSinIgv: number[];
}

export default function ResultadoComision({ corte, zona, mes }: { corte: string; zona: string; mes: string }) {
    const [aggregatedData, setAggregatedData] = useState<AggregatedResult[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAndProcessData = async () => {
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

            let query = supabase
                .from('SalesRecord')
                .select('DNI_ASESOR, ASESOR, COD_PEDIDO, PRECIO_CON_IGV_EXTERNO, CANAL, FECHA_VALIDACION, FECHA_INSTALADO') // Select all columns needed for filtering and calculation
                .not('FECHA_VALIDACION', 'is', null)
                .gte('FECHA_INSTALADO', startDate)
                .lt('FECHA_INSTALADO', endDate);

            if (zona === 'lima') {
                query = query.eq('CANAL', 'Agencias');
            }
            
            query = query.limit(15000);

            const { data: records, error } = await query;

            if (error) {
                console.error(`Error fetching SalesRecord:`, error);
                toast({ title: "Error", description: `No se pudieron cargar los registros: ${error.message}`, variant: "destructive" });
            } else if (records) {
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
                    const totalPrecios = group.preciosSinIgv.reduce((sum, p) => sum + p, 0);
                    const avgPrecio = group.preciosSinIgv.length > 0 ? totalPrecios / group.preciosSinIgv.length : 0;
                    
                    return {
                        RUC: group.RUC,
                        AGENCIA: group.AGENCIA,
                        ALTAS: group.pedidos.length,
                        PRECIO_SIN_IGV: avgPrecio
                    };
                });

                setAggregatedData(finalResult);
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
                                <TableHead>RUC</TableHead>
                                <TableHead>AGENCIA</TableHead>
                                <TableHead>ALTAS</TableHead>
                                <TableHead>PRECIO SIN IGV (Promedio)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {aggregatedData.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell>{row.RUC}</TableCell>
                                    <TableCell>{row.AGENCIA}</TableCell>
                                    <TableCell>{row.ALTAS}</TableCell>
                                    <TableCell>{row.PRECIO_SIN_IGV.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
