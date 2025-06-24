"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
  const [mes, setMes] = useState<string>("");

  const handleContinue = () => {
    if (corte && zona && mes) {
      router.push(`/commissions/${corte}/${zona}/${mes}`);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex justify-center items-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Seleccionar Escenario</CardTitle>
          <CardDescription>
            Elige el corte, la zona y el mes para el cálculo de comisiones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="corte-select">Corte</Label>
              <Select onValueChange={setCorte} value={corte}>
                <SelectTrigger id="corte-select">
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
                <SelectTrigger id="zona-select">
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
                    <SelectTrigger id="mes-select">
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

            <Button onClick={handleContinue} disabled={!corte || !zona || !mes} className="w-full">
              Continuar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
