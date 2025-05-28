"use client";

import React from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { MainNav } from "@/components/layout/main-nav";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  // DefaultOpen can be controlled by cookies or settings in a real app
  // For now, let's make it true by default on desktop and false on mobile (handled by Sidebar component logic)
  const [defaultOpen, setDefaultOpen] = React.useState(true);

  React.useEffect(() => {
    // Example: Read from cookie, not implemented here for brevity
    // const savedState = document.cookie.includes("sidebar_state=true");
    // setDefaultOpen(savedState);
    
    // Close sidebar by default on smaller screens initially
    if (window.innerWidth < 768) { // md breakpoint
        setDefaultOpen(false);
    }
  }, []);


  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <MainNav />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <div className="md:hidden"> {/* Show trigger only on mobile/tablet as sidebar is collapsible by icon on desktop */}
            <SidebarTrigger asChild>
              <Button variant="outline" size="icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"></line><line x1="3" x2="21" y1="12" y2="12"></line><line x1="3" x2="21" y1="18" y2="18"></line></svg>
                <span className="sr-only">Toggle Main Nav</span>
              </Button>
            </SidebarTrigger>
          </div>
          <div className="flex-1">
            {/* Potential breadcrumbs or page title here */}
          </div>
          {/* User menu or other header items could go here */}
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
        <footer className="border-t p-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ComisionesPro. All rights reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
