"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getAgencias } from "@/lib/agencias-service";
import type { AgenciaView } from "@/lib/schemas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Search, ChevronRight, AlertCircle, CheckCircle, Mail, Building2, RefreshCw } from "lucide-react";

export default function AgenciesPage() {
  const [agencias, setAgencias] = useState<AgenciaView[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("ALL");
  const [filterCondicion, setFilterCondicion] = useState<string>("ALL");
  const [filterVigencia, setFilterVigencia] = useState<string>("ALL");
  
  const { toast } = useToast();

  useEffect(() => {
    loadAgencias();
  }, []);

  async function loadAgencias() {
    try {
      setLoading(true);
      const data = await getAgencias();
      setAgencias(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast({ title: "Error al cargar agencias", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // --- Derived State (Counts & Filters) ---
  const counts = useMemo(() => {
    return {
      total: agencias.length,
      activos: agencias.filter(a => a.condicion === "ACTIVO").length,
      baja: agencias.filter(a => a.condicion === "BAJA").length,
      pendientes: agencias.filter(a => a.condicion === "PENDIENTE").length,
      vencidos: agencias.filter(a => a.vigencia_contrato === "NO VIGENTE").length,
      porVencer: agencias.filter(a => a.dias_vencimiento !== null && a.dias_vencimiento >= 0 && a.dias_vencimiento <= 30).length,
    };
  }, [agencias]);

  const filteredAgencias = useMemo(() => {
    return agencias.filter((a) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          a.ruc.toLowerCase().includes(term) ||
          a.razon_social.toLowerCase().includes(term) ||
          (a.nombre_comercial?.toLowerCase().includes(term) ?? false);
        if (!matchesSearch) return false;
      }
      if (filterTipo !== "ALL" && a.tipo_agencia !== filterTipo) return false;
      if (filterCondicion !== "ALL" && a.condicion !== filterCondicion) return false;
      if (filterVigencia !== "ALL") {
        if (filterVigencia === "POR VENCER") return a.dias_vencimiento !== null && a.dias_vencimiento >= 0 && a.dias_vencimiento <= 30;
        return a.vigencia_contrato === filterVigencia;
      }
      return true;
    });
  }, [agencias, searchTerm, filterTipo, filterCondicion, filterVigencia]);

  // --- Design Token Helpers ---
  
  // Subtle structural background based on urgency
  const getUrgencyRowClass = (dias: number | null) => {
    if (dias === null) return "hover:bg-muted/30 border-l-transparent";
    if (dias < 0) return "bg-rose-50/30 hover:bg-rose-50/60 border-l-rose-400";
    if (dias <= 30) return "bg-amber-50/30 hover:bg-amber-50/60 border-l-amber-400";
    return "hover:bg-muted/30 border-l-transparent";
  };

  // Badges: Transparent backgrounds, subtle borders, focused text color
  const getCondicionBadge = (condicion: string | null) => {
    switch (condicion) {
      case "ACTIVO":
        return <Badge variant="outline" className="text-emerald-700 bg-emerald-500/10 border-emerald-500/20 font-medium px-2 py-0.5 text-[11px] shadow-none">ACTIVO</Badge>;
      case "BAJA":
        return <Badge variant="outline" className="text-muted-foreground bg-muted/50 border-border/50 font-medium px-2 py-0.5 text-[11px] shadow-none">BAJA</Badge>;
      case "PENDIENTE":
      case "PENDIENTE DE FIRMA":
        return <Badge variant="outline" className="text-amber-700 bg-amber-500/10 border-amber-500/20 font-medium px-2 py-0.5 text-[11px] shadow-none">PENDIENTE</Badge>;
      default:
        return <span className="text-muted-foreground text-xs">—</span>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA]">
      {/* Document Header */}
      <div className="flex flex-col gap-2 px-8 pt-8 pb-6 bg-white border-b border-border/40">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary/80" />
              Gestión de Agencias
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl mt-1">
              Directorio del canal de ventas externo. Gestione contratos, estado de vigencia y representantes legales.
            </p>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" onClick={loadAgencias} size="icon" className="h-9 w-9 text-muted-foreground" title="Actualizar datos">
               <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
             </Button>
             <Button className="h-9 font-medium shadow-sm">
               + Nueva Agencia
             </Button>
          </div>
        </div>
        
        {/* Quick Analytics Bar (Miniature) */}
        {!loading && (
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Activas:</span>
              <span className="font-semibold text-foreground">{counts.activos}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Por Vencer:</span>
              <span className="font-semibold text-foreground">{counts.porVencer}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">Vencidas:</span>
              <span className="font-semibold text-foreground">{counts.vencidos}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 flex-1">
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col h-full">
          
          {/* Sticky Toolbar */}
          <div className="p-3 border-b bg-muted/10 flex flex-col sm:flex-row gap-3 items-center justify-between sticky top-0 z-10">
             <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar RUC, nombre o razón social..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 w-full bg-white transition-colors focus-visible:ring-1 border-border/60 shadow-none"
                />
             </div>
             
             <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

                <Select value={filterCondicion} onValueChange={setFilterCondicion}>
                  <SelectTrigger className="h-9 w-[150px] bg-white border-border/60 shadow-none text-sm">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Cualquier estado</SelectItem>
                    <SelectItem value="ACTIVO">Activos</SelectItem>
                    <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                    <SelectItem value="BAJA">Bajas</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterVigencia} onValueChange={setFilterVigencia}>
                  <SelectTrigger className="h-9 w-[160px] bg-white border-border/60 shadow-none text-sm">
                    <SelectValue placeholder="Vigencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Cualquier vigencia</SelectItem>
                    <SelectItem value="VIGENTE">Vigente</SelectItem>
                    <SelectItem value="POR VENCER">Por vencer (30d)</SelectItem>
                    <SelectItem value="NO VIGENTE">Vencidos</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>

          {/* Data Table */}
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="w-[120px] text-[11px] font-medium uppercase tracking-wider text-muted-foreground h-10">Identidad</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground h-10">Razón Social</TableHead>
                <TableHead className="w-[140px] text-[11px] font-medium uppercase tracking-wider text-muted-foreground h-10">Condición</TableHead>
                <TableHead className="w-[200px] text-[11px] font-medium uppercase tracking-wider text-muted-foreground h-10">PULSO VIGENCIA</TableHead>
                <TableHead className="w-[180px] text-[11px] font-medium uppercase tracking-wider text-muted-foreground h-10">Supervisión</TableHead>
                <TableHead className="w-[80px] text-right h-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="border-border/40">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j} className="py-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredAgencias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                       <Search className="h-8 w-8 text-muted-foreground/30" />
                       <p className="text-sm">No se encontraron agencias coincidentes.</p>
                       <Button variant="link" size="sm" onClick={() => { setSearchTerm(""); setFilterCondicion("ALL"); setFilterVigencia("ALL"); }}>
                         Limpiar todos los filtros
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgencias.map((agencia) => {
                  const isExpired = agencia.dias_vencimiento !== null && agencia.dias_vencimiento < 0;
                  
                  return (
                    <TableRow 
                      key={agencia.ruc} 
                      className={cn(
                        "group transition-colors border-b border-border/40 border-l-[3px]",
                        getUrgencyRowClass(agencia.dias_vencimiento)
                      )}
                    >
                      <TableCell className="align-top py-4">
                        <div className="font-mono text-sm font-medium text-foreground/80">{agencia.ruc}</div>
                        <div className="text-[10px] mt-1 text-muted-foreground/60 font-medium tracking-wide uppercase">
                          {agencia.tipo_agencia === "CALL EXTERNO" ? "CALL" : "AGENCIA"}
                        </div>
                      </TableCell>
                      
                      <TableCell className="align-top py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground/90 leading-tight mb-1">
                            {agencia.razon_social}
                          </span>
                          {agencia.nombre_comercial && agencia.nombre_comercial !== agencia.razon_social && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-border" />
                              {agencia.nombre_comercial}
                            </span>
                          )}
                          {agencia.correos && agencia.correos.length > 0 && (
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{agencia.correos[0]}</span>
                              {agencia.correos.length > 1 && <span>+{agencia.correos.length - 1}</span>}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="align-top py-4">
                        {getCondicionBadge(agencia.condicion)}
                      </TableCell>
                      
                      <TableCell className="align-top py-4">
                         <div className="flex flex-col gap-1.5">
                            {/* Vigency Pulse */}
                            {agencia.vigencia_contrato === "NO VIGENTE" ? (
                               <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  VENCIDO
                               </div>
                            ) : agencia.vigencia_contrato === "VIGENTE" ? (
                               <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  VIGENTE
                               </div>
                            ) : (
                               <span className="text-xs text-muted-foreground">SIN FECHA</span>
                            )}
                            
                            {agencia.dias_vencimiento !== null && (
                               <div className={cn(
                                 "text-xs font-mono tracking-tight", 
                                 agencia.dias_vencimiento < 0 ? "text-rose-600" : 
                                 agencia.dias_vencimiento <= 30 ? "text-amber-600" : "text-muted-foreground"
                               )}>
                                  {agencia.dias_vencimiento < 0 
                                      ? `hace ${Math.abs(agencia.dias_vencimiento)} d` 
                                      : `en ${agencia.dias_vencimiento} d`}
                               </div>
                            )}
                         </div>
                      </TableCell>
                      
                      <TableCell className="align-top py-4">
                         <div className="text-sm font-medium text-foreground/80">{agencia.supervisor || "—"}</div>
                         <div className="text-[11px] text-muted-foreground mt-1 max-w-[150px] truncate" title={agencia.alcance || ""}>
                           {agencia.alcance || "Sin zona"}
                         </div>
                      </TableCell>
                      
                      <TableCell className="align-middle text-right pr-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-primary border-primary/40 bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-all font-medium shadow-sm" 
                          asChild
                        >
                          <Link href={`/agencies/${agencia.ruc}`}>
                            Ver / Editar <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
