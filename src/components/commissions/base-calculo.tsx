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
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

export default function BaseCalculo({ corte, zona, mes }: { corte: string; zona: string; mes: string }) {
    const [records, setRecords] = useState<SalesRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAndFilterData = async () => {
            setLoading(true);

            // 1. Fetch all necessary data
            let query = supabase.from('SalesRecord').select('*');

            // 2. Filter by FECHA_VALIDACION != NULL
            query = query.not('FECHA_VALIDACION', 'is', null);

            // Execute the initial query
            const { data, error } = await query;

            if (error) {
                console.error(`Error fetching SalesRecord:`, error);
                toast({ title: "Error", description: `No se pudieron cargar los registros de ventas: ${error.message}`, variant: "destructive" });
                setRecords([]);
                setLoading(false);
                return;
            }

            // 3. Apply client-side filtering
            let filteredData = data;

            // Filter by Zona ('lima' -> CANAL == 'Agencias')
            if (zona === 'lima') {
                filteredData = filteredData.filter(record => record.CANAL === 'Agencias');
            }
            
            // Filter by Mes (FECHA_INSTALADO)
            const monthIndex = monthMap[mes];
            if (monthIndex !== undefined) {
                const currentYear = new Date().getFullYear();
                filteredData = filteredData.filter(record => {
                    if (!record.FECHA_INSTALADO) return false;
                    try {
                        const installedDate = new Date(record.FECHA_INSTALADO);
                        return installedDate.getMonth() === monthIndex && installedDate.getFullYear() === currentYear;
                    } catch (e) {
                        return false;
                    }
                });
            }

            setRecords(filteredData);
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
                    Registros encontrados: {records.length}
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