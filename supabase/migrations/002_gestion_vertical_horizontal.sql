-- ============================================================================
-- MIGRACIÓN 002: Gestión Vertical/Horizontal para periodos >= 202512
-- ============================================================================
-- A partir de diciembre 2025, las agencias se dividen en 3 gestiones:
-- - VERTICAL: ventas con TIPO_COBERTURA = 'VERTICAL'
-- - HORIZONTAL: ventas con TIPO_COBERTURA = 'HORIZONTAL'
-- - MARCHA_BLANCA: agencias con marcha blanca (factor fijo 2.5, altas combinadas)
--
-- Cada gestión tiene:
-- - Metas separadas (tabla parametros_gestion)
-- - Factores multiplicadores propios (factor_multiplicador_vertical/horizontal)
-- - El TOP sigue siendo global por asesor (tabla Parametros)
--
-- Para periodos < 202512, se usa la función legacy get_comisiones_resumen
-- Para periodos >= 202512, se usa get_comisiones_resumen_v2
-- ============================================================================

-- ============================================================================
-- TABLA: parametros_gestion
-- Metas separadas por gestión (Vertical/Horizontal)
-- ============================================================================
CREATE TABLE IF NOT EXISTS parametros_gestion (
    id SERIAL PRIMARY KEY,
    ruc VARCHAR(20) NOT NULL,
    agencia VARCHAR(255),
    gestion VARCHAR(20) NOT NULL CHECK (gestion IN ('VERTICAL', 'HORIZONTAL')),
    meta BIGINT NOT NULL DEFAULT 0,
    zona VARCHAR(50),
    periodo INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ruc, periodo, zona, gestion)
);

CREATE INDEX IF NOT EXISTS idx_parametros_gestion_periodo_zona ON parametros_gestion(periodo, zona);
CREATE INDEX IF NOT EXISTS idx_parametros_gestion_ruc ON parametros_gestion(ruc);

GRANT SELECT, INSERT, UPDATE, DELETE ON parametros_gestion TO authenticated;
GRANT SELECT ON parametros_gestion TO anon;
GRANT USAGE, SELECT ON SEQUENCE parametros_gestion_id_seq TO authenticated;

COMMENT ON TABLE parametros_gestion IS 'Metas separadas por gestión (Vertical/Horizontal) para periodos >= 202512. El TOP sigue en la tabla Parametros original.';

