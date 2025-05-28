'use server';

/**
 * @fileOverview Validates sales data against commission rules and identifies records needing manual validation.
 *
 * - validateSalesData - Function to validate sales data and identify discrepancies.
 * - ValidateSalesDataInput - Input type for the validateSalesData function.
 * - ValidateSalesDataOutput - Return type for the validateSalesData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateSalesDataInputSchema = z.object({
  salesRecord: z.string().describe('A JSON string containing the sales record to validate.'),
  commissionRules: z.string().describe('A JSON string containing the commission rules to validate against.'),
});
export type ValidateSalesDataInput = z.infer<typeof ValidateSalesDataInputSchema>;

const ValidateSalesDataOutputSchema = z.object({
  needsValidation: z.boolean().describe('Indicates if the sales record needs manual validation.'),
  reason: z.string().describe('The reason why the sales record needs manual validation.'),
  suggestedCommissionAdjustment: z.string().optional().describe('Suggested adjustment of the commission amount, if applicable.'),
});
export type ValidateSalesDataOutput = z.infer<typeof ValidateSalesDataOutputSchema>;

export async function validateSalesData(input: ValidateSalesDataInput): Promise<ValidateSalesDataOutput> {
  return validateSalesDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'validateSalesDataPrompt',
  input: {schema: ValidateSalesDataInputSchema},
  output: {schema: ValidateSalesDataOutputSchema},
  prompt: `You are an expert sales data validator. Your role is to review sales records against predefined commission rules and identify any discrepancies that require manual validation.

Commission Rules:
{{{commissionRules}}}

Sales Record:
{{{salesRecord}}}

Based on the commission rules and the sales record, determine if the sales record needs manual validation. Provide a clear and concise reason for your determination. If the sales record violates any commission rules or if there are any inconsistencies, the sales record needs validation.
If a commission adjustment is applicable, suggest the adjustment.

Your response should be structured as follows:
needsValidation: <true or false>
reason: <explanation>
suggestedCommissionAdjustment: <if applicable, suggestion, else leave empty>
`,
});

const validateSalesDataFlow = ai.defineFlow(
  {
    name: 'validateSalesDataFlow',
    inputSchema: ValidateSalesDataInputSchema,
    outputSchema: ValidateSalesDataOutputSchema,
  },
  async input => {
    try {
      // Parse the JSON strings into objects
      const salesRecord = JSON.parse(input.salesRecord);
      const commissionRules = JSON.parse(input.commissionRules);

      // Log the parsed data for debugging
      console.log('Sales Record:', salesRecord);
      console.log('Commission Rules:', commissionRules);
    } catch (e) {
      console.error('Failed to parse JSON data', e);
      // If parsing fails, return a default object indicating validation is needed
      return {
        needsValidation: true,
        reason: 'Failed to parse sales record or commission rules JSON. Please ensure they are valid JSON formats.',
      };
    }

    const {output} = await prompt(input);
    return output!;
  }
);
