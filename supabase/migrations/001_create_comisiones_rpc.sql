-- ============================================================================
-- FUNCIÓN RPC: get_comisiones_resumen
-- ============================================================================
-- Esta función calcula el resumen de comisiones por agencia directamente en
-- la base de datos de Supabase, optimizando el rendimiento y reduciendo la
-- cantidad de datos transferidos al frontend.
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

-- Crear la función RPC
CREATE OR REPLACE FUNCTION get_comisiones_resumen(
    p_zona TEXT,
    p_mes INTEGER,
    p_year INTEGER DEFAULT 2025
)
RETURNS TABLE (
    ruc TEXT,
    agencia TEXT,
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
BEGIN
    -- Calcular el rango de fechas del mes
    start_date := make_date(p_year, p_mes, 1);
    end_date := start_date + INTERVAL '1 month';
    
    RETURN QUERY
    SELECT 
        sr."DNI_ASESOR"::TEXT as ruc,
        sr."ASESOR"::TEXT as agencia,
        -- Contar todas las altas (registros que cumplen los filtros base)
        COUNT(*)::BIGINT as altas,
        -- Contar registros donde CORTE_1 = 1
        COUNT(*) FILTER (WHERE sr."CORTE_1" = 1)::BIGINT as corte_1,
        -- Contar registros donde CORTE_2 = 1
        COUNT(*) FILTER (WHERE sr."CORTE_2" = 1)::BIGINT as corte_2,
        -- Contar registros donde CORTE_3 = 1
        COUNT(*) FILTER (WHERE sr."CORTE_3" = 1)::BIGINT as corte_3,
        -- Contar registros donde CORTE_4 = 1
        COUNT(*) FILTER (WHERE sr."CORTE_4" = 1)::BIGINT as corte_4,
        -- Calcular el promedio del precio sin IGV
        COALESCE(AVG(sr."PRECIO_CON_IGV_EXTERNO" / 1.18), 0)::NUMERIC as precio_sin_igv_promedio
    FROM "SalesRecord" sr
    WHERE 
        -- Filtro: FECHA_VALIDACION no debe ser NULL
        sr."FECHA_VALIDACION" IS NOT NULL
        -- Filtro: FECHA_INSTALADO debe estar en el rango del mes
        AND sr."FECHA_INSTALADO" >= start_date
        AND sr."FECHA_INSTALADO" < end_date
        -- Filtro: Si es zona 'lima', solo incluir CANAL = 'Agencias'
        -- Si es zona 'provincia', incluir todos los canales
        AND (
            LOWER(p_zona) = 'provincia' 
            OR sr."CANAL" = 'Agencias'
        )
    GROUP BY sr."DNI_ASESOR", sr."ASESOR"
    ORDER BY altas DESC;
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
Devuelve: RUC, AGENCIA, ALTAS, CORTE_1, CORTE_2, CORTE_3, CORTE_4, PRECIO_SIN_IGV_PROMEDIO.
Los campos CORTE_X cuentan registros donde el campo correspondiente tiene valor 1.';

