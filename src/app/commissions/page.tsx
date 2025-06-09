"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import UploadParameters from "@/components/commissions/upload-parameters";
import TableAnalysis from "@/components/commissions/table-analysis";

export default function CommissionsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Cálculo de Comisiones</h2>
      </div>

      <Tabs defaultValue="upload_parameters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload_parameters">
            <Icons.Settings className="mr-2 h-4 w-4" />
            Subir Parámetros
          </TabsTrigger>
          <TabsTrigger value="table_analysis">
            <Icons.Analytics className="mr-2 h-4 w-4" />
            Análisis de Tablas
          </TabsTrigger>
        </TabsList>

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
    </div>
  );
}
