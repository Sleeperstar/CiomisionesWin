"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { SalesRecord } from '@/lib/schemas';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

export default function BaseCalculo({ corte, zona, mes }: { corte: string; zona: string; mes: string }) {
    const [records, setRecords] = useState<SalesRecord[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAndFilterData = async () => {
            setLoading(true);

            const monthNumber = monthMap[mes];
            if (!monthNumber) {
                toast({ title: "Error", description: "Mes inválido seleccionado.", variant: "destructive" });
                setLoading(false);
                return;
            }

            // Determine the year dynamically. For simplicity, we can assume the current year or make it configurable.
            // Let's assume the data is for 2025 as in your Excel example for consistency.
            const year = 2025; 

            const startDate = `${year}-${String(monthNumber).padStart(2, '0')}-01`;
            
            // new Date's month parameter is 0-indexed. By passing the 1-indexed monthNumber,
            // we correctly get the first day of the *next* month.
            // e.g., for April (month 4), new Date(2025, 4, 1) is May 1st.
            // For December (month 12), new Date(2025, 12, 1) correctly becomes January 1st, 2026.
            const nextMonthDate = new Date(year, monthNumber, 1);
            const endDate = nextMonthDate.toISOString().split('T')[0];

            let query = supabase
                .from('SalesRecord')
                .select('*', { count: 'exact' })
                .not('FECHA_VALIDACION', 'is', null)
                .gte('FECHA_INSTALADO', startDate)
                .lt('FECHA_INSTALADO', endDate);

            if (zona === 'lima') {
                query = query.eq('CANAL', 'Agencias');
            }
            
            const { data, error, count } = await query;

            if (error) {
                console.error(`Error fetching SalesRecord:`, error);
                toast({ title: "Error", description: `No se pudieron cargar los registros de ventas: ${error.message}`, variant: "destructive" });
                setRecords([]);
                setTotalCount(0);
            } else {
                setRecords(data || []);
                setTotalCount(count || 0);
            }
            
            setLoading(false);
        };

        fetchAndFilterData();
    }, [corte, zona, mes, toast]);


    if (loading) {
        return <div className="flex justify-center items-center h-64"><Icons.Spinner className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Base de Cálculo Filtrada</CardTitle>
                <CardDescription>
                    Registros encontrados: {totalCount} (mostrando hasta 1000)
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="whitespace-nowrap rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>COD_PEDIDO</TableHead>
                                <TableHead>DNI_CLIENTE</TableHead>
                                <TableHead>FECHA_VENTA</TableHead>
                                <TableHead>FECHA_VALIDACION</TableHead>
                                <TableHead>FECHA_INSTALADO</TableHead>
                                <TableHead>OFERTA</TableHead>
                                <TableHead>TIPO_VENTA</TableHead>
                                <TableHead>ASESOR</TableHead>
                                <TableHead>CANAL</TableHead>
                                <TableHead>TIPO_ESTADO</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map((row) => (
                                <TableRow key={row.COD_PEDIDO}>
                                    <TableCell>{row.COD_PEDIDO}</TableCell>
                                    <TableCell>{row.DNI_CLIENTE}</TableCell>
                                    <TableCell>{formatDate(row.FECHA_VENTA)}</TableCell>
                                    <TableCell>{formatDate(row.FECHA_VALIDACION)}</TableCell>
                                    <TableCell>{formatDate(row.FECHA_INSTALADO)}</TableCell>
                                    <TableCell>{row.OFERTA}</TableCell>
                                    <TableCell>{row.TIPO_VENTA}</TableCell>
                                    <TableCell>{row.ASESOR}</TableCell>
                                    <TableCell>{row.CANAL}</TableCell>
                                    <TableCell>{row.TIPO_ESTADO}</TableCell>
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