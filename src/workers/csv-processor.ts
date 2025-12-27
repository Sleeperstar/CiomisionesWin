// src/workers/csv-processor.ts
import Papa from 'papaparse';

const TIMESTAMP_FIELDS = ["FECHA_VENTA", "FECHA_VALIDACION", "INSTALADO_REGISTRO", "FECHA_INSTALADO", "WS_RECIBO1_EMISION", "RECIBO1_PAGADO", "WS_RECIBO2_EMISION", "RECIBO2_PAGADO", "WS_2PAGOC_EMISION", "2_PAGOS_COMPLETOS", "WS_RECIBO3_EMISION", "RECIBO3_PAGADO", "WS_RECIBO1_VENCIMIENTO", "WS_RECIBO2_VENCIMIENTO", "WS_RECIBO3_VENCIMIENTO"];
const DATE_FIELDS = ["FECHA_SUBIDA_DATA"];
const INTEGER_FIELDS = ["COD_PEDIDO", "ID_PREDIO", "ANCHO_BANDA", "WIN_BOX", "PLAN_GAMER", "PLAN_WIN_TV", "PLAN_DTV_GO", "PLAN_DTV_FULL", "WIN_GAMES", "FONO_WIN", "DGO_L1MAX", "PLAN_L1MAX", "PLAN_WIN_TV_PLUS", "PLAN_WIN_TV_PREMIUM", "PLAN_WIN_TV_L1MAX", "PLAN_WIN_TV_L1MAX_PREMIUM", "CODIGO_INSTALADO", "PERIODO", "PERIODO_ALTA", "CORTE_1", "CORTE_2", "CORTE_3", "CORTE_4", "PERIODO_COMI"];
const FLOAT_FIELDS = ["PRECIO_CON_IGV", "PRECIO_CON_IGV_EXTERNO", "PRECIO_CON_IGV_STAFF"];
const STRING_FIELDS = ["HEREDADO", "INSTALADO"];

/**
 * Convierte una fecha en formato 'DD/MM/YYYY' o 'DD/MM/YYYY HH:mm:ss' al formato ISO 'YYYY-MM-DDTHH:mm:ssZ'.
 * Si el formato es inválido, devuelve null.
 * @param dateStr La cadena de texto de la fecha.
 * @returns La fecha en formato ISO o null.
 */
function convertToISO(dateStr: string): string | null {
    if (!dateStr || dateStr.trim() === '') {
        return null;
    }

    const parts = dateStr.split(/[\s/:]+/); // Divide por espacio, /, o :
    if (parts.length < 3) return null; // No es una fecha válida

    // Formato esperado: D, M, Y, ...
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    
    // Reordena a un formato que el constructor de Date entiende universalmente (YYYY-MM-DD)
    const isoDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // Incluye la parte de la hora si existe
    const timeStr = parts.length > 3 ? `T${parts[3]}:${parts[4] || '00'}:${parts[5] || '00'}` : 'T00:00:00';
    
    const finalDateStr = isoDateStr + timeStr;
    
    // Valida si la fecha construida es válida
    const date = new Date(finalDateStr);
    if (isNaN(date.getTime())) {
        return null; // La fecha es inválida (ej. mes 13)
    }

    return date.toISOString();
}


self.onmessage = (event) => {
    const { file, batchSize } = event.data;
    let recordsToUpload: any[] = [];
    let totalRows = 0;

    if (!file) {
        self.postMessage({ type: 'error', message: 'No se recibió ningún archivo en el worker.' });
        return;
    }

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transform: (value, header) => {
            const headerStr = String(header).trim();
            if (value === '' || value === null) return null;
            
            if (TIMESTAMP_FIELDS.includes(headerStr)) {
                return convertToISO(value);
            }
            if (DATE_FIELDS.includes(headerStr)) {
                // Convierte a formato YYYY-MM-DD para campos de tipo date
                const isoResult = convertToISO(value);
                return isoResult ? isoResult.split('T')[0] : null;
            }
            if (INTEGER_FIELDS.includes(headerStr)) {
                const parsed = parseInt(value, 10);
                return isNaN(parsed) ? null : parsed;
            }
            if (FLOAT_FIELDS.includes(headerStr)) {
                const parsed = parseFloat(value);
                return isNaN(parsed) ? null : parsed;
            }
            if (STRING_FIELDS.includes(headerStr)) {
                // Campos que ahora son varchar en lugar de integer
                return String(value);
            }
            return value;
        },
        chunk: (results, parser) => {
            const data = results.data as any[];
            totalRows += data.length;
            recordsToUpload.push(...data);
            if (recordsToUpload.length >= batchSize) {
                self.postMessage({ type: 'batch', data: recordsToUpload.splice(0, batchSize), cursor: results.meta.cursor });
            }
        },
        complete: () => {
            if (recordsToUpload.length > 0) {
                self.postMessage({ type: 'batch', data: recordsToUpload, cursor: file.size });
            }
            self.postMessage({ type: 'complete', totalRows });
        },
        error: (error) => {
            self.postMessage({ type: 'error', message: error.message });
        },
    });
};
