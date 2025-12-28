-- ============================================================================
-- TABLAS DE FACTORES MULTIPLICADORES
-- ============================================================================

-- Tabla para agencias GOLD
CREATE TABLE IF NOT EXISTS factor_multiplicador_gold (
    id SERIAL PRIMARY KEY,
    limite_inferior DECIMAL(5,2) NOT NULL,
    limite_superior DECIMAL(5,2),
    factor DECIMAL(3,1) NOT NULL
);

-- Tabla para agencias SILVER
CREATE TABLE IF NOT EXISTS factor_multiplicador_silver (
    id SERIAL PRIMARY KEY,
    limite_inferior DECIMAL(5,2) NOT NULL,
    limite_superior DECIMAL(5,2),
    factor DECIMAL(3,1) NOT NULL
);

-- ============================================================================
-- TABLAS PARA MARCHA BLANCA Y BONO ARPU
-- ============================================================================

-- Marcha Blanca: Agencias que reciben factor 2.5 automáticamente
CREATE TABLE IF NOT EXISTS marcha_blanca (
    id SERIAL PRIMARY KEY,
    ruc VARCHAR(20) NOT NULL,
    agencia VARCHAR(255),
    periodo INTEGER NOT NULL,  -- Formato YYYYMM
    marcha_blanca VARCHAR(10) NOT NULL DEFAULT 'No',  -- 'Sí' o 'No'
    zona VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ruc, periodo, zona)
);

-- Bono ARPU: Agencias que reciben +1 a su multiplicador final
CREATE TABLE IF NOT EXISTS bono_1_arpu (
    id SERIAL PRIMARY KEY,
    ruc VARCHAR(20) NOT NULL,
    agencia VARCHAR(255),
    periodo INTEGER NOT NULL,  -- Formato YYYYMM
    bono_1_arpu VARCHAR(10) NOT NULL DEFAULT 'No',  -- 'Sí' o 'No'
    zona VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ruc, periodo, zona)
);

-- ============================================================================
-- FUNCIÓN RPC: get_comisiones_resumen
-- ============================================================================
-- Incluye:
--   - Factores GOLD/SILVER/REGULAR según TOP
--   - Marcha Blanca: Si = factor 2.5, meta y % cumplimiento = NULL (mostrar "-")
--   - Meta = 0 sin marcha blanca: meta = 100 por defecto
--   - Bono ARPU: Si = multiplicador_final + 1
--   - Total a Pagar usa multiplicador_final
-- ============================================================================

