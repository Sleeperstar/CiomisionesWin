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

2. resultado_comisiones_guardado - Resultados calculados de comisiones
   - periodo (YYYYMM, ej: 202504 para abril 2025)
   - corte (1, 2, 3 o 4)
   - zona (LIMA o PROVINCIA)
   - ruc, agencia
   - meta, top (GOLD, SILVER, REGULAR)
   - altas (total de ventas)
   - corte_1, corte_2, corte_3, corte_4 (cantidad de ventas por corte)
   - precio_sin_igv_promedio
   - porcentaje_cumplimiento (puede ser NULL para marcha blanca)
   - marcha_blanca, bono_arpu (Sí/No)
   - factor_multiplicador, multiplicador_final
   - total_a_pagar (comisión total)
   - created_at, updated_at

3. Parametros - Metas y clasificación de agencias
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
        const { agencia, periodo, corte, zona } = functionArgs;

        let query = supabase
          .from('resultado_comisiones_guardado')
          .select('*')
          .eq('periodo', periodo)
          .ilike('agencia', `%${agencia}%`);

        if (corte) query = query.eq('corte', corte);
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
            response: `No encontré registros para "${agencia}" en el periodo ${periodo}${corte ? ` corte ${corte}` : ''}. Verifica el nombre de la agencia y que los datos estén guardados.`,
            conversationHistory: [
              ...conversationHistory,
              { role: 'user', content: message },
              { role: 'assistant', content: 'No se encontraron datos' },
            ],
          });
        }

        // Formatear respuesta
        const resultados = data.map(r => {
          const periodoStr = `${String(r.periodo).substring(0, 4)}/${String(r.periodo).substring(4, 6)}`;
          return `**${r.agencia}** (${periodoStr} - Corte ${r.corte}):\n` +
                 `• Altas: ${r.altas}\n` +
                 `• Meta: ${r.meta || '-'}\n` +
                 `• % Cumplimiento: ${r.porcentaje_cumplimiento ? r.porcentaje_cumplimiento.toFixed(1) + '%' : '-'}\n` +
                 `• Multiplicador: x${r.multiplicador_final}\n` +
                 `• **Total comisionado: S/ ${r.total_a_pagar.toFixed(2)}**`;
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

