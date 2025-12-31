import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
   - penalidad_1_churn_4_5_pct, penalidad_1_umbral, penalidad_1_altas_penalizadas, penalidad_1_monto
   - clawback_1_umbral_corte_2, clawback_1_cumplimiento_pct, clawback_1_multiplicador, clawback_1_monto

4. resultado_comisiones_corte_3 - Resultados del CORTE 3 (penalidad 2 + clawback 2)
   - segundo_recibo_pagado, recibos_no_pagados_corte_3
   - penalidad_2_churn_3_5_pct, penalidad_2_umbral, penalidad_2_altas_penalizadas, penalidad_2_monto
   - clawback_2_umbral_corte_3, clawback_2_cumplimiento_pct, clawback_2_multiplicador, clawback_2_monto

5. resultado_comisiones_corte_4 - Resultados del CORTE 4 (penalidad 3 + clawback 3)
   - tercer_recibo_pagado, recibos_no_pagados_corte_4
   - penalidad_3_churn_2_5_pct, penalidad_3_umbral, penalidad_3_altas_penalizadas, penalidad_3_monto
   - clawback_3_umbral_corte_4, clawback_3_cumplimiento_pct, clawback_3_multiplicador, clawback_3_monto

6. Parametros - Metas y clasificación de agencias
   - RUC, PERIODO (YYYYMM), ZONA
   - META (objetivo de ventas)
   - TOP (GOLD, SILVER, REGULAR)

7. factor_multiplicador_regular, factor_multiplicador_gold, factor_multiplicador_silver
   - limite_inferior, limite_superior (% cumplimiento)
   - factor (multiplicador)

8. marcha_blanca - Agencias en periodo de prueba
   - ruc, agencia, periodo, zona
   - marcha_blanca (Sí/No)

9. bono_1_arpu - Bonos adicionales
   - ruc, agencia, periodo, zona
   - bono_1_arpu (Sí/No)

REGLAS DE NEGOCIO:
- Periodo formato: YYYYMM (202508 = agosto 2025)
- Cortes: 1, 2, 3, 4 (periodos de pago)
- CORTE 1: Solo comisión inicial (total_a_pagar_corte_1)
- CORTE 2: Comisión restante + Penalidad 1 (penalidad_1_monto) + Clawback 1 (clawback_1_monto)
- CORTE 3: Penalidad 2 (penalidad_2_monto) + Clawback 2 (clawback_2_monto)
- CORTE 4: Penalidad 3 (penalidad_3_monto) + Clawback 3 (clawback_3_monto)
- Penalidad: Descuento por altas que no pagaron recibos (churn)
- Clawback: Devolución de comisión por incumplimiento
- Marcha Blanca: Factor automático 2.5, sin meta ni % cumplimiento
- Bono ARPU: +1 al multiplicador final
- Comisión = precio_sin_igv_promedio × multiplicador_final × altas_corte

TIPOS DE CONSULTA:
- COMISIÓN: Preguntar cuánto ganó/comisionó la agencia → total_a_pagar_corte_X
- PENALIDAD: Preguntar por penalidad/descuento → penalidad_X_monto (está en corte 2, 3 o 4)
- CLAWBACK: Preguntar por clawback/devolución → clawback_X_monto
- ALTAS: Número de instalaciones validadas
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
   - COMISIÓN: Si pregunta cuánto ganó, comisionó, total a pagar → tipo_consulta = "comision"
   - PENALIDAD TOTAL: Si pregunta por penalidad SIN especificar corte → tipo_consulta = "penalidad_total" (sumará penalidades de corte 2+3+4)
   - PENALIDAD ESPECÍFICA: Si pregunta por penalidad DE UN CORTE ESPECÍFICO → tipo_consulta = "penalidad" + corte = X
   - CLAWBACK: Si pregunta por clawback, devolución → tipo_consulta = "clawback"
   - ALTAS: Si pregunta por altas, instalaciones → tipo_consulta = "altas"
   - GENERAL: Si quiere ver todo el detalle → tipo_consulta = "detalle"
2. Convierte nombres de meses en español a formato YYYYMM (ejemplo: "agosto 2025" -> 202508, "agosto" sin año -> 202508 asumiendo 2025)
3. Busca por nombre de agencia de manera flexible (ignora mayúsculas/minúsculas)
4. IMPORTANTE para PENALIDADES:
   - Si NO especifica corte: usar tipo_consulta = "penalidad_total" → suma automática de todas las penalidades
   - Si SÍ especifica corte: usar tipo_consulta = "penalidad" + corte correspondiente
   - Penalidad 1 está en corte 2, Penalidad 2 está en corte 3, Penalidad 3 está en corte 4
