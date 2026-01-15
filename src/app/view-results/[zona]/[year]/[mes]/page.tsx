"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/icons";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import ViewCorte1Table from "@/components/view-results/view-corte-1-table";
import ViewCorte2Table from "@/components/view-results/view-corte-2-table";
import ViewCorte3Table from "@/components/view-results/view-corte-3-table";
import ViewCorte4Table from "@/components/view-results/view-corte-4-table";
import ViewResultadosFinalesTable from "@/components/view-results/view-resultados-finales-table";
import { DollarSign } from "lucide-react";

const monthMap: { [key: string]: number } = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};

function formatTitle(slug: string) {
  if (!slug) return '';
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

interface CorteCounts {
  corte1: number;
  corte2: number;
  corte3: number;
  corte4: number;
  finales: number;
}

export default function ViewResultsPage({ params }: { params: { zona: string; year: string; mes: string } }) {
  const { zona, year, mes } = params;
  const { toast } = useToast();
  const [counts, setCounts] = useState<CorteCounts>({ corte1: 0, corte2: 0, corte3: 0, corte4: 0, finales: 0 });
  const [loading, setLoading] = useState(true);

  const monthNumber = monthMap[mes];
  const yearNumber = parseInt(year, 10);
  const periodo = (yearNumber * 100) + monthNumber;

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      try {
        // Contar registros en cada tabla
        const [c1, c2, c3, c4, cFinales] = await Promise.all([
          supabase.from('resultado_comisiones_corte_1').select('id', { count: 'exact', head: true })
            .eq('periodo', periodo).eq('zona', zona.toUpperCase()),
          supabase.from('resultado_comisiones_corte_2').select('id', { count: 'exact', head: true })
            .eq('periodo', periodo).eq('zona', zona.toUpperCase()),
          supabase.from('resultado_comisiones_corte_3').select('id', { count: 'exact', head: true })
            .eq('periodo', periodo).eq('zona', zona.toUpperCase()),
          supabase.from('resultado_comisiones_corte_4').select('id', { count: 'exact', head: true })
            .eq('periodo', periodo).eq('zona', zona.toUpperCase()),
          // Resultados finales (vista consolidada)
          supabase.from('resultados_finales').select('ruc', { count: 'exact', head: true })
            .eq('periodo', periodo).eq('zona', zona.toUpperCase()),
        ]);

        setCounts({
          corte1: c1.count || 0,
          corte2: c2.count || 0,
          corte3: c3.count || 0,
          corte4: c4.count || 0,
          finales: cFinales.count || 0,
        });
      } catch (error) {
        console.error('Error fetching counts:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los conteos de registros",
          variant: "destructive"
        });
      }
      setLoading(false);
    };

    fetchCounts();
  }, [periodo, zona, toast]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Visualizar Resultados
          </h2>
          <p className="text-muted-foreground">
            {formatTitle(zona)} • {formatTitle(mes)} {year} • Periodo {periodo}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm py-1 px-3">
            <Icons.ViewResults className="mr-2 h-4 w-4" />
            Solo lectura
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="corte-1" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="corte-1" className="flex flex-col py-3 data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900">
            <span className="font-semibold">Corte 1</span>
            <Badge variant="secondary" className="mt-1">
              {loading ? '...' : `${counts.corte1} registros`}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="corte-2" className="flex flex-col py-3 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900">
            <span className="font-semibold">Corte 2</span>
            <Badge variant="secondary" className="mt-1">
              {loading ? '...' : `${counts.corte2} registros`}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="corte-3" className="flex flex-col py-3 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900">
            <span className="font-semibold">Corte 3</span>
            <Badge variant="secondary" className="mt-1">
              {loading ? '...' : `${counts.corte3} registros`}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="corte-4" className="flex flex-col py-3 data-[state=active]:bg-teal-100 data-[state=active]:text-teal-900">
            <span className="font-semibold">Corte 4</span>
            <Badge variant="secondary" className="mt-1">
              {loading ? '...' : `${counts.corte4} registros`}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="finales" className="flex flex-col py-3 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-900">
            <span className="font-semibold flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Consolidado
            </span>
            <Badge variant="secondary" className="mt-1">
              {loading ? '...' : `${counts.finales} registros`}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="corte-1">
          <ViewCorte1Table zona={zona} mes={mes} periodo={periodo} />
        </TabsContent>

        <TabsContent value="corte-2">
          <ViewCorte2Table zona={zona} mes={mes} periodo={periodo} />
        </TabsContent>

        <TabsContent value="corte-3">
          <ViewCorte3Table zona={zona} mes={mes} periodo={periodo} />
        </TabsContent>

        <TabsContent value="corte-4">
          <ViewCorte4Table zona={zona} mes={mes} periodo={periodo} />
        </TabsContent>

        <TabsContent value="finales">
          <ViewResultadosFinalesTable zona={zona} mes={mes} periodo={periodo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

