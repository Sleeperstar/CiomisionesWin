import { z } from 'zod';

// --- Agencias ---

export interface Agencia {
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
  tipo_agencia: 'AGENCIA EXTERNA' | 'CALL EXTERNO' | null;
  domicilio_fiscal: string | null;
  condicion: 'BAJA' | 'ACTIVO' | 'PENDIENTE' | null;
  mes_cese: string | null;
  fecha_inicio_operaciones: string | null;
  inicio_vigencia: string | null;
  fin_vigencia: string | null;
  carta_fianza: 'SI' | 'NO' | null;
  vencimiento_carta_fianza: string | null;
  alcance: string | null;
  supervisor: string | null;
  comentario: string | null;
  fecha_comentario: string | null;
  correos: string[] | null;
  rep_legal_dni: string | null;
  rep_legal_nombre: string | null;
  rep_legal_correo: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgenciaView extends Agencia {
  dias_vencimiento: number | null;
  vigencia_contrato: 'VIGENTE' | 'NO VIGENTE' | null;
}

export const agenciaEditSchema = z.object({
  razon_social: z.string().min(2, "La razón social es requerida"),
  nombre_comercial: z.string().nullable().optional(),
  tipo_agencia: z.enum(['AGENCIA EXTERNA', 'CALL EXTERNO']).nullable().optional(),
  domicilio_fiscal: z.string().nullable().optional(),
  condicion: z.enum(['BAJA', 'ACTIVO', 'PENDIENTE']).nullable().optional(),
  mes_cese: z.string().nullable().optional(),
  fecha_inicio_operaciones: z.string().nullable().optional(),
  inicio_vigencia: z.string().nullable().optional(),
  carta_fianza: z.enum(['SI', 'NO']).nullable().optional(),
  vencimiento_carta_fianza: z.string().nullable().optional(),
  alcance: z.string().nullable().optional(),
  supervisor: z.string().nullable().optional(),
  comentario: z.string().nullable().optional(),
  correos_input: z.string().optional(),
  rep_legal_dni: z.string().nullable().optional(),
  rep_legal_nombre: z.string().nullable().optional(),
  rep_legal_correo: z.string().nullable().optional(),
});

export type AgenciaEditFormValues = z.infer<typeof agenciaEditSchema>;

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
    DGO_L1MAX?: number | null;
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
    HEREDADO?: string | null;
    ARBITRADO?: string | null;
    RESULTADO_ARBITRAJE?: string | null;
    INSTALADO?: string | null;
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
    FECHA_SUBIDA_DATA?: string | null;
    PRECIO_CON_IGV_STAFF?: number | null;
    TIPO_VALIDACION?: string | null;
    GRUPO?: string | null;
    WS_RECIBO1_VENCIMIENTO?: string | null;
    CORTE_1?: number | null;
    CORTE_2?: number | null;
    WS_RECIBO2_VENCIMIENTO?: string | null;
    CORTE_3?: number | null;
    WS_RECIBO3_VENCIMIENTO?: string | null;
    CORTE_4?: number | null;
    MODULO_VENTA?: string | null;
    MODULO_CIUDAD?: string | null;
    PERIODO_COMI?: number | null;
}
