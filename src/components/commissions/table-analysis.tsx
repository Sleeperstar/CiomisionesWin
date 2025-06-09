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

interface Parametro {
  id: number;
  RUC: string;
  AGENCIA: string;
  META: number;
  TOP: string;
  ZONA: string;
  PERIODO: string;
}

export default function TableAnalysis() {
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedRowData, setEditedRowData] = useState<Partial<Parametro> | null>(null);
  const { toast } = useToast();

  const months = [
    { value: '2025-01-01', label: 'Enero' },
    { value: '2025-02-01', label: 'Febrero' },
    { value: '2025-03-01', label: 'Marzo' },
    { value: '2025-04-01', label: 'Abril' },
    { value: '2025-05-01', label: 'Mayo' },
    { value: '2025-06-01', label: 'Junio' },
    { value: '2025-07-01', label: 'Julio' },
    { value: '2025-08-01', label: 'Agosto' },
    { value: '2025-09-01', label: 'Septiembre' },
    { value: '2025-10-01', label: 'Octubre' },
    { value: '2025-11-01', label: 'Noviembre' },
    { value: '2025-12-01', label: 'Diciembre' },
  ];

  useEffect(() => {
    fetchParametros();
  }, []);

  const fetchParametros = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('Parametros').select('*').order('id', { ascending: true });
    if (error) {
      console.error('Error fetching parametros:', error);
      toast({ title: "Error", description: `No se pudieron cargar los parámetros: ${error.message}`, variant: "destructive" });
    } else {
      setParametros(data as Parametro[]);
    }
    setLoading(false);
  };

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

    // Remove id from the update payload
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
      setEditingRow(null);
      setEditedRowData(null);
      fetchParametros(); // Refresh data
    }
  };

  const handleInputChange = (field: keyof Parametro, value: string | number) => {
    if (editedRowData) {
      setEditedRowData({ ...editedRowData, [field]: value });
    }
  };

  const renderCell = (row: Parametro, field: keyof Parametro) => {
    const isEditing = editingRow === row.id;

    if (!isEditing) {
        if (field === 'PERIODO') {
            const date = new Date(row[field]);
            // Format to show only year and month
            return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', timeZone: 'UTC' });
        }
      return row[field];
    }
    
    // When editing
    switch (field) {
      case 'TOP':
        return (
          <Select value={editedRowData?.TOP} onValueChange={(value) => handleInputChange('TOP', value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="GOLD">GOLD</SelectItem>
              <SelectItem value="SILVER">SILVER</SelectItem>
              <SelectItem value="NO ES TOP">NO ES TOP</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'ZONA':
        return (
          <Select value={editedRowData?.ZONA} onValueChange={(value) => handleInputChange('ZONA', value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LIMA">LIMA</SelectItem>
              <SelectItem value="PROVINCIA">PROVincia</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'PERIODO':
        // Find the corresponding month object to format the displayed value
        const currentMonthValue = editedRowData?.PERIODO ? new Date(editedRowData.PERIODO).toISOString().slice(0, 10) : '';

        return (
          <Select value={currentMonthValue} onValueChange={(value) => handleInputChange('PERIODO', value)}>
            <SelectTrigger>
                <SelectValue placeholder="Selecciona un mes"/>
            </SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case 'RUC':
      case 'AGENCIA':
        return <Input value={editedRowData?.[field] as string || ''} onChange={(e) => handleInputChange(field, e.target.value)} />;
      case 'META':
        return <Input type="number" value={editedRowData?.[field] as number || ''} onChange={(e) => handleInputChange(field, Number(e.target.value))} />;
      default:
        // For non-editable fields like 'id'
        return row[field];
    }
  };
  

  if (loading) {
    return <div className="flex justify-center items-center"><Icons.Spinner className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis de Tabla de Parámetros</CardTitle>
        <CardDescription>
          Visualiza y edita los parámetros directamente desde la tabla.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            {parametros.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{renderCell(row, 'RUC')}</TableCell>
                <TableCell>{renderCell(row, 'AGENCIA')}</TableCell>
                <TableCell>{renderCell(row, 'META')}</TableCell>
                <TableCell>{renderCell(row, 'TOP')}</TableCell>
                <TableCell>{renderCell(row, 'ZONA')}</TableCell>
                <TableCell>{renderCell(row, 'PERIODO')}</TableCell>
                <TableCell className="text-right">
                  {editingRow === row.id ? (
                    <div className="flex gap-2 justify-end">
                      <Button onClick={handleSave} size="sm">Guardar</Button>
                      <Button onClick={handleCancel} size="sm" variant="outline">Cancelar</Button>
                    </div>
                  ) : (
                    <Button onClick={() => handleEdit(row)} size="sm">Editar</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
