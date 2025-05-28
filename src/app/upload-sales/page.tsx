"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Label } from '@/components/ui/label';

export default function UploadSalesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file.",
          variant: "destructive",
        });
        setSelectedFile(null);
        event.target.value = ""; // Reset file input
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    // Simulate file upload
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In a real app, you'd use FormData to send the file to a server:
    // const formData = new FormData();
    // formData.append("file", selectedFile);
    // try {
    //   const response = await fetch("/api/upload-sales", { method: "POST", body: formData });
    //   if (!response.ok) throw new Error("Upload failed");
    //   const result = await response.json();
    //   toast({ title: "Upload Successful", description: `${selectedFile.name} has been uploaded.` });
    // } catch (error) {
    //   toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    // }

    toast({
      title: "Upload Successful (Mock)",
      description: `${selectedFile.name} has been processed.`,
    });
    setSelectedFile(null);
    const fileInput = event.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (fileInput) fileInput.value = ""; // Reset file input visually
    setIsUploading(false);
  };

  return (
    <Card className="shadow-lg max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Icons.UploadSales className="h-6 w-6 text-primary" />
          Upload Sales Records
        </CardTitle>
        <CardDescription>
          Upload a CSV file containing sales records for commission calculation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="csvFile" className="mb-2 block text-sm font-medium">Sales CSV File</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              disabled={isUploading}
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-muted-foreground">
                Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={!selectedFile || isUploading}>
            {isUploading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </div>
            ) : (
              "Upload and Process"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
