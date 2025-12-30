import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para obtener el esquema de la base de datos
async function getDatabaseSchema() {
  return `
Base de datos de Comisiones Win Telecom:

TABLAS PRINCIPALES:

1. SalesRecord - Registros de ventas
   - id, DNI_ASESOR (RUC), ASESOR (nombre agencia)
   - FECHA_INSTALADO, FECHA_VALIDACION
   - CANAL (Agencias, etc), TIPO_VENTA, TIPO_ESTADO
   - CORTE_1, CORTE_2, CORTE_3, CORTE_4 (valores 0 o 1)
   - PRECIO_CON_IGV_EXTERNO

2. resultado_comisiones_corte_1 - Resultados del CORTE 1 (solo comisión)
   - periodo (YYYYMM), zona, ruc, agencia
   - meta, top, altas, corte_1, corte_2, corte_3, corte_4
   - porcentaje_cumplimiento, marcha_blanca, bono_arpu
   - factor_multiplicador, multiplicador_final
   - total_a_pagar_corte_1 (comisión del corte 1)

3. resultado_comisiones_corte_2 - Resultados del CORTE 2 (comisión + penalidad 1 + clawback 1)
   - Igual que corte 1 más:
   - primer_recibo_pagado, recibos_no_pagados_corte_2
   - comision_total, pago_corte_1, total_a_pagar_corte_2
   - penalidad_1_*, clawback_1_*

4. resultado_comisiones_corte_3 - Resultados del CORTE 3 (penalidad 2 + clawback 2)
   - segundo_recibo_pagado, recibos_no_pagados_corte_3
   - penalidad_2_*, clawback_2_*

5. resultado_comisiones_corte_4 - Resultados del CORTE 4 (penalidad 3 + clawback 3)
   - tercer_recibo_pagado, recibos_no_pagados_corte_4
   - penalidad_3_*, clawback_3_*

6. Parametros - Metas y clasificación de agencias
   - RUC, PERIODO (YYYYMM), ZONA
   - META (objetivo de ventas)
   - TOP (GOLD, SILVER, REGULAR)

4. factor_multiplicador_regular, factor_multiplicador_gold, factor_multiplicador_silver
   - limite_inferior, limite_superior (% cumplimiento)
   - factor (multiplicador)

5. marcha_blanca - Agencias en periodo de prueba
   - ruc, agencia, periodo, zona
   - marcha_blanca (Sí/No)

6. bono_1_arpu - Bonos adicionales
   - ruc, agencia, periodo, zona
   - bono_1_arpu (Sí/No)

REGLAS DE NEGOCIO:
- Periodo formato: YYYYMM (202508 = agosto 2025)
- Cortes: 1, 2, 3, 4 (periodos de pago)
- Marcha Blanca: Factor automático 2.5, sin meta ni % cumplimiento
- Bono ARPU: +1 al multiplicador final
- Comisión = precio_sin_igv_promedio × multiplicador_final × corte_X

CONSULTAS COMUNES:
- "Cuánto comisionó [agencia] en [mes] corte [X]": buscar en resultado_comisiones_guardado
- "Cuántas altas tuvo [agencia]": sumar altas de resultado_comisiones_guardado o SalesRecord
- "Qué agencias son GOLD/SILVER": filtrar por top en Parametros o resultado_comisiones_guardado
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
1. Analiza la pregunta del usuario y determina qué tabla necesitas consultar
2. Para preguntas sobre comisiones específicas, usa resultado_comisiones_guardado
3. Convierte nombres de meses en español a formato YYYYMM (ejemplo: "agosto 2025" -> 202508)
4. Busca por nombre de agencia (campo "agencia") de manera flexible (ignora mayúsculas/minúsculas)
5. Responde de manera clara y concisa en español
6. Si no encuentras datos, sugiere verificar el periodo o el nombre de la agencia
7. Incluye el total_a_pagar cuando se pregunte por comisiones
8. Si la pregunta es ambigua, pide aclaraciones

EJEMPLOS:
Pregunta: "Cuánto comisionó ALIV en agosto corte 1?"
-> Buscar en resultado_comisiones_guardado donde agencia LIKE '%ALIV%', periodo = 202508, corte = 1
-> Responder: "ALIV TELECOM S.A.C. comisionó S/ X,XXX.XX en agosto 2025, corte 1"

Pregunta: "Cuántas altas tuvo EXPORTEL en abril?"
-> Buscar en resultado_comisiones_guardado donde agencia LIKE '%EXPORTEL%', periodo = 202504
-> Responder: "EXPORTEL S.A.C. tuvo XXX altas en abril 2025"`,
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
      max_tokens: 500,
      functions: [
        {
          name: 'buscar_comisiones',
          description: 'Busca información de comisiones de una agencia en un periodo y corte específico',
          parameters: {
            type: 'object',
            properties: {
              agencia: {
                type: 'string',
                description: 'Nombre o parte del nombre de la agencia (ej: ALIV, EXPORTEL)',
              },
              periodo: {
                type: 'integer',
                description: 'Periodo en formato YYYYMM (ej: 202504 para abril 2025)',
              },
              corte: {
                type: 'integer',
                description: 'Número de corte (1, 2, 3 o 4)',
              },
              zona: {
                type: 'string',
                description: 'Zona: LIMA o PROVINCIA',
              },
            },
            required: ['agencia', 'periodo'],
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
        const { agencia, periodo, corte = 1, zona } = functionArgs;

        // Determinar tabla según el corte
        const tableNames: { [key: number]: string } = {
          1: 'resultado_comisiones_corte_1',
          2: 'resultado_comisiones_corte_2',
          3: 'resultado_comisiones_corte_3',
          4: 'resultado_comisiones_corte_4',
        };
        const tableName = tableNames[corte] || 'resultado_comisiones_corte_1';

        let query = supabase
          .from(tableName)
          .select('*')
          .eq('periodo', periodo)
          .ilike('agencia', `%${agencia}%`);

        if (zona) query = query.eq('zona', zona.toUpperCase());

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
          return NextResponse.json({
            response: `No encontré registros para "${agencia}" en el periodo ${periodo} corte ${corte}. Verifica el nombre de la agencia y que los datos estén guardados.`,
            conversationHistory: [
              ...conversationHistory,
              { role: 'user', content: message },
              { role: 'assistant', content: 'No se encontraron datos' },
            ],
          });
        }

        // Formatear respuesta según el corte
        const resultados = data.map(r => {
          const periodoStr = `${String(r.periodo).substring(0, 4)}/${String(r.periodo).substring(4, 6)}`;
          
          // Obtener el total según el corte
          let totalPagar = 0;
          if (corte === 1) totalPagar = r.total_a_pagar_corte_1 || 0;
          else if (corte === 2) totalPagar = r.total_a_pagar_corte_2 || 0;
          // Para cortes 3 y 4, mostrar montos de penalidades/clawbacks
          
          let resultado = `**${r.agencia}** (${periodoStr} - Corte ${corte}):\n` +
                 `• Altas: ${r.altas}\n` +
                 `• Meta: ${r.meta || '-'}\n` +
                 `• % Cumplimiento: ${r.porcentaje_cumplimiento ? Number(r.porcentaje_cumplimiento).toFixed(1) + '%' : '-'}\n` +
                 `• Multiplicador: x${r.multiplicador_final}`;

          if (corte === 1) {
            resultado += `\n• **Total comisión Corte 1: S/ ${Number(totalPagar).toFixed(2)}**`;
          } else if (corte === 2) {
            resultado += `\n• Comisión total: S/ ${Number(r.comision_total || 0).toFixed(2)}`;
            resultado += `\n• Pago Corte 1: S/ ${Number(r.pago_corte_1 || 0).toFixed(2)}`;
            resultado += `\n• **Total Corte 2: S/ ${Number(totalPagar).toFixed(2)}**`;
            if (r.penalidad_1_monto) resultado += `\n• Penalidad 1: S/ ${Number(r.penalidad_1_monto).toFixed(2)}`;
            if (r.clawback_1_monto) resultado += `\n• Clawback 1: S/ ${Number(r.clawback_1_monto).toFixed(2)}`;
          }
          
          return resultado;
        }).join('\n\n');

        const finalResponse = `📊 **Resultados encontrados:**\n\n${resultados}`;

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

