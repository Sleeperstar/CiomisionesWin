import { z } from 'zod';

export const agencyFormSchema = z.object({
  agencyName: z.string().min(2, { message: "El nombre de la agencia debe tener al menos 2 caracteres." }).max(100),
  contactPerson: z.string().min(2).max(100).optional(),
  email: z.string().email({ message: "Dirección de correo electrónico inválida." }),
  phone: z.string().min(10, { message: "El número de teléfono debe tener al menos 10 dígitos." }).max(15).optional(),
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
    { message: "El registro de ventas debe ser una cadena JSON válida." }
  ).describe('Una cadena JSON que contiene el registro de ventas a validar.'),
  commissionRules: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    { message: "Las reglas de comisión deben ser una cadena JSON válida." }
  ).describe('Una cadena JSON que contiene las reglas de comisión contra las cuales validar.'),
});

export type SmartValidationFormValues = z.infer<typeof smartValidationSchema>;
