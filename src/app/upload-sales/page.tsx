"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import Papa, { ParseResult } from 'papaparse';
import { Progress } from "@/components/ui/progress";

const BATCH_SIZE = 500;

// Columnas de tipo TIMESTAMP
const TIMESTAMP_FIELDS = [
    "FECHA_VENTA", "FECHA_VALIDACION", "INSTALADO_REGISTRO", "FECHA_INSTALADO",
    "WS_RECIBO1_EMISION", "RECIBO1_PAGADO", "WS_RECIBO2_EMISION", "RECIBO2_PAGADO",
    "WS_2PAGOC_EMISION", "2_PAGOS_COMPLETOS", "WS_RECIBO3_EMISION", "RECIBO3_PAGADO"
];

// Columnas de tipo INTEGER o BIGINT
const INTEGER_FIELDS = [
    "COD_PEDIDO", "ID_PREDIO", "ANCHO_BANDA", "WIN_BOX", "PLAN_GAMER", "PLAN_WIN_TV", "PLAN_DTV_GO",
    "PLAN_DTV_FULL", "WIN_GAMES", "FONO_WIN", "PLAN_DGO_L1MAX", "PLAN_L1MAX", "PLAN_WIN_TV_PLUS",
    "PLAN_WIN_TV_PREMIUM", "PLAN_WIN_TV_L1MAX", "PLAN_WIN_TV_L1MAX_PREMIUM", "HEREDADO", 
    "INSTALADO", "CODIGO_INSTALADO", "PERIODO", "PERIODO_ALTA"
];

// Columnas de tipo DOUBLE PRECISION (float)
const FLOAT_FIELDS = ["PRECIO_CON_IGV", "PRECIO_CON_IGV_EXTERNO"];

export default function UploadSalesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setSelectedFile(file);
        setUploadProgress(0);
      } else {
        toast({
          title: "Tipo de Archivo Inválido",
          description: "Por favor, selecciona un archivo CSV.",
          variant: "destructive",
        });
        setSelectedFile(null);
        if (event.target) event.target.value = "";
      }
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    toast({ title: "Probando conexión..." });
    const testRecord = { COD_PEDIDO: Math.floor(Date.now() / 1000), DNI_CLIENTE: "12345678", DEPARTAMENTO: "LIMA", PROVINCIA: "LIMA", DISTRITO: "MIRAFLORES", ID_PREDIO: 101, PREDIO: "PREDIO DE PRUEBA", FECHA_VENTA: new Date().toISOString(), TIPO_VENTA: "NUEVA", PRECIO_CON_IGV: 99.90, ORIGEN_VENTA: "TEST_CONNECTION", DNI_ASESOR: "87654321", ASESOR: "ASESOR DE PRUEBA", CANAL: "PRUEBA", TIPO_ESTADO: "ACTIVO", PROCESADO: "NO", INSTALADO: 0, PERIODO: 202401, PERIODO_ALTA: 202401 };
    const { error } = await supabase.from('SalesRecord').insert([testRecord]);
    if (error) {
      toast({ title: "Error de Conexión", description: `No se pudo insertar el registro de prueba: ${error.message}`, variant: "destructive" });
    } else {
      toast({ title: "Conexión Exitosa", description: "El registro de prueba se ha insertado correctamente." });
    }
    setIsTesting(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      toast({ title: "No se ha seleccionado ningún archivo", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    toast({ title: "Iniciando subida...", description: "El archivo se está procesando y limpiando." });

    let totalRows = 0;
    const fileTotalSize = selectedFile.size;
    let recordsToUpload: any[] = [];

    const processBatch = async (batch: any[]) => {
      if (batch.length === 0) return;
      const { error } = await supabase.from('SalesRecord').upsert(batch, { onConflict: 'COD_PEDIDO' });
      if (error) throw new Error(`Error en Supabase: ${error.message}`);
    };
    
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      transform: (value, header) => {
        const headerStr = String(header).trim();
        if (value === '' || value === null) {
          return null; // Convierte cualquier celda vacía en null
        }
        if (INTEGER_FIELDS.includes(headerStr)) {
          const parsed = parseInt(value, 10);
          return isNaN(parsed) ? null : parsed; // "1.0" se convierte en 1
        }
        if (FLOAT_FIELDS.includes(headerStr)) {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? null : parsed; // "99.90" se convierte en 99.9
        }
        if (TIMESTAMP_FIELDS.includes(headerStr)) {
           // Si el valor no es una fecha válida, se convertirá en null al fallar la inserción
           // o puedes añadir validación aquí si es necesario. Por ahora, confiamos en el formato.
           return value;
        }
        return value;
      },
      chunk: async (results: ParseResult<any>, parser) => {
        parser.pause();
        try {
          recordsToUpload.push(...results.data);
          totalRows += results.data.length;
          if (recordsToUpload.length >= BATCH_SIZE) {
            await processBatch(recordsToUpload);
            recordsToUpload = [];
          }
          const progress = fileTotalSize > 0 ? (results.meta.cursor / fileTotalSize) * 100 : 0;
          setUploadProgress(progress);
        } catch (error: any) {
          parser.abort();
          setIsUploading(false);
          toast({ title: "Error al Subir Lote", description: error.message, variant: "destructive" });
        }
        parser.resume();
      },
      complete: async () => {
        try {
          await processBatch(recordsToUpload);
          setUploadProgress(100);
          toast({ title: "Subida Completada", description: `Se han procesado ${totalRows} registros.` });
        } catch (error: any) {
          toast({ title: "Error al Subir Lote Final", description: error.message, variant: "destructive" });
        } finally {
          setIsUploading(false);
          setSelectedFile(null);
          const fileInput = document.getElementById("csvFile") as HTMLInputElement | null;
          if (fileInput) fileInput.value = "";
          setTimeout(() => setUploadProgress(0), 2000);
        }
      },
      error: (error) => {
        setIsUploading(false);
        toast({ title: "Error al Leer el Archivo", description: error.message, variant: "destructive" });
      }
    });
  };

  return (
    <Card className="shadow-lg max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2"><Icons.UploadSales />Subir Registros de Ventas</CardTitle>
        <CardDescription>Prueba la conexión y luego sube tu archivo CSV. Los datos se limpiarán automáticamente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Paso 1: Probar la Conexión</Label>
          <Button onClick={handleTestConnection} variant="outline" className="w-full" disabled={isTesting || isUploading}>
            {isTesting ? "Probando..." : "Probar Conexión a Supabase"}
          </Button>
        </div>
        <div className="border-t pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="csvFile">Paso 2: Subir Archivo CSV</Label>
              <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} disabled={isUploading || isTesting} />
              {selectedFile && <p className="mt-2 text-sm text-muted-foreground">{selectedFile.name}</p>}
            </div>
            {(isUploading && selectedFile) && (
              <div className="space-y-2">
                <Label>Progreso de la Subida</Label>
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}% completado</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={!selectedFile || isUploading || isTesting}>
              {isUploading ? "Subiendo..." : "Subir y Procesar CSV"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