5. Responde de manera clara y concisa en español
6. NO uses asteriscos para negritas ni formato markdown, usa texto plano
7. Usa emojis para hacer la respuesta más visual

EJEMPLOS:
Pregunta: "Cuánto comisionó ALIV en agosto corte 1?"
-> tipo_consulta = "comision", corte = 1

Pregunta: "Cuál fue la penalidad de ALIV en agosto?"
-> tipo_consulta = "penalidad_total" (SIN corte, sumará todas las penalidades)

Pregunta: "Cuál fue la penalidad de ALIV en agosto del corte 2?"
-> tipo_consulta = "penalidad", corte = 2 (solo penalidad 1)

Pregunta: "Cuál fue la penalidad de ALIV en agosto del corte 3?"
-> tipo_consulta = "penalidad", corte = 3 (solo penalidad 2)

Pregunta: "Cuántas altas tuvo EXPORTEL en abril?"
-> tipo_consulta = "altas"`,
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
      max_tokens: 800,
      functions: [
        {
          name: 'buscar_comisiones',
          description: 'Busca información de comisiones, penalidades, clawbacks o altas de una agencia en un periodo específico',
          parameters: {
            type: 'object',
            properties: {
              agencia: {
                type: 'string',
                description: 'Nombre o parte del nombre de la agencia (ej: ALIV, EXPORTEL)',
              },
              periodo: {
                type: 'integer',
                description: 'Periodo en formato YYYYMM (ej: 202504 para abril 2025, 202508 para agosto 2025)',
              },
              corte: {
                type: 'integer',
                description: 'Número de corte (1, 2, 3 o 4). Para penalidades: corte 2 tiene penalidad 1, corte 3 tiene penalidad 2, corte 4 tiene penalidad 3',
              },
              zona: {
                type: 'string',
                description: 'Zona: LIMA o PROVINCIA',
              },
              tipo_consulta: {
                type: 'string',
                enum: ['comision', 'penalidad', 'penalidad_total', 'clawback', 'altas', 'detalle'],
                description: 'Tipo de información solicitada: comision (total a pagar), penalidad_total (suma de TODAS las penalidades de corte 2+3+4, usar cuando NO especifica corte), penalidad (penalidad de un corte específico, usar cuando SÍ especifica corte), clawback (devolución), altas (instalaciones), detalle (todo)',
              },
            },
            required: ['agencia', 'periodo', 'tipo_consulta'],
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
        const { agencia, periodo, zona, tipo_consulta = 'detalle' } = functionArgs;
        
        // Caso especial: penalidad_total necesita consultar múltiples tablas
        if (tipo_consulta === 'penalidad_total') {
          // Consultar las 3 tablas de cortes que tienen penalidades
          const [dataCorte2, dataCorte3, dataCorte4] = await Promise.all([
            supabase.from('resultado_comisiones_corte_2').select('*').eq('periodo', periodo).ilike('agencia', `%${agencia}%`),
            supabase.from('resultado_comisiones_corte_3').select('*').eq('periodo', periodo).ilike('agencia', `%${agencia}%`),
            supabase.from('resultado_comisiones_corte_4').select('*').eq('periodo', periodo).ilike('agencia', `%${agencia}%`),
          ]);

          // Verificar errores
          if (dataCorte2.error || dataCorte3.error || dataCorte4.error) {
            return NextResponse.json({
              response: `Lo siento, hubo un error al buscar las penalidades.`,
              conversationHistory: [...conversationHistory, { role: 'user', content: message }, { role: 'assistant', content: 'Error en consulta' }],
            });
          }

          // Combinar datos por agencia/ruc
          const penalidades: { [key: string]: any } = {};
          
          // Procesar corte 2 (penalidad 1)
          (dataCorte2.data || []).forEach(r => {
            const key = `${r.ruc}_${r.zona}`;
            if (!penalidades[key]) {
              penalidades[key] = { 
                agencia: r.agencia, ruc: r.ruc, zona: r.zona, periodo: r.periodo,
                penalidad_1: 0, penalidad_2: 0, penalidad_3: 0,
                detalle_p1: null, detalle_p2: null, detalle_p3: null
              };
            }
            penalidades[key].penalidad_1 = Number(r.penalidad_1_monto || 0);
            penalidades[key].detalle_p1 = {
              churn: r.penalidad_1_churn_4_5_pct,
              umbral: r.penalidad_1_umbral,
              altas_penalizadas: r.penalidad_1_altas_penalizadas,
              monto: r.penalidad_1_monto
            };
          });

          // Procesar corte 3 (penalidad 2)
          (dataCorte3.data || []).forEach(r => {
            const key = `${r.ruc}_${r.zona}`;
            if (!penalidades[key]) {
              penalidades[key] = { 
                agencia: r.agencia, ruc: r.ruc, zona: r.zona, periodo: r.periodo,
                penalidad_1: 0, penalidad_2: 0, penalidad_3: 0,
                detalle_p1: null, detalle_p2: null, detalle_p3: null
              };
            }
            penalidades[key].penalidad_2 = Number(r.penalidad_2_monto || 0);
            penalidades[key].detalle_p2 = {
              churn: r.penalidad_2_churn_3_5_pct,
              umbral: r.penalidad_2_umbral,
              altas_penalizadas: r.penalidad_2_altas_penalizadas,
              monto: r.penalidad_2_monto
            };
          });

          // Procesar corte 4 (penalidad 3)
          (dataCorte4.data || []).forEach(r => {
            const key = `${r.ruc}_${r.zona}`;
            if (!penalidades[key]) {
              penalidades[key] = { 
                agencia: r.agencia, ruc: r.ruc, zona: r.zona, periodo: r.periodo,
                penalidad_1: 0, penalidad_2: 0, penalidad_3: 0,
                detalle_p1: null, detalle_p2: null, detalle_p3: null
              };
            }
            penalidades[key].penalidad_3 = Number(r.penalidad_3_monto || 0);
            penalidades[key].detalle_p3 = {
              churn: r.penalidad_3_churn_2_5_pct,
              umbral: r.penalidad_3_umbral,
              altas_penalizadas: r.penalidad_3_altas_penalizadas,
              monto: r.penalidad_3_monto
            };
          });

          const agenciasConPenalidad = Object.values(penalidades);
          
          if (agenciasConPenalidad.length === 0) {
            return NextResponse.json({
              response: `No encontré registros de penalidades para "${agencia}" en el periodo ${periodo}. Verifica que existan datos guardados en los cortes 2, 3 o 4.`,
              conversationHistory: [...conversationHistory, { role: 'user', content: message }, { role: 'assistant', content: 'No se encontraron datos' }],
            });
          }

          // Formatear respuesta con todas las penalidades
          const resultados = agenciasConPenalidad.map((p: any) => {
            const mesNombre = obtenerNombreMes(Number(String(p.periodo).substring(4, 6)));
            const totalPenalidad = p.penalidad_1 + p.penalidad_2 + p.penalidad_3;
            
            let resultado = `⚠️ PENALIDADES TOTALES - ${p.agencia}\n`;
            resultado += `📅 Periodo: ${mesNombre} ${String(p.periodo).substring(0, 4)} | Zona: ${p.zona}\n\n`;
            
            if (p.penalidad_1 > 0) {
              resultado += `  Penalidad 1 (Corte 2): S/ ${p.penalidad_1.toFixed(2)}\n`;
              if (p.detalle_p1) {
                resultado += `    → Altas penalizadas: ${p.detalle_p1.altas_penalizadas || 0}\n`;
              }
            } else {
              resultado += `  Penalidad 1 (Corte 2): S/ 0.00 (sin datos)\n`;
            }
            
            if (p.penalidad_2 > 0) {
              resultado += `  Penalidad 2 (Corte 3): S/ ${p.penalidad_2.toFixed(2)}\n`;
              if (p.detalle_p2) {
                resultado += `    → Altas penalizadas: ${p.detalle_p2.altas_penalizadas || 0}\n`;
              }
            } else {
              resultado += `  Penalidad 2 (Corte 3): S/ 0.00 (sin datos)\n`;
            }
            
            if (p.penalidad_3 > 0) {
              resultado += `  Penalidad 3 (Corte 4): S/ ${p.penalidad_3.toFixed(2)}\n`;
              if (p.detalle_p3) {
                resultado += `    → Altas penalizadas: ${p.detalle_p3.altas_penalizadas || 0}\n`;
              }
            } else {
              resultado += `  Penalidad 3 (Corte 4): S/ 0.00 (sin datos)\n`;
            }
            
            resultado += `\n  💰 TOTAL PENALIDADES: S/ ${totalPenalidad.toFixed(2)}`;
            
            return resultado;
          }).join('\n\n---\n\n');

          const finalResponse = `⚠️ Resultados de penalidades:\n\n${resultados}`;

          return NextResponse.json({
            response: finalResponse,
            conversationHistory: [...conversationHistory, { role: 'user', content: message }, { role: 'assistant', content: finalResponse }],
          });
        }

        // Determinar el corte según el tipo de consulta (para consultas normales)
        let corte = functionArgs.corte || 1;
        
        // Si piden penalidad específica sin especificar corte, usar corte 2
        if (tipo_consulta === 'penalidad' && !functionArgs.corte) {
          corte = 2;
        }

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
          // Si no hay datos en el corte solicitado, dar mensaje específico
          let mensajeNoData = `No encontré registros para "${agencia}" en el periodo ${periodo}`;
          if (tipo_consulta === 'penalidad') {
            mensajeNoData += `. Las penalidades se calculan en los cortes 2, 3 y 4. Verifica que existan datos guardados para ese corte.`;
          } else {
            mensajeNoData += ` corte ${corte}. Verifica el nombre de la agencia y que los datos estén guardados.`;
          }
          
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
        const resultados = data.map(r => {
          const periodoStr = `${String(r.periodo).substring(0, 4)}/${String(r.periodo).substring(4, 6)}`;
          const mesNombre = obtenerNombreMes(Number(String(r.periodo).substring(4, 6)));
          
          let resultado = '';
          
          switch (tipo_consulta) {
            case 'penalidad':
              // Mostrar información de penalidad según el corte
              resultado = `⚠️ PENALIDAD - ${r.agencia}\n`;
              resultado += `📅 Periodo: ${mesNombre} ${String(r.periodo).substring(0, 4)}\n\n`;
              
              if (corte === 2 && r.penalidad_1_monto !== undefined) {
                resultado += `Penalidad 1 (Corte 2):\n`;
                resultado += `  • Churn 4-5 recibos: ${r.penalidad_1_churn_4_5_pct ? Number(r.penalidad_1_churn_4_5_pct).toFixed(2) + '%' : 'N/A'}\n`;
                resultado += `  • Umbral: ${r.penalidad_1_umbral || 0} altas\n`;
                resultado += `  • Altas penalizadas: ${r.penalidad_1_altas_penalizadas || 0}\n`;
                resultado += `  • 💰 Monto penalidad: S/ ${Number(r.penalidad_1_monto || 0).toFixed(2)}`;
              } else if (corte === 3 && r.penalidad_2_monto !== undefined) {
                resultado += `Penalidad 2 (Corte 3):\n`;
                resultado += `  • Churn 3-5 recibos: ${r.penalidad_2_churn_3_5_pct ? Number(r.penalidad_2_churn_3_5_pct).toFixed(2) + '%' : 'N/A'}\n`;
                resultado += `  • Umbral: ${r.penalidad_2_umbral || 0} altas\n`;
                resultado += `  • Altas penalizadas: ${r.penalidad_2_altas_penalizadas || 0}\n`;
                resultado += `  • 💰 Monto penalidad: S/ ${Number(r.penalidad_2_monto || 0).toFixed(2)}`;
              } else if (corte === 4 && r.penalidad_3_monto !== undefined) {
                resultado += `Penalidad 3 (Corte 4):\n`;
                resultado += `  • Churn 2-5 recibos: ${r.penalidad_3_churn_2_5_pct ? Number(r.penalidad_3_churn_2_5_pct).toFixed(2) + '%' : 'N/A'}\n`;
                resultado += `  • Umbral: ${r.penalidad_3_umbral || 0} altas\n`;
                resultado += `  • Altas penalizadas: ${r.penalidad_3_altas_penalizadas || 0}\n`;
                resultado += `  • 💰 Monto penalidad: S/ ${Number(r.penalidad_3_monto || 0).toFixed(2)}`;
              } else {
                resultado += `No hay datos de penalidad en el corte ${corte} para esta agencia.`;
              }
              break;
              
            case 'clawback':
              resultado = `🔄 CLAWBACK - ${r.agencia}\n`;
              resultado += `📅 Periodo: ${mesNombre} ${String(r.periodo).substring(0, 4)}\n\n`;
              
              if (corte === 2 && r.clawback_1_monto !== undefined) {
                resultado += `Clawback 1 (Corte 2):\n`;
                resultado += `  • Umbral corte 2: ${r.clawback_1_umbral_corte_2 || 0}\n`;
                resultado += `  • % Cumplimiento: ${r.clawback_1_cumplimiento_pct ? Number(r.clawback_1_cumplimiento_pct).toFixed(2) + '%' : 'N/A'}\n`;
                resultado += `  • Multiplicador: x${r.clawback_1_multiplicador || 0}\n`;
                resultado += `  • 💰 Monto clawback: S/ ${Number(r.clawback_1_monto || 0).toFixed(2)}`;
              } else if (corte === 3 && r.clawback_2_monto !== undefined) {
                resultado += `Clawback 2 (Corte 3):\n`;
                resultado += `  • 💰 Monto clawback: S/ ${Number(r.clawback_2_monto || 0).toFixed(2)}`;
              } else if (corte === 4 && r.clawback_3_monto !== undefined) {
                resultado += `Clawback 3 (Corte 4):\n`;
                resultado += `  • 💰 Monto clawback: S/ ${Number(r.clawback_3_monto || 0).toFixed(2)}`;
              } else {
                resultado += `No hay datos de clawback en el corte ${corte} para esta agencia.`;
              }
              break;
              
            case 'comision':
              resultado = `💵 COMISIÓN - ${r.agencia}\n`;
              resultado += `📅 Periodo: ${mesNombre} ${String(r.periodo).substring(0, 4)} - Corte ${corte}\n\n`;
              resultado += `  • Altas: ${r.altas}\n`;
              resultado += `  • Meta: ${r.meta || '-'}\n`;
              resultado += `  • % Cumplimiento: ${r.porcentaje_cumplimiento ? Number(r.porcentaje_cumplimiento).toFixed(1) + '%' : '-'}\n`;
              resultado += `  • Multiplicador: x${r.multiplicador_final}\n`;
              
              if (corte === 1) {
                resultado += `  • 💰 Total comisión Corte 1: S/ ${Number(r.total_a_pagar_corte_1 || 0).toFixed(2)}`;
              } else if (corte === 2) {
                resultado += `  • Comisión total: S/ ${Number(r.comision_total || 0).toFixed(2)}\n`;
                resultado += `  • Ya pagado en Corte 1: S/ ${Number(r.pago_corte_1 || 0).toFixed(2)}\n`;
                resultado += `  • 💰 Total a pagar Corte 2: S/ ${Number(r.total_a_pagar_corte_2 || 0).toFixed(2)}`;
              }
              break;
              
            case 'altas':
              resultado = `📈 ALTAS - ${r.agencia}\n`;
              resultado += `📅 Periodo: ${mesNombre} ${String(r.periodo).substring(0, 4)}\n\n`;
              resultado += `  • Total altas: ${r.altas}\n`;
              resultado += `  • Corte 1: ${r.corte_1 || 0}\n`;
              resultado += `  • Corte 2: ${r.corte_2 || 0}\n`;
              resultado += `  • Corte 3: ${r.corte_3 || 0}\n`;
              resultado += `  • Corte 4: ${r.corte_4 || 0}\n`;
              resultado += `  • Meta: ${r.meta || '-'}\n`;
              resultado += `  • % Cumplimiento: ${r.porcentaje_cumplimiento ? Number(r.porcentaje_cumplimiento).toFixed(1) + '%' : '-'}`;
              break;
              
            default: // detalle
              resultado = `📊 ${r.agencia}\n`;
              resultado += `📅 Periodo: ${mesNombre} ${String(r.periodo).substring(0, 4)} - Corte ${corte}\n`;
              resultado += `🏷️ Categoría: ${r.top || 'REGULAR'} | Zona: ${r.zona}\n\n`;
              resultado += `  • Altas: ${r.altas}\n`;
              resultado += `  • Meta: ${r.meta || '-'}\n`;
              resultado += `  • % Cumplimiento: ${r.porcentaje_cumplimiento ? Number(r.porcentaje_cumplimiento).toFixed(1) + '%' : '-'}\n`;
              resultado += `  • Multiplicador: x${r.multiplicador_final}`;
              
              if (corte === 1) {
                resultado += `\n  • 💰 Total Corte 1: S/ ${Number(r.total_a_pagar_corte_1 || 0).toFixed(2)}`;
              } else if (corte === 2) {
                resultado += `\n  • Comisión total: S/ ${Number(r.comision_total || 0).toFixed(2)}`;
                resultado += `\n  • 💰 Total Corte 2: S/ ${Number(r.total_a_pagar_corte_2 || 0).toFixed(2)}`;
                if (r.penalidad_1_monto) resultado += `\n  • ⚠️ Penalidad 1: S/ ${Number(r.penalidad_1_monto).toFixed(2)}`;
                if (r.clawback_1_monto) resultado += `\n  • 🔄 Clawback 1: S/ ${Number(r.clawback_1_monto).toFixed(2)}`;
              }
          }
          
          return resultado;
        }).join('\n\n---\n\n');

        const tipoEmoji = tipo_consulta === 'penalidad' ? '⚠️' : 
                         tipo_consulta === 'clawback' ? '🔄' : 
                         tipo_consulta === 'comision' ? '💵' : 
                         tipo_consulta === 'altas' ? '📈' : '📊';
        
        const finalResponse = `${tipoEmoji} Resultados encontrados:\n\n${resultados}`;

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

