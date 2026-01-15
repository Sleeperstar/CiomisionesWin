"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import DashboardCharts from "@/components/dashboard/dashboard-charts";
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#f53c00] via-[#ff8300] to-[#ffa700] bg-clip-text text-transparent">
            Panel de Control
          </h1>
          <p className="text-muted-foreground mt-1">
            Dashboard interactivo de comisiones y resultados
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <img 
            src="/win-logo.png" 
            alt="Win Logo" 
            className="h-10 w-auto"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>
      </div>

      {/* Dashboard Charts */}
      <Suspense fallback={
        <div className="flex items-center justify-center h-96">
          <Icons.Spinner className="h-12 w-12 animate-spin text-[#f53c00]" />
          <span className="ml-4 text-xl text-muted-foreground">Cargando dashboard...</span>
        </div>
      }>
        <DashboardCharts />
      </Suspense>
    </div>
  );
}
