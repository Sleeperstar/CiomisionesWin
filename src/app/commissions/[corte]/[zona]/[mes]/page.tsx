"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import UploadParameters from "@/components/commissions/upload-parameters";
import TableAnalysis from "@/components/commissions/table-analysis";
import BaseCalculo from "@/components/commissions/base-calculo";

// Helper to format the title from slug
function formatTitle(slug: string) {
  if (!slug) return '';
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function CommissionCalculationPage({ params }: { params: { corte: string; zona: string; mes: string } }) {
  const { corte, zona, mes } = params;

  // As per your request, only "Corte 1" and "Lima" are currently implemented.
  const isImplemented = corte === 'corte-1' && zona === 'lima';
  const tabTitle = `Base ${formatTitle(corte)} - ${formatTitle(zona)} - ${formatTitle(mes)}`;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Cálculo de Comisiones: {formatTitle(corte)} - {formatTitle(zona)} - {formatTitle(mes)}
        </h2>
      </div>

      {isImplemented ? (
        <Tabs defaultValue="base_calculo" className="space-y-4">
          <TabsList>
            <TabsTrigger value="base_calculo">
                <Icons.Analytics className="mr-2 h-4 w-4" />
                {tabTitle}
            </TabsTrigger>
            <TabsTrigger value="upload_parameters">
              <Icons.Settings className="mr-2 h-4 w-4" />
              Subir Parámetros
            </TabsTrigger>
            <TabsTrigger value="table_analysis">
              <Icons.Analytics className="mr-2 h-4 w-4" />
              Análisis de Tablas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="base_calculo">
            <BaseCalculo corte={corte} zona={zona} mes={mes} />
          </TabsContent>

          <TabsContent value="upload_parameters">
            <Card>
              <CardHeader>
                <CardTitle>Parámetros de Comisión</CardTitle>
                <CardDescription>
                  Define los valores y condiciones para el cálculo de las comisiones de los asesores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadParameters />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="table_analysis">
              <TableAnalysis />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
            <CardHeader>
                <CardTitle>Página en Construcción</CardTitle>
                <CardDescription>
                    La funcionalidad para {formatTitle(corte)}, {formatTitle(zona)} y {formatTitle(mes)} aún no está implementada.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Por favor, seleccione Corte 1 y Lima para ver la funcionalidad disponible.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
} 