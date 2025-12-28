-- ============================================================================
-- FUNCIÓN RPC: get_comisiones_resumen (VERSIÓN OPTIMIZADA)
-- ============================================================================
-- Esta función calcula el resumen de comisiones por agencia directamente en
-- la base de datos de Supabase. Incluye JOIN con la tabla Parametros para
-- obtener META y TOP en una sola consulta.
--
-- PARÁMETROS:
--   p_zona: 'lima' o 'provincia'
--   p_mes: número del mes (1-12)
--   p_year: año (por defecto 2025)
--
-- EJEMPLO DE USO:
--   SELECT * FROM get_comisiones_resumen('lima', 8, 2025);
--
-- DESDE LA APP (JavaScript/TypeScript):
--   const { data } = await supabase.rpc('get_comisiones_resumen', {
--       p_zona: 'lima',
--       p_mes: 8,
--       p_year: 2025
--   });
-- ============================================================================

-- Primero eliminar la función si existe (para poder recrearla)
DROP FUNCTION IF EXISTS get_comisiones_resumen(TEXT, INTEGER, INTEGER);

-- Crear la función RPC optimizada con JOIN a Parametros
CREATE OR REPLACE FUNCTION get_comisiones_resumen(
    p_zona TEXT,
    p_mes INTEGER,
    p_year INTEGER DEFAULT 2025
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
    precio_sin_igv_promedio NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    v_periodo INTEGER;  -- PERIODO es INTEGER en la tabla Parametros (formato YYYYMM como número)
BEGIN
    -- Calcular el rango de fechas del mes
    start_date := make_date(p_year, p_mes, 1);
    end_date := start_date + INTERVAL '1 month';
    
    -- Calcular el periodo como INTEGER (formato YYYYMM: ej. 202504 para abril 2025)
    v_periodo := (p_year * 100) + p_mes;
    
    RETURN QUERY
    SELECT 
        ventas.ruc,
        ventas.agencia,
        -- META y TOP desde la tabla Parametros (LEFT JOIN para no perder agencias sin parámetros)
        COALESCE(p."META", 0)::BIGINT as meta,
        COALESCE(p."TOP", 'N/A')::TEXT as top,
        ventas.altas,
        ventas.corte_1,
        ventas.corte_2,
        ventas.corte_3,
        ventas.corte_4,
        ventas.precio_sin_igv_promedio
    FROM (
        -- Subconsulta: Agregar ventas por agencia
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
    -- LEFT JOIN con Parametros para obtener META y TOP
    LEFT JOIN "Parametros" p ON 
        p."RUC" = ventas.ruc 
        AND p."PERIODO" = v_periodo
        AND UPPER(p."ZONA") = UPPER(p_zona)
    ORDER BY ventas.altas DESC;
END;
$$;

-- Dar permisos de ejecución a usuarios anónimos y autenticados
GRANT EXECUTE ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER) TO authenticated;

-- ============================================================================
-- COMENTARIOS DE LA FUNCIÓN
-- ============================================================================
COMMENT ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER) IS 
'Calcula el resumen de comisiones por agencia para un mes y zona específicos.
Incluye JOIN con tabla Parametros para obtener META y TOP.
Devuelve: RUC, AGENCIA, META, TOP, ALTAS, CORTE_1-4, PRECIO_SIN_IGV_PROMEDIO.
Una sola consulta optimizada que reemplaza múltiples llamadas al frontend.';

