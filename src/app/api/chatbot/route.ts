import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Interfaz para los resultados
interface ResultadoFinal {
  periodo: number;
  zona: string;
  ruc: string;
  agencia: string;
  meta: number | null;
  top: string | null;
  altas: number;
  precio_sin_igv_promedio: number;
  porcentaje_cumplimiento: number | null;
  marcha_blanca: string;
  bono_arpu: string;
  factor_multiplicador: number;
  multiplicador_final: number;
  corte_1: number;
  corte_2: number;
  corte_3: number;
  corte_4: number;
  comision_total: number;
  pago_corte_1: number;
  total_a_pagar_corte_2: number;
  penalidad_1_monto: number;
  penalidad_2_monto: number;
  penalidad_3_monto: number;
  total_penalidades: number;
  clawback_1_monto: number;
  clawback_2_monto: number;
  clawback_3_monto: number;
  total_clawbacks: number;
  total_descuentos: number;
  resultado_neto_final: number;
}

// Helper para convertir número de mes a nombre
function obtenerNombreMes(mes: number): string {
  const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return meses[mes] || '';
}

// Función para obtener el esquema de la base de datos
async function getDatabaseSchema() {
  return `
Base de datos de Comisiones Win Telecom:

TABLA PRINCIPAL: resultados_finales (VISTA CONSOLIDADA)
Esta vista contiene TODOS los datos de comisiones consolidados de los 4 cortes:

Campos de identificación:
- periodo (INTEGER): Formato YYYYMM (ej: 202508 = agosto 2025)
- zona (VARCHAR): LIMA o PROVINCIA
- ruc (VARCHAR): RUC de la agencia
- agencia (VARCHAR): Nombre de la agencia

Datos de la agencia:
- meta (BIGINT): Meta de ventas asignada
- top (VARCHAR): Categoría (GOLD, SILVER, REGULAR)
- altas (BIGINT): Total de instalaciones validadas
- precio_sin_igv_promedio (NUMERIC): Precio promedio sin IGV
- porcentaje_cumplimiento (NUMERIC): % de cumplimiento de meta
- marcha_blanca (VARCHAR): Sí/No - Si está en periodo de prueba
- bono_arpu (VARCHAR): Sí/No - Si tiene bono ARPU
- factor_multiplicador (NUMERIC): Factor base
- multiplicador_final (NUMERIC): Factor con bonificaciones

Cortes (conteo de altas por corte):
- corte_1, corte_2, corte_3, corte_4 (BIGINT)

Comisiones y pagos:
- comision_total (NUMERIC): Comisión bruta total
- pago_corte_1 (NUMERIC): Monto pagado en corte 1
- total_a_pagar_corte_2 (NUMERIC): Monto pagado en corte 2

Penalidades (montos a descontar por churn):
- penalidad_1_monto (NUMERIC): Penalidad del corte 2
- penalidad_2_monto (NUMERIC): Penalidad del corte 3
- penalidad_3_monto (NUMERIC): Penalidad del corte 4
- total_penalidades (NUMERIC): Suma de las 3 penalidades

Clawbacks (devoluciones por incumplimiento):
- clawback_1_monto (NUMERIC): Clawback del corte 2
- clawback_2_monto (NUMERIC): Clawback del corte 3
- clawback_3_monto (NUMERIC): Clawback del corte 4
- total_clawbacks (NUMERIC): Suma de los 3 clawbacks

Totales finales:
- total_descuentos (NUMERIC): total_penalidades + total_clawbacks
- resultado_neto_final (NUMERIC): comision_total - total_descuentos

REGLAS DE NEGOCIO:
- Periodo formato: YYYYMM (202508 = agosto 2025)
- Comisión Total: Lo que debería recibir la agencia sin descuentos
- Penalidades: Descuentos por altas que no pagaron recibos (churn)
- Clawbacks: Devolución de comisión por incumplimiento de metas
- Resultado Neto Final: comision_total - total_penalidades - total_clawbacks
- Marcha Blanca: Agencias nuevas, tienen factor 2.5 automático
- Bono ARPU: +1 al multiplicador final
`;
}

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje requerido' },
        { status: 400 }
      );
    }

    // Obtener el esquema de la base de datos
    const dbSchema = await getDatabaseSchema();

    // Preparar mensajes para OpenAI
    const messages = [
      {
        role: 'system' as const,
        content: `Eres un asistente experto en comisiones de Win Telecom. Tu trabajo es ayudar a los usuarios a consultar información sobre comisiones, ventas y agencias.

${dbSchema}

INSTRUCCIONES:
1. Analiza la pregunta del usuario y determina qué tipo de consulta es:
   - COMISION: Si pregunta cuánto ganó, comisionó, total a pagar, neto final
   - PENALIDAD: Si pregunta por penalidad o descuento por churn
   - CLAWBACK: Si pregunta por clawback o devolución
   - DESCUENTOS: Si pregunta por descuentos totales
   - ALTAS: Si pregunta por altas o instalaciones
   - COMPARATIVA: Si quiere comparar varias agencias
   - DETALLE: Si quiere ver todo el detalle completo
   - RANKING: Si pregunta por las mejores o peores agencias
   
2. Convierte nombres de meses en español a formato YYYYMM:
   - "agosto 2025" -> 202508
   - "agosto" sin año -> 202508 (asume 2025)
   - "abril" -> 202504
   
3. Busca por nombre de agencia de manera flexible (ignora mayúsculas/minúsculas)

4. Para preguntas de ranking o comparativas, ordena apropiadamente

5. Responde de manera clara y concisa en español

6. NO uses asteriscos para negritas ni formato markdown, usa texto plano

7. Usa emojis para hacer la respuesta más visual

8. Siempre incluye el resultado_neto_final cuando sea relevante ya que es el monto real que recibe la agencia

EJEMPLOS:
"Cuánto comisionó ALIV en agosto?" -> buscar resultado_neto_final
"Cuál fue la penalidad de EXPORTEL?" -> buscar total_penalidades
"Qué agencias tuvieron más descuentos?" -> ranking por total_descuentos DESC
"Top 5 agencias de agosto" -> ranking por resultado_neto_final DESC LIMIT 5`,
      },
      ...conversationHistory,
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // Llamar a OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      functions: [
        {
          name: 'buscar_comisiones',
          description: 'Busca información de comisiones, penalidades, clawbacks o altas de una o varias agencias usando la vista consolidada resultados_finales',
          parameters: {
            type: 'object',
            properties: {
              agencia: {
                type: 'string',
                description: 'Nombre o parte del nombre de la agencia (ej: ALIV, EXPORTEL). Dejar vacío para buscar todas las agencias.',
              },
              periodo: {
                type: 'integer',
                description: 'Periodo en formato YYYYMM (ej: 202504 para abril 2025, 202508 para agosto 2025)',
              },
              zona: {
                type: 'string',
                description: 'Zona: LIMA o PROVINCIA. Dejar vacío para buscar en todas las zonas.',
              },
              tipo_consulta: {
                type: 'string',
                enum: ['comision', 'penalidad', 'clawback', 'descuentos', 'altas', 'detalle', 'ranking_mejores', 'ranking_penalizados'],
                description: 'Tipo de información: comision (neto final), penalidad (total penalidades), clawback (total clawbacks), descuentos (total descuentos), altas (instalaciones), detalle (todo), ranking_mejores (top agencias por neto), ranking_penalizados (agencias con más descuentos)',
              },
              limite: {
                type: 'integer',
                description: 'Límite de resultados para rankings (default 5)',
              },
            },
            required: ['periodo', 'tipo_consulta'],
          },
        },
      ],
      function_call: 'auto',
    });

    const responseMessage = completion.choices[0].message;

    // Si GPT quiere llamar una función
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);

      if (functionName === 'buscar_comisiones') {
        const { agencia, periodo, zona, tipo_consulta = 'detalle', limite = 5 } = functionArgs;
        
        // Construir query base
        let query = supabase.from('resultados_finales').select('*').eq('periodo', periodo);

        // Filtrar por zona si se especifica
        if (zona) {
          query = query.eq('zona', zona.toUpperCase());
        }

        // Filtrar por agencia si se especifica
        if (agencia) {
          query = query.ilike('agencia', `%${agencia}%`);
        }

        // Ordenar según el tipo de consulta
        switch (tipo_consulta) {
          case 'ranking_mejores':
            query = query.order('resultado_neto_final', { ascending: false }).limit(limite);
            break;
          case 'ranking_penalizados':
            query = query.gt('total_descuentos', 0).order('total_descuentos', { ascending: false }).limit(limite);
            break;
          default:
            query = query.order('resultado_neto_final', { ascending: false });
        }

        const { data, error } = await query;

        if (error) {
          return NextResponse.json({
            response: `Lo siento, hubo un error al buscar la información: ${error.message}`,
            conversationHistory: [
              ...conversationHistory,
              { role: 'user', content: message },
              { role: 'assistant', content: `Error: ${error.message}` },
            ],
          });
        }

        if (!data || data.length === 0) {
          const mesNombre = obtenerNombreMes(Number(String(periodo).substring(4, 6)));
          const añoStr = String(periodo).substring(0, 4);
          let mensajeNoData = `No encontré registros para el periodo ${mesNombre} ${añoStr}`;
          if (agencia) mensajeNoData += ` con la agencia "${agencia}"`;
          if (zona) mensajeNoData += ` en zona ${zona}`;
          mensajeNoData += `. Verifica que existan datos guardados en resultados finales.`;
          
          return NextResponse.json({
            response: mensajeNoData,
            conversationHistory: [
              ...conversationHistory,
              { role: 'user', content: message },
              { role: 'assistant', content: 'No se encontraron datos' },
            ],
          });
        }

        // Formatear respuesta según el tipo de consulta
        const mesNombre = obtenerNombreMes(Number(String(periodo).substring(4, 6)));
        const añoStr = String(periodo).substring(0, 4);
        
        let finalResponse = '';

        const typedData = data as ResultadoFinal[];
        
        switch (tipo_consulta) {
          case 'ranking_mejores':
            finalResponse = `🏆 TOP ${typedData.length} AGENCIAS - ${mesNombre} ${añoStr}\n`;
            finalResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            typedData.forEach((r: ResultadoFinal, index: number) => {
              const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
              finalResponse += `${medalla} ${r.agencia}\n`;
              finalResponse += `   Comisión: S/ ${Number(r.comision_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   Descuentos: S/ ${Number(r.total_descuentos || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   💰 Neto Final: S/ ${Number(r.resultado_neto_final || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   Altas: ${r.altas} | Mult: x${Number(r.multiplicador_final || 1.3).toFixed(1)}\n\n`;
            });
            break;

          case 'ranking_penalizados':
            finalResponse = `⚠️ AGENCIAS CON MAYORES DESCUENTOS - ${mesNombre} ${añoStr}\n`;
            finalResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            typedData.forEach((r: ResultadoFinal, index: number) => {
              const porcentaje = r.comision_total > 0 ? (r.total_descuentos / r.comision_total * 100).toFixed(1) : 0;
              finalResponse += `${index + 1}. ${r.agencia}\n`;
              finalResponse += `   Comisión bruta: S/ ${Number(r.comision_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   Penalidades: S/ ${Number(r.total_penalidades || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   Clawbacks: S/ ${Number(r.total_clawbacks || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   ❌ Total descuentos: S/ ${Number(r.total_descuentos || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })} (${porcentaje}%)\n`;
              finalResponse += `   💰 Neto Final: S/ ${Number(r.resultado_neto_final || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n\n`;
            });
            break;

          case 'comision':
            finalResponse = `💵 COMISIONES - ${mesNombre} ${añoStr}\n`;
            finalResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            typedData.forEach((r: ResultadoFinal) => {
              finalResponse += `📊 ${r.agencia}\n`;
              finalResponse += `   Zona: ${r.zona} | Top: ${r.top || 'REGULAR'}\n`;
              finalResponse += `   Altas: ${r.altas} | Meta: ${r.meta || '-'}\n`;
              finalResponse += `   % Cumplimiento: ${r.porcentaje_cumplimiento ? Number(r.porcentaje_cumplimiento).toFixed(1) + '%' : '-'}\n`;
              finalResponse += `   Multiplicador: x${Number(r.multiplicador_final || 1.3).toFixed(1)}\n\n`;
              finalResponse += `   💰 Comisión bruta: S/ ${Number(r.comision_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   💳 Pago Corte 1: S/ ${Number(r.pago_corte_1 || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   💳 Pago Corte 2: S/ ${Number(r.total_a_pagar_corte_2 || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   ❌ Descuentos: S/ ${Number(r.total_descuentos || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   ✅ NETO FINAL: S/ ${Number(r.resultado_neto_final || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n\n`;
            });
            break;

          case 'penalidad':
            finalResponse = `⚠️ PENALIDADES - ${mesNombre} ${añoStr}\n`;
            finalResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            typedData.forEach((r: ResultadoFinal) => {
              finalResponse += `📊 ${r.agencia}\n`;
              finalResponse += `   Penalidad 1 (Corte 2): S/ ${Number(r.penalidad_1_monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   Penalidad 2 (Corte 3): S/ ${Number(r.penalidad_2_monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   Penalidad 3 (Corte 4): S/ ${Number(r.penalidad_3_monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   ⚠️ TOTAL PENALIDADES: S/ ${Number(r.total_penalidades || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n\n`;
            });
            break;

          case 'clawback':
            finalResponse = `🔄 CLAWBACKS - ${mesNombre} ${añoStr}\n`;
            finalResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            typedData.forEach((r: ResultadoFinal) => {
              finalResponse += `📊 ${r.agencia}\n`;
              finalResponse += `   Clawback 1 (Corte 2): S/ ${Number(r.clawback_1_monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   Clawback 2 (Corte 3): S/ ${Number(r.clawback_2_monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   Clawback 3 (Corte 4): S/ ${Number(r.clawback_3_monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   🔄 TOTAL CLAWBACKS: S/ ${Number(r.total_clawbacks || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n\n`;
            });
            break;

          case 'descuentos':
            finalResponse = `❌ DESCUENTOS TOTALES - ${mesNombre} ${añoStr}\n`;
            finalResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            typedData.forEach((r: ResultadoFinal) => {
              const porcentaje = r.comision_total > 0 ? (r.total_descuentos / r.comision_total * 100).toFixed(1) : 0;
              finalResponse += `📊 ${r.agencia}\n`;
              finalResponse += `   Comisión bruta: S/ ${Number(r.comision_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   Total penalidades: S/ ${Number(r.total_penalidades || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   Total clawbacks: S/ ${Number(r.total_clawbacks || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   ❌ TOTAL DESCUENTOS: S/ ${Number(r.total_descuentos || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })} (${porcentaje}% de la comisión)\n`;
              finalResponse += `   ✅ Neto Final: S/ ${Number(r.resultado_neto_final || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n\n`;
            });
            break;

          case 'altas':
            finalResponse = `📈 ALTAS E INSTALACIONES - ${mesNombre} ${añoStr}\n`;
            finalResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            typedData.forEach((r: ResultadoFinal) => {
              finalResponse += `📊 ${r.agencia}\n`;
              finalResponse += `   Zona: ${r.zona} | Top: ${r.top || 'REGULAR'}\n`;
              finalResponse += `   📈 Total Altas: ${r.altas}\n`;
              finalResponse += `   Corte 1: ${r.corte_1 || 0} | Corte 2: ${r.corte_2 || 0}\n`;
              finalResponse += `   Corte 3: ${r.corte_3 || 0} | Corte 4: ${r.corte_4 || 0}\n`;
              finalResponse += `   🎯 Meta: ${r.meta || '-'}\n`;
              finalResponse += `   % Cumplimiento: ${r.porcentaje_cumplimiento ? Number(r.porcentaje_cumplimiento).toFixed(1) + '%' : '-'}\n\n`;
            });
            break;

          default: // detalle
            finalResponse = `📊 DETALLE COMPLETO - ${mesNombre} ${añoStr}\n`;
            finalResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            typedData.forEach((r: ResultadoFinal) => {
              const porcentaje = r.comision_total > 0 ? (r.total_descuentos / r.comision_total * 100).toFixed(1) : 0;
              finalResponse += `🏢 ${r.agencia}\n`;
              finalResponse += `   RUC: ${r.ruc} | Zona: ${r.zona}\n`;
              finalResponse += `   Categoría: ${r.top || 'REGULAR'}`;
              if (r.marcha_blanca === 'Sí') finalResponse += ` | 🆕 Marcha Blanca`;
              if (r.bono_arpu === 'Sí') finalResponse += ` | 🎁 Bono ARPU`;
              finalResponse += `\n\n`;
              
              finalResponse += `   📈 RENDIMIENTO\n`;
              finalResponse += `   Altas: ${r.altas} | Meta: ${r.meta || '-'}\n`;
              finalResponse += `   % Cumplimiento: ${r.porcentaje_cumplimiento ? Number(r.porcentaje_cumplimiento).toFixed(1) + '%' : '-'}\n`;
              finalResponse += `   Multiplicador: x${Number(r.multiplicador_final || 1.3).toFixed(1)}\n\n`;
              
              finalResponse += `   💰 PAGOS\n`;
              finalResponse += `   Comisión bruta: S/ ${Number(r.comision_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   Pago Corte 1: S/ ${Number(r.pago_corte_1 || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `   Pago Corte 2: S/ ${Number(r.total_a_pagar_corte_2 || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n\n`;
              
              if (Number(r.total_descuentos || 0) > 0) {
                finalResponse += `   ❌ DESCUENTOS (${porcentaje}%)\n`;
                finalResponse += `   Penalidades: S/ ${Number(r.total_penalidades || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
                finalResponse += `   Clawbacks: S/ ${Number(r.total_clawbacks || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
                finalResponse += `   Total: S/ ${Number(r.total_descuentos || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n\n`;
              }
              
              finalResponse += `   ✅ RESULTADO NETO FINAL: S/ ${Number(r.resultado_neto_final || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
              finalResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            });
        }

        // Agregar resumen si hay múltiples resultados
        if (typedData.length > 1 && !['ranking_mejores', 'ranking_penalizados'].includes(tipo_consulta)) {
          const totalComision = typedData.reduce((sum: number, r: ResultadoFinal) => sum + Number(r.comision_total || 0), 0);
          const totalDescuentos = typedData.reduce((sum: number, r: ResultadoFinal) => sum + Number(r.total_descuentos || 0), 0);
          const totalNeto = typedData.reduce((sum: number, r: ResultadoFinal) => sum + Number(r.resultado_neto_final || 0), 0);
          
          finalResponse += `\n📊 RESUMEN TOTAL (${typedData.length} agencias)\n`;
          finalResponse += `   Comisión bruta: S/ ${totalComision.toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
          finalResponse += `   Total descuentos: S/ ${totalDescuentos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
          finalResponse += `   💰 Neto Final: S/ ${totalNeto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
        }

        return NextResponse.json({
          response: finalResponse,
          conversationHistory: [
            ...conversationHistory,
            { role: 'user', content: message },
            { role: 'assistant', content: finalResponse },
          ],
          data,
        });
      }
    }

    // Respuesta normal de GPT
    return NextResponse.json({
      response: responseMessage.content || 'No pude generar una respuesta.',
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: responseMessage.content || '' },
      ],
    });

  } catch (error: any) {
    console.error('Error en chatbot API:', error);
    return NextResponse.json(
      {
        error: 'Error procesando la solicitud',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
