"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Parametro, SalesRecord } from '@/lib/schemas';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";


// Helper function to format a period string (e.g., "202504") into a readable format.
const formatPeriod = (period: number | undefined | null): string => {
    if (!period) return '';
    const periodStr = period.toString();
    if (periodStr.length !== 6) return periodStr;
    try {
        const year = parseInt(periodStr.substring(0, 4));
        const monthIndex = parseInt(periodStr.substring(4, 6), 10) - 1;
        const date = new Date(year, monthIndex);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', timeZone: 'UTC' });
    } catch (e) {
        console.error("Invalid period format:", period);
        return periodStr;
    }
};

const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return dateString;
    }
};

export default function TableAnalysis() {
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedRowData, setEditedRowData] = useState<Partial<Parametro> | null>(null);
  const [selectedTable, setSelectedTable] = useState('Parametros');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const { toast } = useToast();

  const months = [
    { value: '202501', label: 'Enero' }, { value: '202502', label: 'Febrero' },
    { value: '202503', label: 'Marzo' }, { value: '202504', label: 'Abril' },
    { value: '202505', label: 'Mayo' }, { value: '202506', label: 'Junio' },
    { value: '202507', label: 'Julio' }, { value: '202508', label: 'Agosto' },
    { value: '202509', label: 'Septiembre' }, { value: '202510', label: 'Octubre' },
    { value: '202511', label: 'Noviembre' }, { value: '202512', label: 'Diciembre' },
  ];

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const tableName = selectedTable;
        const periodColumn = tableName === 'Parametros' ? 'PERIODO' : 'PERIODO_SUBIDA_DATA';
        const primaryKey = tableName === 'Parametros' ? 'id' : 'COD_PEDIDO';


        let query = supabase.from(tableName).select('*');

        if (selectedPeriod) {
            query = query.eq(periodColumn, selectedPeriod);
        }
        
        const { data, error } = await query.order(primaryKey, { ascending: true });

        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          toast({ title: "Error", description: `No se pudieron cargar los datos de ${tableName}: ${error.message}`, variant: "destructive" });
          if (tableName === 'Parametros') setParametros([]); else setSalesRecords([]);
        } else {
          if (tableName === 'Parametros') {
            setParametros(data as Parametro[]);
          } else {
            setSalesRecords(data as SalesRecord[]);
          }
        }
        setLoading(false);
    };

    fetchData();
  }, [selectedTable, selectedPeriod, toast]);

  const handleEdit = (row: Parametro) => {
    setEditingRow(row.id);
    setEditedRowData(row);
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditedRowData(null);
  };

  const handleSave = async () => {
    if (!editingRow || !editedRowData) return;

    const { id, ...updateData } = editedRowData;

    const { error } = await supabase
      .from('Parametros')
      .update(updateData)
      .eq('id', editingRow);

    if (error) {
      console.error('Error updating parametro:', error);
      toast({ title: "Error", description: "No se pudo actualizar el parámetro.", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Parámetro actualizado correctamente." });
      // Optimistically update the UI for instant feedback
      setParametros(parametros.map(p => p.id === editingRow ? { ...p, ...editedRowData } as Parametro : p));
      setEditingRow(null);
      setEditedRowData(null);
    }
  };

  const handleInputChange = (field: keyof Omit<Parametro, 'id'>, value: string | number) => {
    if (editedRowData) {
      setEditedRowData({ ...editedRowData, [field]: value });
    }
  };
  
  const renderParametrosTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>RUC</TableHead>
          <TableHead>Agencia</TableHead>
          <TableHead>Meta</TableHead>
          <TableHead>Top</TableHead>
          <TableHead>Zona</TableHead>
          <TableHead>Periodo</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {parametros.map((row) => {
          const isEditing = editingRow === row.id;
          return (
            <TableRow key={row.id}>
              <TableCell>{isEditing ? <Input value={editedRowData?.RUC || ''} onChange={(e) => handleInputChange('RUC', e.target.value)} /> : row.RUC}</TableCell>
              <TableCell>{isEditing ? <Input value={editedRowData?.AGENCIA || ''} onChange={(e) => handleInputChange('AGENCIA', e.target.value)} /> : row.AGENCIA}</TableCell>
              <TableCell>{isEditing ? <Input type="number" value={editedRowData?.META ?? ''} onChange={(e) => handleInputChange('META', Number(e.target.value))} /> : row.META}</TableCell>
              <TableCell>
                {isEditing ? (
                  <Select value={editedRowData?.TOP} onValueChange={(value) => handleInputChange('TOP', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOLD">GOLD</SelectItem>
                      <SelectItem value="SILVER">SILVER</SelectItem>
                      <SelectItem value="NO ES TOP">NO ES TOP</SelectItem>
                    </SelectContent>
                  </Select>
                ) : row.TOP}
              </TableCell>
              <TableCell>
                {isEditing ? (
                  <Select value={editedRowData?.ZONA} onValueChange={(value) => handleInputChange('ZONA', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIMA">LIMA</SelectItem>
                      <SelectItem value="PROVINCIA">PROVINCIA</SelectItem>
                    </SelectContent>
                  </Select>
                ) : row.ZONA}
              </TableCell>
              <TableCell>
                {isEditing ? (
                  <Select value={editedRowData?.PERIODO} onValueChange={(value) => handleInputChange('PERIODO', value)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona un mes"/></SelectTrigger>
                    <SelectContent>
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : formatPeriod(parseInt(row.PERIODO))}
              </TableCell>
              <TableCell className="text-right">
                {isEditing ? (
                  <div className="flex gap-2 justify-end">
                    <Button onClick={handleSave} size="sm">Guardar</Button>
                    <Button onClick={handleCancel} size="sm" variant="outline">Cancelar</Button>
                  </div>
                ) : (
                  <Button onClick={() => handleEdit(row)} size="sm">Editar</Button>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  );

  const renderSalesRecordTable = () => (
    <ScrollArea className="whitespace-nowrap rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>COD_PEDIDO</TableHead>
                    <TableHead>DNI_CLIENTE</TableHead>
                    <TableHead>DEPARTAMENTO</TableHead>
                    <TableHead>PROVINCIA</TableHead>
                    <TableHead>DISTRITO</TableHead>
                    <TableHead>FECHA_VENTA</TableHead>
                    <TableHead>OFERTA</TableHead>
                    <TableHead>TIPO_VENTA</TableHead>
                    <TableHead>PRECIO_CON_IGV</TableHead>
                    <TableHead>ASESOR</TableHead>
                    <TableHead>CANAL</TableHead>
                    <TableHead>TIPO_ESTADO</TableHead>
                    <TableHead>FECHA_INSTALADO</TableHead>
                    <TableHead>PERIODO_SUBIDA_DATA</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {salesRecords.map((row) => (
                    <TableRow key={row.COD_PEDIDO}>
                        <TableCell>{row.COD_PEDIDO}</TableCell>
                        <TableCell>{row.DNI_CLIENTE}</TableCell>
                        <TableCell>{row.DEPARTAMENTO}</TableCell>
                        <TableCell>{row.PROVINCIA}</TableCell>
                        <TableCell>{row.DISTRITO}</TableCell>
                        <TableCell>{formatDate(row.FECHA_VENTA)}</TableCell>
                        <TableCell>{row.OFERTA}</TableCell>
                        <TableCell>{row.TIPO_VENTA}</TableCell>
                        <TableCell>{row.PRECIO_CON_IGV}</TableCell>
                        <TableCell>{row.ASESOR}</TableCell>
                        <TableCell>{row.CANAL}</TableCell>
                        <TableCell>{row.TIPO_ESTADO}</TableCell>
                        <TableCell>{formatDate(row.FECHA_INSTALADO)}</TableCell>
                        <TableCell>{formatPeriod(row.PERIODO_SUBIDA_DATA)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Icons.Spinner className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis de Tablas</CardTitle>
        <CardDescription>Visualiza y edita los datos directamente desde la tabla.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4">
          <Select value={selectedTable} onValueChange={(value) => { setSelectedTable(value); setEditingRow(null); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar tabla" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Parametros">Parámetros</SelectItem>
              <SelectItem value="SalesRecord">Base de Agencias</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={selectedPeriod || "all-periods"} 
            onValueChange={(value) => { 
              setSelectedPeriod(value === "all-periods" ? "" : value); 
              setEditingRow(null); 
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-periods">Todos los periodos</SelectItem>
              {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedTable === 'Parametros' ? renderParametrosTable() : renderSalesRecordTable()}
      </CardContent>
    </Card>
  );
}
