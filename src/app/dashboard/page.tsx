import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import Image from "next/image";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">
            Bienvenido a WinComisiones
          </CardTitle>
          <CardDescription className="text-lg">
            Tu plataforma inteligente para la gestión de comisiones de ventas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Navega usando la barra lateral para administrar agencias, subir datos de ventas, validar comisiones y configurar tus ajustes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Total de Agencias" value="12" icon={<Icons.Agencies className="h-6 w-6 text-primary" />} />
            <StatCard title="Registros de Ventas Pendientes" value="150" icon={<Icons.UploadSales className="h-6 w-6 text-primary" />} />
            <StatCard title="Validaciones Necesarias" value="5" icon={<Icons.SmartValidation className="h-6 w-6 text-destructive" />} />
          </div>
           <div className="mt-6 rounded-lg overflow-hidden shadow-md">
            <Image 
              src="https://placehold.co/1200x400.png" 
              alt="Ilustración de Panel Financiero" 
              width={1200} 
              height={400} 
              className="w-full h-auto object-cover"
              data-ai-hint="finance business"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          +20.1% desde el mes pasado (datos de prueba)
        </p>
      </CardContent>
    </Card>
  );
}
