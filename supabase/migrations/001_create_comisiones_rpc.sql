-- ============================================================================
-- FUNCIÓN RPC: get_comisiones_resumen (VERSIÓN CON CAMPOS CALCULADOS)
-- ============================================================================
-- Esta función calcula el resumen de comisiones por agencia directamente en
-- la base de datos de Supabase. Incluye:
-- - JOIN con tabla Parametros para META y TOP
-- - JOIN con factor_multiplicador_regular para el factor
-- - Cálculos: % Cumplimiento, Factor Multiplicador, Total a Pagar
--
-- PARÁMETROS:
--   p_zona: 'lima' o 'provincia'
--   p_mes: número del mes (1-12)
--   p_year: año (por defecto 2025)
--   p_corte: número del corte (1, 2, 3 o 4) - determina qué corte usar para el total
--
-- EJEMPLO DE USO:
--   SELECT * FROM get_comisiones_resumen('lima', 8, 2025, 1);
--
-- DESDE LA APP (JavaScript/TypeScript):
--   const { data } = await supabase.rpc('get_comisiones_resumen', {
--       p_zona: 'lima',
--       p_mes: 8,
--       p_year: 2025,
--       p_corte: 1
--   });
-- ============================================================================

-- Eliminar versiones anteriores de la función
DROP FUNCTION IF EXISTS get_comisiones_resumen(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_comisiones_resumen(TEXT, INTEGER, INTEGER, INTEGER);

-- Crear la función RPC con campos calculados
CREATE OR REPLACE FUNCTION get_comisiones_resumen(
    p_zona TEXT,
    p_mes INTEGER,
    p_year INTEGER DEFAULT 2025,
    p_corte INTEGER DEFAULT 1  -- Corte seleccionado: 1, 2, 3 o 4
)
RETURNS TABLE (
    ruc TEXT,
    agencia TEXT,
    meta BIGINT,
    top TEXT,
    altas BIGINT,
    corte_1 BIGINT,
    corte_2 BIGINT,
    corte_3 BIGINT,
    corte_4 BIGINT,
    precio_sin_igv_promedio NUMERIC,
    -- Campos calculados
    porcentaje_cumplimiento NUMERIC,
    factor_multiplicador NUMERIC,
    total_a_pagar NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    v_periodo INTEGER;
BEGIN
    -- Calcular el rango de fechas del mes
    start_date := make_date(p_year, p_mes, 1);
    end_date := start_date + INTERVAL '1 month';
    
    -- Calcular el periodo como INTEGER (formato YYYYMM)
    v_periodo := (p_year * 100) + p_mes;
    
    RETURN QUERY
    SELECT 
        datos.ruc,
        datos.agencia,
        datos.meta,
        datos.top,
        datos.altas,
        datos.corte_1,
        datos.corte_2,
        datos.corte_3,
        datos.corte_4,
        datos.precio_sin_igv_promedio,
        -- % Cumplimiento = (altas / meta) * 100, evitar división por cero
        CASE 
            WHEN datos.meta > 0 THEN ROUND((datos.altas::NUMERIC / datos.meta::NUMERIC) * 100, 2)
            ELSE 0
        END as porcentaje_cumplimiento,
        -- Factor Multiplicador desde la tabla factor_multiplicador_regular
        COALESCE(fm.factor, 1.3)::NUMERIC as factor_multiplicador,
        -- Total a Pagar = precio_sin_igv_promedio * factor * corte_seleccionado
        ROUND(
            datos.precio_sin_igv_promedio * 
            COALESCE(fm.factor, 1.3) * 
            CASE p_corte
                WHEN 1 THEN datos.corte_1
                WHEN 2 THEN datos.corte_2
                WHEN 3 THEN datos.corte_3
                WHEN 4 THEN datos.corte_4
                ELSE datos.corte_1
            END,
            2
        )::NUMERIC as total_a_pagar
    FROM (
        -- Subconsulta principal con datos base
        SELECT 
            ventas.ruc,
            ventas.agencia,
            COALESCE(p."META", 0)::BIGINT as meta,
            COALESCE(p."TOP", 'N/A')::TEXT as top,
            ventas.altas,
            ventas.corte_1,
            ventas.corte_2,
            ventas.corte_3,
            ventas.corte_4,
            ventas.precio_sin_igv_promedio,
            -- Calcular % cumplimiento para buscar el factor
            CASE 
                WHEN COALESCE(p."META", 0) > 0 
                THEN (ventas.altas::NUMERIC / p."META"::NUMERIC) * 100
                ELSE 0
            END as pct_cumplimiento
        FROM (
            -- Agregar ventas por agencia
            SELECT 
                sr."DNI_ASESOR"::TEXT as ruc,
                sr."ASESOR"::TEXT as agencia,
                COUNT(*)::BIGINT as altas,
                COUNT(*) FILTER (WHERE sr."CORTE_1" = 1)::BIGINT as corte_1,
                COUNT(*) FILTER (WHERE sr."CORTE_2" = 1)::BIGINT as corte_2,
                COUNT(*) FILTER (WHERE sr."CORTE_3" = 1)::BIGINT as corte_3,
                COUNT(*) FILTER (WHERE sr."CORTE_4" = 1)::BIGINT as corte_4,
                COALESCE(AVG(sr."PRECIO_CON_IGV_EXTERNO" / 1.18), 0)::NUMERIC as precio_sin_igv_promedio
            FROM "SalesRecord" sr
            WHERE 
                sr."FECHA_VALIDACION" IS NOT NULL
                AND sr."FECHA_INSTALADO" >= start_date
                AND sr."FECHA_INSTALADO" < end_date
                AND (
                    LOWER(p_zona) = 'provincia' 
                    OR sr."CANAL" = 'Agencias'
                )
            GROUP BY sr."DNI_ASESOR", sr."ASESOR"
        ) ventas
        -- JOIN con Parametros para obtener META y TOP
        LEFT JOIN "Parametros" p ON 
            p."RUC" = ventas.ruc 
            AND p."PERIODO" = v_periodo
            AND UPPER(p."ZONA") = UPPER(p_zona)
    ) datos
    -- JOIN con factor_multiplicador_regular para obtener el factor según % cumplimiento
    LEFT JOIN factor_multiplicador_regular fm ON 
        datos.pct_cumplimiento >= fm.limite_inferior 
        AND (datos.pct_cumplimiento <= fm.limite_superior OR fm.limite_superior IS NULL)
    ORDER BY datos.altas DESC;
END;
$$;

-- Dar permisos de ejecución a usuarios anónimos y autenticados
GRANT EXECUTE ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;

-- ============================================================================
-- COMENTARIOS DE LA FUNCIÓN
-- ============================================================================
COMMENT ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER, INTEGER) IS 
'Calcula el resumen de comisiones por agencia con todos los campos calculados.
Parámetros: p_zona, p_mes, p_year, p_corte (1-4).
Incluye: META, TOP, ALTAS, CORTES 1-4, % CUMPLIMIENTO, FACTOR MULTIPLICADOR, TOTAL A PAGAR.
Fórmula Total a Pagar: precio_sin_igv_promedio * factor_multiplicador * corte_seleccionado.';

