"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Building2, X, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgenciaOption {
    ruc: string;
    agencia: string;
    total_altas: number;
}

interface AgenciaSelectorProps {
    agenciasDisponibles: AgenciaOption[];
    agenciasSeleccionadas: string[];
    setAgenciasSeleccionadas: (value: string[] | ((prev: string[]) => string[])) => void;
    loadingAgencias: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
}

export default function AgenciaSelector({
    agenciasDisponibles,
    agenciasSeleccionadas,
    setAgenciasSeleccionadas,
    loadingAgencias,
    open,
    setOpen,
}: AgenciaSelectorProps) {
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[250px] justify-between bg-white dark:bg-slate-800"
                    disabled={loadingAgencias}
                >
                    <div className="flex items-center gap-2 truncate">
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {loadingAgencias ? (
                            <span className="text-muted-foreground">Cargando...</span>
                        ) : agenciasSeleccionadas.length === 0 ? (
                            <span className="text-muted-foreground">Todas las agencias</span>
                        ) : agenciasSeleccionadas.length === 1 ? (
                            <span className="truncate">
                                {agenciasDisponibles.find(a => a.ruc === agenciasSeleccionadas[0])?.agencia || agenciasSeleccionadas[0]}
                            </span>
                        ) : (
                            <span>{agenciasSeleccionadas.length} agencias</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Buscar agencia..." />
                    <CommandList>
                        <CommandEmpty>No se encontraron agencias</CommandEmpty>
                        <CommandGroup>
                            {agenciasDisponibles.map((agencia) => (
                                <CommandItem
                                    key={agencia.ruc}
                                    value={agencia.agencia}
                                    onSelect={() => {
                                        setAgenciasSeleccionadas((prev: string[]) => {
                                            if (prev.includes(agencia.ruc)) {
                                                return prev.filter(r => r !== agencia.ruc);
                                            } else {
                                                return [...prev, agencia.ruc];
                                            }
                                        });
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            agenciasSeleccionadas.includes(agencia.ruc) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="truncate">{agencia.agencia}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {agencia.total_altas} altas
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
                {agenciasSeleccionadas.length > 0 && (
                    <div className="border-t p-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setAgenciasSeleccionadas([])}
                        >
                            <X className="h-4 w-4 mr-2" />
                            Limpiar selección
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