DROP FUNCTION IF EXISTS get_comisiones_resumen(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_comisiones_resumen(TEXT, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_comisiones_resumen(
    p_zona TEXT,
    p_mes INTEGER,
    p_year INTEGER DEFAULT 2025,
    p_corte INTEGER DEFAULT 1
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
    porcentaje_cumplimiento NUMERIC,
    marcha_blanca TEXT,
    bono_arpu TEXT,
    factor_multiplicador NUMERIC,
    multiplicador_final NUMERIC,
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
    start_date := make_date(p_year, p_mes, 1);
    end_date := start_date + INTERVAL '1 month';
    v_periodo := (p_year * 100) + p_mes;
    
    RETURN QUERY
    SELECT 
        datos.ruc,
        datos.agencia,
        -- META: NULL si tiene marcha blanca, 100 si es 0, sino el valor real
        CASE 
            WHEN UPPER(COALESCE(mb.marcha_blanca, 'No')) IN ('SÍ', 'SI') THEN NULL::BIGINT
            WHEN COALESCE(datos.meta_original, 0) = 0 THEN 100::BIGINT
            ELSE datos.meta_original
        END as meta,
        datos.top,
        datos.altas,
        datos.corte_1,
        datos.corte_2,
        datos.corte_3,
        datos.corte_4,
        datos.precio_sin_igv_promedio,
        -- % Cumplimiento: NULL si tiene marcha blanca, sino calcular
        CASE 
            WHEN UPPER(COALESCE(mb.marcha_blanca, 'No')) IN ('SÍ', 'SI') THEN NULL::NUMERIC
            ELSE 
                CASE 
                    WHEN COALESCE(datos.meta_original, 0) = 0 THEN 
                        ROUND((datos.altas::NUMERIC / 100::NUMERIC) * 100, 2)
                    WHEN datos.meta_original > 0 THEN 
                        ROUND((datos.altas::NUMERIC / datos.meta_original::NUMERIC) * 100, 2)
                    ELSE 0
                END
        END as porcentaje_cumplimiento,
        -- Marcha Blanca (Sí/No)
        COALESCE(mb.marcha_blanca, 'No')::TEXT as marcha_blanca,
        -- Bono ARPU (Sí/No)
        COALESCE(ba.bono_1_arpu, 'No')::TEXT as bono_arpu,
        -- Factor Multiplicador (2.5 si tiene marcha blanca, sino el calculado)
        CASE 
            WHEN UPPER(COALESCE(mb.marcha_blanca, 'No')) IN ('SÍ', 'SI') THEN 2.5
            ELSE COALESCE(
                CASE UPPER(datos.top)
                    WHEN 'GOLD' THEN fg.factor
                    WHEN 'SILVER' THEN fs.factor
                    ELSE fr.factor
                END,
                1.3
            )
        END::NUMERIC as factor_multiplicador,
        -- Multiplicador Final (factor + 1 si tiene bono ARPU)
        CASE 
            WHEN UPPER(COALESCE(ba.bono_1_arpu, 'No')) IN ('SÍ', 'SI') THEN
                CASE 
                    WHEN UPPER(COALESCE(mb.marcha_blanca, 'No')) IN ('SÍ', 'SI') THEN 2.5 + 1
                    ELSE COALESCE(
                        CASE UPPER(datos.top)
                            WHEN 'GOLD' THEN fg.factor
                            WHEN 'SILVER' THEN fs.factor
                            ELSE fr.factor
                        END,
                        1.3
                    ) + 1
                END
            ELSE
                CASE 
                    WHEN UPPER(COALESCE(mb.marcha_blanca, 'No')) IN ('SÍ', 'SI') THEN 2.5
                    ELSE COALESCE(
                        CASE UPPER(datos.top)
                            WHEN 'GOLD' THEN fg.factor
                            WHEN 'SILVER' THEN fs.factor
                            ELSE fr.factor
                        END,
                        1.3
                    )
                END
        END::NUMERIC as multiplicador_final,
        -- Total a Pagar (usa multiplicador_final)
        ROUND(
            datos.precio_sin_igv_promedio * 
            CASE 
                WHEN UPPER(COALESCE(ba.bono_1_arpu, 'No')) IN ('SÍ', 'SI') THEN
                    CASE 
                        WHEN UPPER(COALESCE(mb.marcha_blanca, 'No')) IN ('SÍ', 'SI') THEN 2.5 + 1
                        ELSE COALESCE(
                            CASE UPPER(datos.top)
                                WHEN 'GOLD' THEN fg.factor
                                WHEN 'SILVER' THEN fs.factor
                                ELSE fr.factor
                            END,
                            1.3
                        ) + 1
                    END
                ELSE
                    CASE 
                        WHEN UPPER(COALESCE(mb.marcha_blanca, 'No')) IN ('SÍ', 'SI') THEN 2.5
                        ELSE COALESCE(
                            CASE UPPER(datos.top)
                                WHEN 'GOLD' THEN fg.factor
                                WHEN 'SILVER' THEN fs.factor
                                ELSE fr.factor
                            END,
                            1.3
                        )
                    END
            END * 
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
        -- Datos base
        SELECT 
            ventas.ruc,
            ventas.agencia,
            COALESCE(p."META", 0)::BIGINT as meta_original,
            COALESCE(p."TOP", 'REGULAR')::TEXT as top,
            ventas.altas,
            ventas.corte_1,
            ventas.corte_2,
            ventas.corte_3,
            ventas.corte_4,
            ventas.precio_sin_igv_promedio,
            -- % cumplimiento para JOINs con tablas de factores
            CASE 
                WHEN COALESCE(p."META", 0) = 0 THEN (ventas.altas::NUMERIC / 100::NUMERIC) * 100
                ELSE (ventas.altas::NUMERIC / p."META"::NUMERIC) * 100
            END as pct_cumplimiento
        FROM (
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
                AND (LOWER(p_zona) = 'provincia' OR sr."CANAL" = 'Agencias')
            GROUP BY sr."DNI_ASESOR", sr."ASESOR"
        ) ventas
        LEFT JOIN "Parametros" p ON 
            p."RUC" = ventas.ruc 
            AND p."PERIODO" = v_periodo
            AND UPPER(p."ZONA") = UPPER(p_zona)
    ) datos
    LEFT JOIN factor_multiplicador_gold fg ON 
        UPPER(datos.top) = 'GOLD'
        AND datos.pct_cumplimiento >= fg.limite_inferior 
        AND (datos.pct_cumplimiento <= fg.limite_superior OR fg.limite_superior IS NULL)
    LEFT JOIN factor_multiplicador_silver fs ON 
        UPPER(datos.top) = 'SILVER'
        AND datos.pct_cumplimiento >= fs.limite_inferior 
        AND (datos.pct_cumplimiento <= fs.limite_superior OR fs.limite_superior IS NULL)
    LEFT JOIN factor_multiplicador_regular fr ON 
        UPPER(datos.top) NOT IN ('GOLD', 'SILVER')
        AND datos.pct_cumplimiento >= fr.limite_inferior 
        AND (datos.pct_cumplimiento <= fr.limite_superior OR fr.limite_superior IS NULL)
    LEFT JOIN marcha_blanca mb ON 
        mb.ruc = datos.ruc 
        AND mb.periodo = v_periodo
        AND UPPER(mb.zona) = UPPER(p_zona)
    LEFT JOIN bono_1_arpu ba ON 
        ba.ruc = datos.ruc 
        AND ba.periodo = v_periodo
        AND UPPER(ba.zona) = UPPER(p_zona)
    ORDER BY datos.altas DESC;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER, INTEGER) IS 
'Calcula comisiones con:
- Factores GOLD/SILVER/REGULAR según TOP
- Marcha Blanca: Si = factor 2.5, meta y % cumplimiento = NULL (mostrar "-")
- Meta = 0 sin marcha blanca: meta = 100 por defecto
- Bono ARPU: Si = multiplicador_final + 1
- Total a Pagar usa multiplicador_final';

