"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase'; // Importa el cliente de Supabase
import Papa from 'papaparse'; // Importa Papaparse

export default function UploadSalesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Tipo de Archivo Inválido",
          description: "Por favor, selecciona un archivo CSV.",
          variant: "destructive",
        });
        setSelectedFile(null);
        event.target.value = "";
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      toast({
        title: "No se ha seleccionado ningún archivo",
        description: "Por favor, selecciona un archivo CSV para subir.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    toast({
      title: "Procesando archivo...",
      description: "Por favor, espera mientras se procesan los datos del CSV.",
    });

    Papa.parse(selectedFile, {
      header: true, // Convierte las filas en objetos usando las cabeceras
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data;
        
        if (data.length === 0) {
          toast({
            title: "Archivo Vacío o Inválido",
            description: "El archivo CSV no contiene datos para procesar.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }

        // 'upsert' insertará nuevos registros y actualizará los existentes.
        // Asegúrate de que tu tabla 'SalesRecord' tiene una clave primaria (ej: 'id')
        // para que 'upsert' pueda funcionar correctamente.
        const { error } = await supabase.from('SalesRecord').upsert(data, {
          // Si tu clave primaria no se llama 'id', especifícala aquí.
          // onConflict: 'tu_clave_primaria' 
        });

        setIsUploading(false);

        if (error) {
          toast({
            title: "Error al Subir los Datos",
            description: `Hubo un problema al guardar los datos en Supabase: ${error.message}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Subida Exitosa",
            description: `${data.length} registros han sido procesados y guardados correctamente.`,
          });
          setSelectedFile(null);
          const fileInput = event.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null;
          if (fileInput) fileInput.value = "";
        }
      },
      error: (error) => {
        setIsUploading(false);
        toast({
          title: "Error al Leer el Archivo",
          description: `No se pudo procesar el archivo CSV: ${error.message}`,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card className="shadow-lg max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Icons.UploadSales className="h-6 w-6 text-primary" />
          Subir Registros de Ventas
        </CardTitle>
        <CardDescription>
          Sube un archivo CSV que contenga los registros de ventas para el cálculo de comisiones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="csvFile" className="mb-2 block text-sm font-medium">Archivo CSV de Ventas</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              disabled={isUploading}
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-muted-foreground">
                Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={!selectedFile || isUploading}>
            {isUploading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Subiendo...
              </div>
            ) : (
              "Subir y Procesar"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

