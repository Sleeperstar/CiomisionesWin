"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { smartValidationSchema, type SmartValidationFormValues } from "@/lib/schemas";
import { validateSalesData, type ValidateSalesDataOutput } from "@/ai/flows/validate-sales-data";
import React, { useState } from 'react';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const exampleSalesRecord = JSON.stringify({
  "idVenta": "V1001",
  "producto": "Suite Empresarial",
  "monto": 12000,
  "tasaComision": 0.10,
  "comisionCalculada": 1200,
  "representanteVentas": "Juan Pérez",
  "region": "América del Norte",
  "notas": "El cliente solicitó un 5% de descuento, aprobado."
}, null, 2);

const exampleCommissionRules = JSON.stringify({
  "tasaEstandar": 0.10,
  "umbralesNivel": [
    { "monto": 10000, "tasa": 0.12 },
    { "monto": 20000, "tasa": 0.15 }
  ],
  "tasasEspecificasProducto": {
    "Plan Básico": 0.08,
    "Suite Empresarial": 0.10 // Estándar, pero podría ser sobrescrito
  },
  "bonosRegion": {
    "EMEA": 0.01 // 1% adicional para EMEA
  },
  "reglasValidacion": [
    "La comisión no puede exceder el 20% del monto de la venta.",
    "Descuentos superiores al 10% requieren aprobación del gerente (no reflejado en los datos, marcar para revisión)."
  ]
}, null, 2);


export default function SmartValidationPage() {
  const { toast } = useToast();
  const [validationResult, setValidationResult] = useState<ValidateSalesDataOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SmartValidationFormValues>({
    resolver: zodResolver(smartValidationSchema),
    defaultValues: {
      salesRecord: exampleSalesRecord,
      commissionRules: exampleCommissionRules,
    },
  });

  async function onSubmit(data: SmartValidationFormValues) {
    setIsLoading(true);
    setValidationResult(null);
    try {
      const result = await validateSalesData({
        salesRecord: data.salesRecord,
        commissionRules: data.commissionRules,
      });
      setValidationResult(result);
      toast({
        title: "Validación Completa",
        description: result.needsValidation ? "El registro necesita revisión manual." : "El registro parece válido.",
      });
    } catch (error: any) {
      console.error("Error de validación:", error);
      toast({
        title: "Error de Validación",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Icons.SmartValidation className="h-6 w-6 text-primary" />
            Herramienta de Validación Inteligente de Datos de Ventas
          </CardTitle>
          <CardDescription>
            Usa IA para validar registros de ventas contra las reglas de comisión e identificar discrepancias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="salesRecord"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registro de Venta (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ingresa el registro de venta como una cadena JSON..."
                        className="min-h-[150px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Proporciona los datos de la venta en formato JSON.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commissionRules"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reglas de Comisión (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ingresa las reglas de comisión como una cadena JSON..."
                        className="min-h-[150px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Define las reglas de comisión en formato JSON.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                {isLoading ? (
                 <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validando...
                  </div>
                ) : "Validar Datos"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {validationResult && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Resultado de la Validación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={validationResult.needsValidation ? "destructive" : "default"}>
              <Icons.SmartValidation className="h-5 w-5" />
              <AlertTitle className="font-semibold">
                {validationResult.needsValidation
                  ? "Se Requiere Validación Manual"
                  : "El Registro Parece Válido"}
              </AlertTitle>
              <AlertDescription>{validationResult.reason}</AlertDescription>
            </Alert>
            
            {validationResult.suggestedCommissionAdjustment && (
               <div className="p-4 border rounded-md bg-secondary/50">
                <h4 className="font-semibold text-secondary-foreground mb-1">Ajuste de Comisión Sugerido:</h4>
                <p className="text-sm text-secondary-foreground">{validationResult.suggestedCommissionAdjustment}</p>
              </div>
            )}
          </CardContent>
           <CardFooter>
            <Badge variant={validationResult.needsValidation ? "destructive" : "default"}>
              Estado: {validationResult.needsValidation ? "Necesita Revisión" : "OK"}
            </Badge>
           </CardFooter>
        </Card>
      )}
    </div>
  );
}
