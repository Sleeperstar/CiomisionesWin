"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/icons";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes"; // Assuming next-themes is or will be installed for theme toggling

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Icons.Dashboard },
  { href: "/agencies", label: "Agencies", icon: Icons.Agencies },
  { href: "/upload-sales", label: "Upload Sales", icon: Icons.UploadSales },
  { href: "/smart-validation", label: "Smart Validation", icon: Icons.SmartValidation },
  { href: "/settings", label: "Settings", icon: Icons.Settings },
];

export function MainNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <Sidebar variant="sidebar" collapsible="icon" side="left">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* Placeholder for logo, can be an SVG or Image */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-sidebar-primary-foreground">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          <h1 className="text-xl font-semibold text-sidebar-primary-foreground group-data-[collapsible=icon]:hidden">
            ComisionesPro
          </h1>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                tooltip={{ children: item.label, className: "bg-primary text-primary-foreground" }}
                className={cn(
                  "justify-start",
                  (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)))
                    ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:flex">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Icons.Moon /> : <Icons.Sun />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
