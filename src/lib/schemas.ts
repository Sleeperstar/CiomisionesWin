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

export interface Parametro {
  id: number;
  RUC: string;
  AGENCIA: string;
  META: number;
  TOP: string;
  ZONA: string;
  PERIODO: string;
}

export interface SalesRecord {
    COD_PEDIDO: number;
    DNI_CLIENTE?: string | null;
    DEPARTAMENTO?: string | null;
    PROVINCIA?: string | null;
    DISTRITO?: string | null;
    ID_PREDIO?: number | null;
    PREDIO?: string | null;
    FECHA_VENTA?: string | null;
    FECHA_VALIDACION?: string | null;
    OFERTA?: string | null;
    ANCHO_BANDA?: number | null;
    TIPO_PLAN?: string | null;
    COMBINACION?: string | null;
    WIN_BOX?: number | null;
    PLAN_GAMER?: number | null;
    PLAN_WIN_TV?: number | null;
    PLAN_DTV_GO?: number | null;
    PLAN_DTV_FULL?: number | null;
    WIN_GAMES?: number | null;
    FONO_WIN?: number | null;
    PLAN_DGO_L1MAX?: number | null;
    PLAN_L1MAX?: number | null;
    PLAN_WIN_TV_PLUS?: number | null;
    PLAN_WIN_TV_PREMIUM?: number | null;
    PLAN_WIN_TV_L1MAX?: number | null;
    PLAN_WIN_TV_L1MAX_PREMIUM?: number | null;
    TIPO_VENTA?: string | null;
    PRECIO_CON_IGV?: number | null;
    PRECIO_CON_IGV_EXTERNO?: number | null;
    ORIGEN_VENTA?: string | null;
    DNI_ASESOR?: string | null;
    ASESOR?: string | null;
    CANAL?: string | null;
    INSTALADO_REGISTRO?: string | null;
    TIPO_ESTADO?: string | null;
    TIPO_MOTIVO?: string | null;
    PROCESADO?: string | null;
    HEREDADO?: number | null;
    ARBITRADO?: string | null;
    RESULTADO_ARBITRAJE?: string | null;
    INSTALADO?: number | null;
    FECHA_INSTALADO?: string | null;
    CODIGO_INSTALADO?: number | null;
    WS_RECIBO1_EMISION?: string | null;
    RECIBO1_PAGADO?: string | null;
    WS_RECIBO2_EMISION?: string | null;
    RECIBO2_PAGADO?: string | null;
    WS_2PAGOC_EMISION?: string | null;
    "2_PAGOS_COMPLETOS"?: string | null;
    WS_RECIBO3_EMISION?: string | null;
    RECIBO3_PAGADO?: string | null;
    PERIODO?: number | null;
    PERIODO_ALTA?: number | null;
    PERIODO_SUBIDA_DATA?: number | null;
    RUC?: string;
    AGENCIA?: string;
}
