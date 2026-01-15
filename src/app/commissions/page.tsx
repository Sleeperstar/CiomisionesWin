"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";

const cortes = [
  { value: "corte-1", label: "Corte 1" },
  { value: "corte-2", label: "Corte 2" },
  { value: "corte-3", label: "Corte 3" },
  { value: "corte-4", label: "Corte 4" },
];

const zonas = [
  { value: "lima", label: "Lima" },
  { value: "provincia", label: "Provincia" },
];

// Generar años desde 2024 hasta el año actual + 1
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 2023 }, (_, i) => ({
  value: String(2024 + i),
  label: String(2024 + i)
}));

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

export default function SelectCommissionScopePage() {
  const router = useRouter();
  const [corte, setCorte] = useState<string>("");
  const [zona, setZona] = useState<string>("");
  const [year, setYear] = useState<string>(String(currentYear));
  const [mes, setMes] = useState<string>("");

  const handleContinue = () => {
    if (corte && zona && year && mes) {
      router.push(`/commissions/${corte}/${zona}/${year}/${mes}`);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex justify-center items-center">
      <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/30 dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="pb-4 border-b text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #f53c00 0%, #ff8300 50%, #ffa700 100%)' }}>
          <div className="flex items-center gap-3">
            <Icons.Analytics className="h-8 w-8" />
            <div>
              <CardTitle className="text-xl">Calcular Comisiones</CardTitle>
              <CardDescription className="text-orange-100 mt-1">
                Elige el escenario para el cálculo de comisiones
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="corte-select">Corte</Label>
              <Select onValueChange={setCorte} value={corte}>
                <SelectTrigger id="corte-select" className="border-orange-200 focus:ring-orange-500">
                  <SelectValue placeholder="Seleccione un corte..." />
                </SelectTrigger>
                <SelectContent>
                  {cortes.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zona-select">Zona</Label>
              <Select onValueChange={setZona} value={zona}>
                <SelectTrigger id="zona-select" className="border-orange-200 focus:ring-orange-500">
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
              <Label htmlFor="year-select">Año</Label>
              <Select onValueChange={setYear} value={year}>
                <SelectTrigger id="year-select" className="border-orange-200 focus:ring-orange-500">
                  <SelectValue placeholder="Seleccione un año..." />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.value} value={y.value}>
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="mes-select">Mes</Label>
                <Select onValueChange={setMes} value={mes}>
                    <SelectTrigger id="mes-select" className="border-orange-200 focus:ring-orange-500">
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
              disabled={!corte || !zona || !year || !mes} 
              className="w-full mt-6 bg-[#f53c00] hover:bg-[#ff8300] text-white"
            >
              <Icons.Analytics className="mr-2 h-4 w-4" />
              Calcular Comisiones
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
