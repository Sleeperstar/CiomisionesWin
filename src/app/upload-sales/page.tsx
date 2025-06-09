"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Progress } from "@/components/ui/progress";

const BATCH_SIZE = 1000; // Un lote más grande ya que el UI no se bloqueará

export default function UploadSalesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Termina el worker si el componente se desmonta
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setSelectedFile(file);
        setUploadProgress(0);
      } else {
        toast({ title: "Tipo de Archivo Inválido", variant: "destructive" });
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
      toast({ title: "Error de Conexión", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conexión Exitosa" });
    }
    setIsTesting(false);
  };
  
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    toast({ title: "Iniciando subida en segundo plano..." });

    // Crea un worker a partir del script con la RUTA CORREGIDA
    const worker = new Worker(new URL('../../workers/csv-processor.ts', import.meta.url));
    workerRef.current = worker;

    // Escucha los mensajes del worker
    worker.onmessage = async (e) => {
      const { type, data, totalRows, message, cursor } = e.data;
      
      if (type === 'batch') {
        const { error } = await supabase.from('SalesRecord').upsert(data, { onConflict: 'COD_PEDIDO' });
        
        if (error) {
          worker.terminate();
          setIsUploading(false);
          toast({ title: "Error al subir lote a Supabase", description: error.message, variant: "destructive" });
          return;
        }

        // Actualiza el progreso y le dice al worker que continúe
        if(selectedFile) {
            const progress = (cursor / selectedFile.size) * 100;
            setUploadProgress(progress);
        }
      } else if (type === 'complete') {
        setUploadProgress(100);
        toast({ title: "Subida Completada", description: `${totalRows} registros procesados.` });
        worker.terminate();
        setIsUploading(false);
        setSelectedFile(null);
        const fileInput = document.getElementById("csvFile") as HTMLInputElement | null;
        if(fileInput) fileInput.value = "";
        setTimeout(() => setUploadProgress(0), 2000);
      } else if (type === 'error') {
        toast({ title: "Error en el procesamiento del CSV", description: message, variant: "destructive" });
        worker.terminate();
        setIsUploading(false);
      }
    };
    
    // Inicia el procesamiento enviando el archivo al worker
    worker.postMessage({ file: selectedFile, batchSize: BATCH_SIZE });
  };

  return (
    <Card className="shadow-lg max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2"><Icons.UploadSales />Subir Ventas (Alto Rendimiento)</CardTitle>
        <CardDescription>Optimizado para archivos grandes. El procesamiento se realiza en segundo plano.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Paso 1: Probar la Conexión</Label>
          <Button onClick={handleTestConnection} variant="outline" className="w-full" disabled={isTesting || isUploading}>
            {isTesting ? "Probando..." : "Probar Conexión"}
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
              {isUploading ? "Subiendo en segundo plano..." : "Subir y Procesar CSV"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
