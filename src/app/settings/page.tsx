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
    return null; // Avoid hydration mismatch
  }

  return (
    <Card className="shadow-lg max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Icons.Settings className="h-6 w-6 text-primary" />
          Application Settings
        </CardTitle>
        <CardDescription>
          Manage your application preferences and configurations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Appearance</h3>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <Label htmlFor="dark-mode-switch" className="flex flex-col space-y-1">
              <span>Dark Mode</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Toggle between light and dark themes.
              </span>
            </Label>
            <Switch
              id="dark-mode-switch"
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="Toggle dark mode"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Notifications</h3>
          <div className="flex items-center justify-between p-3 border rounded-md">
             <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
              <span>Email Notifications</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Receive email updates and alerts.
              </span>
            </Label>
            <Switch id="email-notifications" defaultChecked aria-label="Toggle email notifications"/>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Data &amp; Privacy</h3>
           <Button variant="outline">Export My Data</Button>
           <Button variant="destructive" className="ml-2">Delete My Account</Button>
        </div>
        
      </CardContent>
    </Card>
  );
}
