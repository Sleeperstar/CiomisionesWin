"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { smartValidationSchema, type SmartValidationFormValues } from "@/lib/schemas";
import { validateSalesData, type ValidateSalesDataOutput } from "@/ai/flows/validate-sales-data";
import React, { useState } from 'react';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const exampleSalesRecord = JSON.stringify({
  "saleId": "S1001",
  "product": "Enterprise Suite",
  "amount": 12000,
  "commissionRate": 0.10,
  "calculatedCommission": 1200,
  "salesRep": "John Doe",
  "region": "North America",
  "notes": "Customer requested a 5% discount, approved."
}, null, 2);

const exampleCommissionRules = JSON.stringify({
  "standardRate": 0.10,
  "tierThresholds": [
    { "amount": 10000, "rate": 0.12 },
    { "amount": 20000, "rate": 0.15 }
  ],
  "productSpecificRates": {
    "Basic Plan": 0.08,
    "Enterprise Suite": 0.10 // Standard, but could be overridden
  },
  "regionBonuses": {
    "EMEA": 0.01 // Additional 1% for EMEA
  },
  "validationRules": [
    "Commission cannot exceed 20% of sale amount.",
    "Discounts over 10% require manager approval (not reflected in data, flag for check)."
  ]
}, null, 2);


export default function SmartValidationPage() {
  const { toast } = useToast();
  const [validationResult, setValidationResult] = useState<ValidateSalesDataOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SmartValidationFormValues>({
    resolver: zodResolver(smartValidationSchema),
    defaultValues: {
      salesRecord: exampleSalesRecord,
      commissionRules: exampleCommissionRules,
    },
  });

  async function onSubmit(data: SmartValidationFormValues) {
    setIsLoading(true);
    setValidationResult(null);
    try {
      const result = await validateSalesData({
        salesRecord: data.salesRecord,
        commissionRules: data.commissionRules,
      });
      setValidationResult(result);
      toast({
        title: "Validation Complete",
        description: result.needsValidation ? "Record needs manual review." : "Record appears valid.",
      });
    } catch (error: any) {
      console.error("Validation error:", error);
      toast({
        title: "Validation Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Icons.SmartValidation className="h-6 w-6 text-primary" />
            Smart Sales Data Validation Tool
          </CardTitle>
          <CardDescription>
            Use AI to validate sales records against commission rules and identify discrepancies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="salesRecord"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales Record (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter sales record as a JSON string..."
                        className="min-h-[150px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide the sales data in JSON format.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commissionRules"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Rules (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter commission rules as a JSON string..."
                        className="min-h-[150px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Define the commission rules in JSON format.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                {isLoading ? (
                 <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating...
                  </div>
                ) : "Validate Data"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {validationResult && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Validation Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={validationResult.needsValidation ? "destructive" : "default"}>
              <Icons.ShieldCheck className="h-5 w-5" />
              <AlertTitle className="font-semibold">
                {validationResult.needsValidation
                  ? "Manual Validation Required"
                  : "Record Appears Valid"}
              </AlertTitle>
              <AlertDescription>{validationResult.reason}</AlertDescription>
            </Alert>
            
            {validationResult.suggestedCommissionAdjustment && (
               <div className="p-4 border rounded-md bg-secondary/50">
                <h4 className="font-semibold text-secondary-foreground mb-1">Suggested Commission Adjustment:</h4>
                <p className="text-sm text-secondary-foreground">{validationResult.suggestedCommissionAdjustment}</p>
              </div>
            )}
          </CardContent>
           <CardFooter>
            <Badge variant={validationResult.needsValidation ? "destructive" : "default"}>
              Status: {validationResult.needsValidation ? "Needs Review" : "OK"}
            </Badge>
           </CardFooter>
        </Card>
      )}
    </div>
  );
}
