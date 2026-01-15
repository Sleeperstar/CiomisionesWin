"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";

const zonas = [
  { value: "lima", label: "Lima" },
  { value: "provincia", label: "Provincia" },
];

const meses = [
  { value: "enero", label: "Enero" },
  { value: "febrero", label: "Febrero" },
  { value: "marzo", label: "Marzo" },
  { value: "abril", label: "Abril" },
  { value: "mayo", label: "Mayo" },
  { value: "junio", label: "Junio" },
  { value: "julio", label: "Julio" },
  { value: "agosto", label: "Agosto" },
  { value: "septiembre", label: "Septiembre" },
  { value: "octubre", label: "Octubre" },
  { value: "noviembre", label: "Noviembre" },
  { value: "diciembre", label: "Diciembre" },
];

export default function SelectViewResultsPage() {
  const router = useRouter();
  const [zona, setZona] = useState<string>("");
  const [mes, setMes] = useState<string>("");

  const handleContinue = () => {
    if (zona && mes) {
      router.push(`/view-results/${zona}/${mes}`);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex justify-center items-center">
      <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="pb-4 border-b text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)' }}>
          <div className="flex items-center gap-3">
            <Icons.ViewResults className="h-8 w-8" />
            <div>
              <CardTitle className="text-xl">Visualizar Resultados</CardTitle>
              <CardDescription className="text-blue-100 mt-1">
                Consulta los cortes guardados por zona y mes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zona-select">Zona</Label>
              <Select onValueChange={setZona} value={zona}>
                <SelectTrigger id="zona-select" className="border-blue-200 focus:ring-blue-500">
                  <SelectValue placeholder="Seleccione una zona..." />
                </SelectTrigger>
                <SelectContent>
                  {zonas.map((z) => (
                    <SelectItem key={z.value} value={z.value}>
                      {z.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mes-select">Mes</Label>
              <Select onValueChange={setMes} value={mes}>
                <SelectTrigger id="mes-select" className="border-blue-200 focus:ring-blue-500">
                  <SelectValue placeholder="Seleccione un mes..." />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleContinue} 
              disabled={!zona || !mes}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Icons.ViewResults className="mr-2 h-4 w-4" />
              Ver Resultados
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

