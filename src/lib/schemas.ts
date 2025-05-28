import { z } from 'zod';

export const agencyFormSchema = z.object({
  agencyName: z.string().min(2, { message: "Agency name must be at least 2 characters." }).max(100),
  contactPerson: z.string().min(2).max(100).optional(),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }).max(15).optional(),
  addressLine1: z.string().min(5).max(100),
  addressLine2: z.string().max(100).optional(),
  city: z.string().min(2).max(50),
  state: z.string().min(2).max(50),
  zipCode: z.string().min(3).max(10),
  country: z.string().min(2).max(50),
});

export type AgencyFormValues = z.infer<typeof agencyFormSchema>;

export const smartValidationSchema = z.object({
  salesRecord: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    { message: "Sales record must be a valid JSON string." }
  ).describe('A JSON string containing the sales record to validate.'),
  commissionRules: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    { message: "Commission rules must be a valid JSON string." }
  ).describe('A JSON string containing the commission rules to validate against.'),
});

export type SmartValidationFormValues = z.infer<typeof smartValidationSchema>;