-- ============================================================================
-- TABLA: factor_multiplicador_vertical
-- Factores para gestión VERTICAL, por TOP y rango de % cumplimiento
-- ============================================================================
CREATE TABLE IF NOT EXISTS factor_multiplicador_vertical (
    id SERIAL PRIMARY KEY,
    top VARCHAR(20) NOT NULL CHECK (top IN ('GOLD', 'SILVER', 'REGULAR')),
    limite_inferior DECIMAL(5,2) NOT NULL,
    limite_superior DECIMAL(5,2),
    factor DECIMAL(3,1) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_factor_vertical_top ON factor_multiplicador_vertical(top);

GRANT SELECT, INSERT, UPDATE, DELETE ON factor_multiplicador_vertical TO authenticated;
GRANT SELECT ON factor_multiplicador_vertical TO anon;
GRANT USAGE, SELECT ON SEQUENCE factor_multiplicador_vertical_id_seq TO authenticated;

COMMENT ON TABLE factor_multiplicador_vertical IS 'Factores multiplicadores para gestión VERTICAL, clasificados por TOP (GOLD/SILVER/REGULAR) y rango de % cumplimiento. Aplica desde periodo 202512.';

-- ============================================================================
-- TABLA: factor_multiplicador_horizontal
-- Factores para gestión HORIZONTAL, por TOP y rango de % cumplimiento
-- ============================================================================
CREATE TABLE IF NOT EXISTS factor_multiplicador_horizontal (
    id SERIAL PRIMARY KEY,
    top VARCHAR(20) NOT NULL CHECK (top IN ('GOLD', 'SILVER', 'REGULAR')),
    limite_inferior DECIMAL(5,2) NOT NULL,
    limite_superior DECIMAL(5,2),
    factor DECIMAL(3,1) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_factor_horizontal_top ON factor_multiplicador_horizontal(top);

GRANT SELECT, INSERT, UPDATE, DELETE ON factor_multiplicador_horizontal TO authenticated;
GRANT SELECT ON factor_multiplicador_horizontal TO anon;
GRANT USAGE, SELECT ON SEQUENCE factor_multiplicador_horizontal_id_seq TO authenticated;

COMMENT ON TABLE factor_multiplicador_horizontal IS 'Factores multiplicadores para gestión HORIZONTAL, clasificados por TOP (GOLD/SILVER/REGULAR) y rango de % cumplimiento. Aplica desde periodo 202512.';

-- ============================================================================
-- ALTER: resultado_comisiones_corte_1 - Agregar columna gestion
-- ============================================================================
ALTER TABLE resultado_comisiones_corte_1
ADD COLUMN IF NOT EXISTS gestion VARCHAR(20) DEFAULT NULL;

COMMENT ON COLUMN resultado_comisiones_corte_1.gestion IS 'NULL = legacy (pre dic-2025), VERTICAL, HORIZONTAL, MARCHA_BLANCA';

ALTER TABLE resultado_comisiones_corte_1
DROP CONSTRAINT IF EXISTS resultado_comisiones_corte_1_periodo_zona_ruc_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_corte_1_periodo_zona_ruc_gestion
ON resultado_comisiones_corte_1(periodo, zona, ruc, COALESCE(gestion, 'LEGACY'));

-- ============================================================================
-- FUNCIÓN RPC: get_comisiones_resumen_v2
-- ============================================================================
-- Calcula comisiones con gestiones Vertical/Horizontal/Marcha Blanca
-- Para periodos >= 202512
--
-- Diferencia clave con la función legacy:
-- - Marcha Blanca se identifica ANTES de agrupar: sus ventas V+H se combinan
--   en un solo registro por asesor (sin duplicados)
-- - Asesores normales se agrupan por TIPO_COBERTURA (V/H separados)
-- - Metas vienen de parametros_gestion (por gestión)
-- - Factores vienen de factor_multiplicador_vertical/horizontal
-- ============================================================================
CREATE OR REPLACE FUNCTION get_comisiones_resumen_v2(
    p_zona TEXT,
    p_mes INTEGER,
    p_year INTEGER DEFAULT 2025,
    p_corte INTEGER DEFAULT 1
)
RETURNS TABLE (
    gestion TEXT,
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
    WITH mb_rucs AS (
        SELECT mb2.ruc
        FROM marcha_blanca mb2
        WHERE mb2.periodo = v_periodo
          AND UPPER(mb2.zona) = UPPER(p_zona)
          AND UPPER(mb2.marcha_blanca) IN ('SÍ', 'SI')
    ),
    -- Asesores SIN marcha blanca: agrupados por TIPO_COBERTURA (V/H separados)
    ventas_normales AS (
        SELECT
            sr."DNI_ASESOR"::TEXT as ruc,
            sr."ASESOR"::TEXT as agencia,
            UPPER(sr."TIPO_COBERTURA")::TEXT as tipo_cobertura,
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
            AND sr."TIPO_ESTADO" = 'Validado'
            AND sr."DNI_ASESOR"::TEXT NOT IN (SELECT mb_rucs.ruc FROM mb_rucs)
        GROUP BY sr."DNI_ASESOR", sr."ASESOR", sr."TIPO_COBERTURA"
    ),
    -- Asesores CON marcha blanca: todas sus ventas combinadas (sin separar V/H)
    ventas_marcha_blanca AS (
        SELECT
            sr."DNI_ASESOR"::TEXT as ruc,
            sr."ASESOR"::TEXT as agencia,
            'MARCHA_BLANCA'::TEXT as tipo_cobertura,
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
            AND sr."TIPO_ESTADO" = 'Validado'
            AND sr."DNI_ASESOR"::TEXT IN (SELECT mb_rucs.ruc FROM mb_rucs)
        GROUP BY sr."DNI_ASESOR", sr."ASESOR"
    ),
    datos_union AS (
        SELECT * FROM ventas_normales
        UNION ALL
        SELECT * FROM ventas_marcha_blanca
    )
    SELECT
        datos.tipo_cobertura as gestion,
        datos.ruc,
        datos.agencia,
        CASE
            WHEN datos.tipo_cobertura = 'MARCHA_BLANCA' THEN NULL::BIGINT
            WHEN COALESCE(pg.meta, 0) = 0 THEN 100::BIGINT
            ELSE pg.meta
        END as meta,
        COALESCE(p."TOP", 'REGULAR')::TEXT as top,
        datos.altas,
        datos.corte_1,
        datos.corte_2,
        datos.corte_3,
        datos.corte_4,
        datos.precio_sin_igv_promedio,
        CASE
            WHEN datos.tipo_cobertura = 'MARCHA_BLANCA' THEN NULL::NUMERIC
            ELSE
                CASE
                    WHEN COALESCE(pg.meta, 0) = 0 THEN
                        ROUND((datos.altas::NUMERIC / 100::NUMERIC) * 100, 2)
                    WHEN pg.meta > 0 THEN
                        ROUND((datos.altas::NUMERIC / pg.meta::NUMERIC) * 100, 2)
                    ELSE 0
                END
        END as porcentaje_cumplimiento,
        CASE WHEN datos.tipo_cobertura = 'MARCHA_BLANCA' THEN 'Sí' ELSE 'No' END::TEXT as marcha_blanca,
        COALESCE(ba.bono_1_arpu, 'No')::TEXT as bono_arpu,
        -- Factor Multiplicador
        CASE
            WHEN datos.tipo_cobertura = 'MARCHA_BLANCA' THEN 2.5
            ELSE COALESCE(
                CASE
                    WHEN datos.tipo_cobertura = 'VERTICAL' THEN fv.factor
                    ELSE fh.factor
                END,
                1.3
            )
        END::NUMERIC as factor_multiplicador,
        -- Multiplicador Final (factor + 1 si bono ARPU)
        CASE
            WHEN UPPER(COALESCE(ba.bono_1_arpu, 'No')) IN ('SÍ', 'SI') THEN
                CASE
                    WHEN datos.tipo_cobertura = 'MARCHA_BLANCA' THEN 2.5 + 1
                    ELSE COALESCE(
                        CASE
                            WHEN datos.tipo_cobertura = 'VERTICAL' THEN fv.factor
                            ELSE fh.factor
                        END,
                        1.3
                    ) + 1
                END
            ELSE
                CASE
                    WHEN datos.tipo_cobertura = 'MARCHA_BLANCA' THEN 2.5
                    ELSE COALESCE(
                        CASE
                            WHEN datos.tipo_cobertura = 'VERTICAL' THEN fv.factor
                            ELSE fh.factor
                        END,
                        1.3
                    )
                END
        END::NUMERIC as multiplicador_final,
        -- Total a Pagar
        ROUND(
            datos.precio_sin_igv_promedio *
            CASE
                WHEN UPPER(COALESCE(ba.bono_1_arpu, 'No')) IN ('SÍ', 'SI') THEN
                    CASE
                        WHEN datos.tipo_cobertura = 'MARCHA_BLANCA' THEN 2.5 + 1
                        ELSE COALESCE(
                            CASE
                                WHEN datos.tipo_cobertura = 'VERTICAL' THEN fv.factor
                                ELSE fh.factor
                            END,
                            1.3
                        ) + 1
                    END
                ELSE
                    CASE
                        WHEN datos.tipo_cobertura = 'MARCHA_BLANCA' THEN 2.5
                        ELSE COALESCE(
                            CASE
                                WHEN datos.tipo_cobertura = 'VERTICAL' THEN fv.factor
                                ELSE fh.factor
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
    FROM datos_union datos
    LEFT JOIN "Parametros" p ON
        p."RUC" = datos.ruc
        AND p."PERIODO" = v_periodo
        AND UPPER(p."ZONA") = UPPER(p_zona)
    LEFT JOIN parametros_gestion pg ON
        datos.tipo_cobertura != 'MARCHA_BLANCA'
        AND pg.ruc = datos.ruc
        AND pg.periodo = v_periodo
        AND UPPER(pg.zona) = UPPER(p_zona)
        AND UPPER(pg.gestion) = datos.tipo_cobertura
    LEFT JOIN factor_multiplicador_vertical fv ON
        datos.tipo_cobertura = 'VERTICAL'
        AND UPPER(COALESCE(p."TOP", 'REGULAR')) = UPPER(fv.top)
        AND (
            CASE
                WHEN COALESCE(pg.meta, 0) = 0 THEN (datos.altas::NUMERIC / 100::NUMERIC) * 100
                ELSE (datos.altas::NUMERIC / pg.meta::NUMERIC) * 100
            END
        ) >= fv.limite_inferior
        AND (
            (
                CASE
                    WHEN COALESCE(pg.meta, 0) = 0 THEN (datos.altas::NUMERIC / 100::NUMERIC) * 100
                    ELSE (datos.altas::NUMERIC / pg.meta::NUMERIC) * 100
                END
            ) <= fv.limite_superior OR fv.limite_superior IS NULL
        )
    LEFT JOIN factor_multiplicador_horizontal fh ON
        datos.tipo_cobertura = 'HORIZONTAL'
        AND UPPER(COALESCE(p."TOP", 'REGULAR')) = UPPER(fh.top)
        AND (
            CASE
                WHEN COALESCE(pg.meta, 0) = 0 THEN (datos.altas::NUMERIC / 100::NUMERIC) * 100
                ELSE (datos.altas::NUMERIC / pg.meta::NUMERIC) * 100
            END
        ) >= fh.limite_inferior
        AND (
            (
                CASE
                    WHEN COALESCE(pg.meta, 0) = 0 THEN (datos.altas::NUMERIC / 100::NUMERIC) * 100
                    ELSE (datos.altas::NUMERIC / pg.meta::NUMERIC) * 100
                END
            ) <= fh.limite_superior OR fh.limite_superior IS NULL
        )
    LEFT JOIN bono_1_arpu ba ON
        ba.ruc = datos.ruc
        AND ba.periodo = v_periodo
        AND UPPER(ba.zona) = UPPER(p_zona)
    ORDER BY
        CASE datos.tipo_cobertura
            WHEN 'VERTICAL' THEN 1
            WHEN 'HORIZONTAL' THEN 2
            WHEN 'MARCHA_BLANCA' THEN 3
            ELSE 4
        END,
        datos.altas DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_comisiones_resumen_v2(TEXT, INTEGER, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_comisiones_resumen_v2(TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_comisiones_resumen_v2(TEXT, INTEGER, INTEGER, INTEGER) IS
'Calcula comisiones con gestiones separadas (Vertical/Horizontal/Marcha Blanca).
Aplica para periodos >= 202512.

Diferencias con get_comisiones_resumen (legacy):
- Agrupa ventas por TIPO_COBERTURA (Vertical/Horizontal)
- Marcha Blanca: se identifica ANTES de agrupar, sus ventas V+H se combinan
  en un solo registro por asesor (sin duplicados)
- Metas separadas por gestión (tabla parametros_gestion)
- Factores separados por gestión (tablas factor_multiplicador_vertical/horizontal)
- Retorna columna gestion para diferenciar cada grupo

Para periodos < 202512, usar get_comisiones_resumen (la función original).';
