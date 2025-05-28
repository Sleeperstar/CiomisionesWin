import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import Image from "next/image";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">
            Welcome to ComisionesPro
          </CardTitle>
          <CardDescription className="text-lg">
            Your intelligent sales commission management platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Navigate using the sidebar to manage agencies, upload sales data, validate commissions, and configure settings.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Total Agencies" value="12" icon={<Icons.Agencies className="h-6 w-6 text-primary" />} />
            <StatCard title="Sales Records Pending" value="150" icon={<Icons.UploadSales className="h-6 w-6 text-primary" />} />
            <StatCard title="Validations Needed" value="5" icon={<Icons.SmartValidation className="h-6 w-6 text-destructive" />} />
          </div>
           <div className="mt-6 rounded-lg overflow-hidden shadow-md">
            <Image 
              src="https://placehold.co/1200x400.png" 
              alt="Financial Dashboard Illustration" 
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
          +20.1% from last month (mock data)
        </p>
      </CardContent>
    </Card>
  );
}
