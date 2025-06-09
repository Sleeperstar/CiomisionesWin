"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

// Function to parse Excel dates
const parseExcelDate = (excelDate: number | string) => {
  if (typeof excelDate === 'number') {
    // Excel stores dates as serial numbers, where 1 is 1900-01-01.
    // The following formula converts the serial number to a JavaScript Date object.
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }
  // Attempt to handle string dates if they are not in the correct format
  try {
    const date = new Date(excelDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // Ignore invalid date strings
  }
  return excelDate; // Return original if not a number or valid date string
};


export default function UploadParameters() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);


  // State for each form field
  const [ruc, setRuc] = useState('');
  const [agencia, setAgencia] = useState('');
  const [meta, setMeta] = useState('');
  const [top, setTop] = useState('');
  const [zona, setZona] = useState('');
  const [periodo, setPeriodo] = useState('');

  const months = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!top || !zona || !periodo) {
      toast({
        title: "Campos incompletos",
        description: "Por favor, selecciona una opción para Top, Zona y Periodo.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    const periodoTimestamp = `2025-${periodo}-01`;

    const { data, error } = await supabase
      .from('Parametros')
      .insert([
        { 
          RUC: ruc, 
          AGENCIA: agencia, 
          META: parseInt(meta, 10),
          TOP: top, 
          ZONA: zona, 
          PERIODO: periodoTimestamp
        },
      ]);

    setLoading(false);

    if (error) {
      console.error('Error inserting data:', error);
      toast({
        title: "Error",
        description: "Hubo un error al guardar los parámetros. " + error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Los parámetros se han guardado correctamente.",
      });
      // Reset form fields
      setRuc('');
      setAgencia('');
      setMeta('');
      setTop('');
      setZona('');
      setPeriodo('');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      toast({
        title: "No se ha seleccionado ningún archivo",
        description: "Por favor, selecciona un archivo CSV o XLSX.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("No se pudo leer el archivo");
        }
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          throw new Error("El archivo está vacío o tiene un formato incorrecto.");
        }

        // Validate headers
        const headers = Object.keys(json[0] as object);
        const requiredHeaders = ["RUC", "AGENCIA", "META", "TOP", "ZONA", "PERIODO"];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          throw new Error(`Faltan las siguientes cabeceras en el archivo: ${missingHeaders.join(', ')}`);
        }

        const formattedData = json.map((row: any) => ({
          RUC: String(row.RUC),
          AGENCIA: String(row.AGENCIA),
          META: Number(row.META),
          TOP: String(row.TOP),
          ZONA: String(row.ZONA),
          PERIODO: parseExcelDate(row.PERIODO),
        }));

        const { error } = await supabase.from('Parametros').insert(formattedData);

        if (error) {
          throw error;
        }

        toast({
          title: "Carga exitosa",
          description: `${formattedData.length} registros han sido subidos correctamente.`,
        });

      } catch (error: any) {
        console.error('Error processing file:', error);
        toast({
          title: "Error en la carga",
          description: error.message || "Ocurrió un error al procesar el archivo.",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        setFile(null); 
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
      }
    };

    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      toast({
        title: "Error de lectura",
        description: "No se pudo leer el archivo.",
        variant: "destructive",
      });
      setUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };


  return (
    <div className="space-y-8">
    <Card>
      <CardHeader>
        <CardTitle>Parámetros Manuales</CardTitle>
        <CardDescription>
          Rellena el formulario para añadir un nuevo parámetro a la base de datos.
        </CardDescription>
      </CardHeader>
      <CardContent>
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ruc">RUC de la empresa</Label>
          <Input id="ruc" value={ruc} onChange={(e) => setRuc(e.target.value)} placeholder="20100066603" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agencia">Nombre de la agencia</Label>
          <Input id="agencia" value={agencia} onChange={(e) => setAgencia(e.target.value)} placeholder="Agencia Principal" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta">Meta</Label>
          <Input id="meta" type="number" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="100000" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="top">Top</Label>
          <Select value={top} onValueChange={setTop} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un top" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GOLD">GOLD</SelectItem>
              <SelectItem value="SILVER">SILVER</SelectItem>
              <SelectItem value="NO ES TOP">NO ES TOP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="zona">Zona</Label>
          <Select value={zona} onValueChange={setZona} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LIMA">LIMA</SelectItem>
              <SelectItem value="PROVINCIA">PROVINCIA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="periodo">Periodo</Label>
          <Select value={periodo} onValueChange={setPeriodo} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un mes" />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Save className="mr-2 h-4 w-4" />}
        Guardar Parámetro
      </Button>
    </form>
    </CardContent>
    </Card>
    <Card>
        <CardHeader>
          <CardTitle>Carga Masiva de Parámetros</CardTitle>
          <CardDescription>
            Sube un archivo XLSX o CSV con los parámetros. Asegúrate de que el archivo
            tenga las cabeceras: RUC, AGENCIA, META, TOP, ZONA, PERIODO.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <div className="space-y-2">
                <Label htmlFor="file-upload">Seleccionar Archivo</Label>
                <Input id="file-upload" type="file" accept=".xlsx, .csv" onChange={handleFileChange} />
            </div>
          <Button onClick={handleFileUpload} disabled={uploading || !file}>
            {uploading ? <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.UploadSales className="mr-2 h-4 w-4" />}
            Subir Archivo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
