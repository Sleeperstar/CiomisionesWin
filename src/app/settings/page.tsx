"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  if (!mounted) {
    return null; // Evita el desajuste de hidratación
  }

  return (
    <Card className="shadow-lg max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Icons.Settings className="h-6 w-6 text-primary" />
          Configuración de la Aplicación
        </CardTitle>
        <CardDescription>
          Administra tus preferencias y configuraciones de la aplicación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Apariencia</h3>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <Label htmlFor="dark-mode-switch" className="flex flex-col space-y-1">
              <span>Modo Oscuro</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Alterna entre temas claro y oscuro.
              </span>
            </Label>
            <Switch
              id="dark-mode-switch"
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="Alternar modo oscuro"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Notificaciones</h3>
          <div className="flex items-center justify-between p-3 border rounded-md">
             <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
              <span>Notificaciones por Correo</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Recibir actualizaciones y alertas por correo.
              </span>
            </Label>
            <Switch id="email-notifications" defaultChecked aria-label="Alternar notificaciones por correo"/>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Datos y Privacidad</h3>
           <Button variant="outline">Exportar Mis Datos</Button>
           <Button variant="destructive" className="ml-2">Eliminar Mi Cuenta</Button>
        </div>
        
      </CardContent>
    </Card>
  );
}
