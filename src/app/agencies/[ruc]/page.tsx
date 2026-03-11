"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getAgenciaByRuc, updateAgencia } from "@/lib/agencias-service";
import { type AgenciaView } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Save, Building2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgenciaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ruc = params.ruc as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agencia, setAgencia] = useState<AgenciaView | null>(null);
  
  // Controlled Form State
  const [formData, setFormData] = useState<Partial<AgenciaView>>({});

  useEffect(() => {
    if (ruc) {
      loadAgencia();
    }
  }, [ruc]);

  async function loadAgencia() {
    try {
      setLoading(true);
      const data = await getAgenciaByRuc(ruc);
      if (data) {
        setAgencia(data);
        setFormData({
            ...data,
            // Convert array to string for the input
            correos: data.correos ? (data.correos as string[]).join("; ") : "" as any
        });
      }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Parse correos back to array
      const correosStr = formData.correos as unknown as string;
      const correosArray = correosStr 
        ? correosStr.split(";").map(email => email.trim()).filter(Boolean)
        : [];
        
      const updatePayload = {
        ...formData,
        correos: correosArray,
      };
      
      // Remove read-only computed view fields before saving to the table
      delete updatePayload.dias_vencimiento;
      delete updatePayload.vigencia_contrato;
      delete updatePayload.fin_vigencia;

      await updateAgencia(ruc, updatePayload);
      
      toast({
        title: "Agencia actualizada",
        description: "Los cambios se guardaron correctamente.",
        className: "bg-emerald-50 text-emerald-900 border-emerald-200"
      });
      // Optionally reload to get fresh computed fields
      loadAgencia();
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al guardar";
        toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AgenciaDetailSkeleton />;
  if (!agencia) return <div className="p-8 text-center text-muted-foreground">Agencia no encontrada</div>;

  const isExpired = agencia.dias_vencimiento !== null && agencia.dias_vencimiento < 0;
  const isExpiring = agencia.dias_vencimiento !== null && agencia.dias_vencimiento >= 0 && agencia.dias_vencimiento <= 30;

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] pb-12">
      
      {/* 1. DOCUMENT HEADER (The "Signature" layout) */}
      <div className="bg-white border-b border-border/40 pt-6 px-8 pb-8 relative overflow-hidden">
         {/* Subtle pattern or accent in the background could go here */}
         <div className="absolute top-0 left-0 w-2 h-full bg-primary/10"></div>
         
         <div className="max-w-4xl mx-auto">
             <Button variant="ghost" size="sm" asChild className="mb-6 -ml-3 text-muted-foreground hover:text-foreground">
                <Link href="/agencies">
                   <ChevronLeft className="mr-1 h-4 w-4" />
                   Volver al directorio
                </Link>
             </Button>
             
             <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                   <div className="flex items-center gap-3 mb-2">
                       <Building2 className="h-6 w-6 text-muted-foreground/50" />
                       <h1 className="text-3xl font-bold tracking-tight text-foreground/90">{agencia.razon_social}</h1>
                   </div>
                   <div className="flex items-center gap-4 text-muted-foreground">
                       <span className="font-mono text-lg font-medium tracking-wide">RUC: {agencia.ruc}</span>
                       <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                       <span className="uppercase text-sm font-medium tracking-wider">{agencia.tipo_agencia}</span>
                   </div>
                </div>
                
                {/* Visual Status Badges (Document Style) */}
                <div className="flex gap-2">
                   <div className={cn(
                       "px-3 py-1.5 border rounded-md text-sm font-medium shadow-sm transition-colors",
                       agencia.condicion === "ACTIVO" ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" :
                       agencia.condicion === "BAJA" ? "bg-muted/50 text-muted-foreground border-border/50" :
                       "bg-amber-50 text-amber-700 border-amber-200/50"
                   )}>
                       ESTADO: {agencia.condicion}
                   </div>
                   
                   <div className={cn(
                       "px-3 py-1.5 flex items-center gap-1.5 border rounded-md text-sm font-medium shadow-sm",
                       agencia.vigencia_contrato === "VIGENTE" ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" :
                       "bg-rose-50 text-rose-700 border-rose-200/50"
                   )}>
                       {agencia.vigencia_contrato === "VIGENTE" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                       {agencia.vigencia_contrato}
                   </div>
                </div>
             </div>
         </div>
      </div>

      {/* 2. FORM CONTENT AREA (Asymmetric Grid) */}
      <div className="max-w-4xl mx-auto w-full px-8 py-8 space-y-10">
      
         {/* SECTION: Información Comercial */}
         <section className="space-y-4">
            <div className="pb-2 border-b border-border/40">
               <h2 className="text-lg font-semibold text-foreground">1. Información Comercial</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
               <div className="space-y-2">
                  <Label htmlFor="nombre_comercial" className="text-muted-foreground/80 font-medium">Nombre Comercial</Label>
                  <Input 
                    id="nombre_comercial" 
                    name="nombre_comercial" 
                    value={formData.nombre_comercial || ""} 
                    onChange={handleInputChange} 
                    className="bg-white/50 border-border/60 shadow-none focus-visible:bg-white"
                  />
               </div>
               
               <div className="space-y-2">
                  <Label htmlFor="condicion" className="text-muted-foreground/80 font-medium">Condición Operativa</Label>
                  <Select value={formData.condicion || ""} onValueChange={(val) => handleSelectChange("condicion", val)}>
                    <SelectTrigger id="condicion" className="bg-white/50 border-border/60 shadow-none focus:bg-white">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVO">ACTIVO</SelectItem>
                      <SelectItem value="BAJA">BAJA</SelectItem>
                      <SelectItem value="PENDIENTE DE FIRMA">PENDIENTE DE FIRMA</SelectItem>
                      <SelectItem value="MARCHA BLANCA">MARCHA BLANCA</SelectItem>
                    </SelectContent>
                  </Select>
               </div>

               <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="domicilio_fiscal" className="text-muted-foreground/80 font-medium">Domicilio Fiscal</Label>
                  <Input 
                    id="domicilio_fiscal" 
                    name="domicilio_fiscal" 
                    value={formData.domicilio_fiscal || ""} 
                    onChange={handleInputChange} 
                    className="bg-white/50 border-border/60 shadow-none focus-visible:bg-white"
                  />
               </div>
            </div>
         </section>

         {/* SECTION: Contrato y Vigencia (The "Signature" detail part) */}
         <section className="space-y-4">
            <div className="pb-2 border-b border-border/40">
               <h2 className="text-lg font-semibold text-foreground">2. Contrato y Vigencia</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                   <div className="space-y-2">
                      <Label htmlFor="fecha_inicio_operaciones" className="text-muted-foreground/80 font-medium">Inicio de Operaciones</Label>
                      <Input 
                        id="fecha_inicio_operaciones" 
                        name="fecha_inicio_operaciones" 
                        type="date"
                        value={formData.fecha_inicio_operaciones || ""} 
                        onChange={handleInputChange}
                        className="bg-white/50 border-border/60 shadow-none focus-visible:bg-white font-mono text-sm"
                      />
                   </div>
                   <div className="space-y-2">
                      <Label htmlFor="mes_cese" className="text-muted-foreground/80 font-medium">Mes de Cese (Opcional)</Label>
                      <Input 
                        id="mes_cese" 
                        name="mes_cese" 
                        type="month"
                        value={formData.mes_cese || ""} 
                        onChange={handleInputChange}
                        className="bg-white/50 border-border/60 shadow-none focus-visible:bg-white font-mono text-sm"
                      />
                   </div>
                   
                   {/* Carta Fianza subgrid */}
                   <div className="space-y-2 sm:col-span-2 pt-2">
                      <Label className="text-sm font-medium text-foreground">Carta Fianza (Garantía)</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-md border border-border/40 bg-muted/10">
                         <div className="space-y-2">
                            <Label htmlFor="inicio_vigencia" className="text-muted-foreground/70 text-xs">Emisión / Inicio Vigencia</Label>
                            <Input 
                              id="inicio_vigencia" 
                              name="inicio_vigencia" 
                              type="date"
                              value={formData.inicio_vigencia || ""} 
                              onChange={handleInputChange}
                              className="bg-white border-border/40 shadow-none font-mono text-sm"
                            />
                         </div>
                         <div className="space-y-2">
                            <Label htmlFor="vencimiento_carta_fianza" className="text-muted-foreground/70 text-xs">Vencimiento Carta Fianza</Label>
                            <Input 
                              id="vencimiento_carta_fianza" 
                              name="vencimiento_carta_fianza" 
                              type="date"
                              value={formData.vencimiento_carta_fianza || ""} 
                              onChange={handleInputChange}
                              className="bg-white border-border/40 shadow-none font-mono text-sm"
                            />
                         </div>
                      </div>
                   </div>
               </div>
               
               {/* Vigency Pulse Panel Focus */}
               <div className={cn(
                   "flex flex-col items-center justify-center p-6 rounded-lg border text-center relative overflow-hidden",
                   isExpired ? "bg-rose-50/50 border-rose-200" : 
                   isExpiring ? "bg-amber-50/50 border-amber-200" : "bg-emerald-50/50 border-emerald-200"
               )}>
                   <Clock className={cn(
                       "h-8 w-8 mb-3 opacity-20 absolute top-4 right-4",
                       isExpired ? "text-rose-600" : isExpiring ? "text-amber-600" : "text-emerald-600"
                   )} />
                   
                   <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      Estado de Fianza
                   </span>
                   {agencia.dias_vencimiento === null ? (
                       <span className="text-xl font-medium text-muted-foreground mt-2">Sin fechas</span>
                   ) : (
                       <>
                          <div className={cn(
                              "text-4xl font-mono font-semibold tracking-tighter mt-1 mb-1",
                              isExpired ? "text-rose-600" : isExpiring ? "text-amber-600" : "text-emerald-600"
                          )}>
                             {Math.abs(agencia.dias_vencimiento)}
                          </div>
                          <span className={cn(
                              "text-sm font-medium",
                              isExpired ? "text-rose-700/80" : isExpiring ? "text-amber-700/80" : "text-emerald-700/80"
                          )}>
                             días {isExpired ? "vencidos" : "restantes"}
                          </span>
                       </>
                   )}
                   <div className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest pt-4 border-t border-border/50 w-full">
                      Fin calc: {agencia.fin_vigencia || "N/A"}
                   </div>
               </div>
            </div>
         </section>

         {/* SECTION: Representante Técnico Legal */}
         <section className="space-y-4">
            <div className="pb-2 border-b border-border/40 flex items-center justify-between">
               <h2 className="text-lg font-semibold text-foreground">3. Representación Legal</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6">
               <div className="space-y-2">
                  <Label htmlFor="rep_legal_dni" className="text-muted-foreground/80 font-medium">DNI Representante</Label>
                  <Input 
                    id="rep_legal_dni" 
                    name="rep_legal_dni" 
                    value={formData.rep_legal_dni || ""} 
                    onChange={handleInputChange} 
                    className="bg-white/50 border-border/60 shadow-none focus-visible:bg-white font-mono text-sm"
                  />
               </div>
               <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="rep_legal_nombre" className="text-muted-foreground/80 font-medium">Nombre Completo</Label>
                  <Input 
                    id="rep_legal_nombre" 
                    name="rep_legal_nombre" 
                    value={formData.rep_legal_nombre || ""} 
                    onChange={handleInputChange} 
                    className="bg-white/50 border-border/60 shadow-none focus-visible:bg-white"
                  />
               </div>
               <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="rep_legal_correo" className="text-muted-foreground/80 font-medium">Correo Representante</Label>
                  <Input 
                    id="rep_legal_correo" 
                    name="rep_legal_correo" 
                    type="email"
                    value={formData.rep_legal_correo || ""} 
                    onChange={handleInputChange} 
                    className="bg-white/50 border-border/60 shadow-none focus-visible:bg-white"
                  />
               </div>
            </div>
         </section>

         {/* SECTION: Operaciones Constantes */}
         <section className="space-y-4">
            <div className="pb-2 border-b border-border/40">
               <h2 className="text-lg font-semibold text-foreground">4. Operaciones y Contacto</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
               <div className="space-y-2">
                  <Label htmlFor="alcance" className="text-muted-foreground/80 font-medium">Zona / Alcance</Label>
                  <Input 
                    id="alcance" 
                    name="alcance" 
                    value={formData.alcance || ""} 
                    onChange={handleInputChange} 
                    className="bg-white/50 border-border/60 shadow-none focus-visible:bg-white"
                    placeholder="Ej. LIMA ESTE"
                  />
               </div>
               <div className="space-y-2">
                  <Label htmlFor="supervisor" className="text-muted-foreground/80 font-medium">Supervisor Asignado</Label>
                  <Input 
                    id="supervisor" 
                    name="supervisor" 
                    value={formData.supervisor || ""} 
                    onChange={handleInputChange} 
                    className="bg-white/50 border-border/60 shadow-none focus-visible:bg-white uppercase"
                  />
               </div>
               <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="correos" className="text-muted-foreground/80 font-medium flex items-center gap-2">
                      Correos Operativos <span className="text-xs text-muted-foreground font-normal bg-muted px-1.5 py-0.5 rounded">Separar con ";"</span>
                  </Label>
                  <Input 
                    id="correos" 
                    name="correos" 
                    value={formData.correos as unknown as string || ""} 
                    onChange={handleInputChange} 
                    className="bg-white/50 border-border/60 shadow-none focus-visible:bg-white text-sm"
                    placeholder="email1@ejemplo.com; email2@ejemplo.com"
                  />
               </div>
               <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="comentario" className="text-muted-foreground/80 font-medium">Anotaciones / Comentarios</Label>
                  <textarea 
                    id="comentario" 
                    name="comentario" 
                    value={formData.comentario || ""} 
                    onChange={(e) => setFormData(prev => ({ ...prev, comentario: e.target.value }))}
                    className="flex min-h-[80px] w-full rounded-md bg-white/50 border border-border/60 shadow-none px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:bg-white focus-visible:ring-ring"
                  />
               </div>
            </div>
         </section>

         {/* SUBMIT */}
         <div className="pt-8 mt-8 border-t border-border flex justify-end">
            <Button 
               onClick={handleSave} 
               disabled={saving}
               className="h-10 px-8 shadow-sm font-medium"
            >
               {saving ? "Guardando..." : (
                  <>
                     <Save className="mr-2 h-4 w-4" />
                     Guardar Cambios
                  </>
               )}
            </Button>
         </div>

      </div>
    </div>
  );
}

function AgenciaDetailSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA]">
      <div className="bg-white border-b pt-6 px-8 pb-8">
         <div className="max-w-4xl mx-auto">
             <Skeleton className="h-5 w-24 mb-6" />
             <div className="flex justify-between">
                <div className="space-y-3">
                   <Skeleton className="h-9 w-80" />
                   <Skeleton className="h-5 w-48" />
                </div>
                <div className="flex gap-2">
                   <Skeleton className="h-8 w-24" />
                   <Skeleton className="h-8 w-24" />
                </div>
             </div>
         </div>
      </div>
      <div className="max-w-4xl mx-auto w-full px-8 py-8 space-y-10">
         {[...Array(4)].map((_, i) => (
             <section key={i} className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-2 gap-6">
                   <Skeleton className="h-10 w-full" />
                   <Skeleton className="h-10 w-full" />
                </div>
             </section>
         ))}
      </div>
    </div>
  );
}
