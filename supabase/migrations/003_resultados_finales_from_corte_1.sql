-- ============================================================
-- Migración 003: Agregar gestion a cortes 2-4 y recrear vista
-- desde corte_1 como base
-- ============================================================

-- Corte 2: agregar gestion y actualizar unique
ALTER TABLE resultado_comisiones_corte_2 ADD COLUMN IF NOT EXISTS gestion VARCHAR(20) DEFAULT NULL;
COMMENT ON COLUMN resultado_comisiones_corte_2.gestion IS 'NULL = legacy (pre dic-2025), VERTICAL, HORIZONTAL, MARCHA_BLANCA';
ALTER TABLE resultado_comisiones_corte_2 DROP CONSTRAINT IF EXISTS resultado_comisiones_corte_2_periodo_zona_ruc_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_corte_2_periodo_zona_ruc_gestion ON resultado_comisiones_corte_2(periodo, zona, ruc, COALESCE(gestion, 'LEGACY'));

-- Corte 3: agregar gestion y actualizar unique
ALTER TABLE resultado_comisiones_corte_3 ADD COLUMN IF NOT EXISTS gestion VARCHAR(20) DEFAULT NULL;
COMMENT ON COLUMN resultado_comisiones_corte_3.gestion IS 'NULL = legacy (pre dic-2025), VERTICAL, HORIZONTAL, MARCHA_BLANCA';
ALTER TABLE resultado_comisiones_corte_3 DROP CONSTRAINT IF EXISTS resultado_comisiones_corte_3_periodo_zona_ruc_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_corte_3_periodo_zona_ruc_gestion ON resultado_comisiones_corte_3(periodo, zona, ruc, COALESCE(gestion, 'LEGACY'));

-- Corte 4: agregar gestion y actualizar unique
ALTER TABLE resultado_comisiones_corte_4 ADD COLUMN IF NOT EXISTS gestion VARCHAR(20) DEFAULT NULL;
COMMENT ON COLUMN resultado_comisiones_corte_4.gestion IS 'NULL = legacy (pre dic-2025), VERTICAL, HORIZONTAL, MARCHA_BLANCA';
ALTER TABLE resultado_comisiones_corte_4 DROP CONSTRAINT IF EXISTS resultado_comisiones_corte_4_periodo_zona_ruc_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_corte_4_periodo_zona_ruc_gestion ON resultado_comisiones_corte_4(periodo, zona, ruc, COALESCE(gestion, 'LEGACY'));

-- Recrear vista resultados_finales con corte_1 como base
DROP VIEW IF EXISTS resultados_finales;

CREATE OR REPLACE VIEW resultados_finales AS
WITH base_data AS (
    SELECT
        c1.periodo,
        c1.zona,
        c1.ruc,
        c1.agencia,
        c1.gestion,
        c1.meta,
        c1.top,
        c1.altas,
        c1.precio_sin_igv_promedio,
        c1.porcentaje_cumplimiento,
        c1.marcha_blanca,
        c1.bono_arpu,
        c1.factor_multiplicador,
        c1.multiplicador_final,
        c1.corte_1,
        COALESCE(c2.corte_2, c1.corte_2, 0::BIGINT) AS corte_2,
        COALESCE(c3.corte_3, c2.corte_3, c1.corte_3, 0::BIGINT) AS corte_3,
        COALESCE(c4.corte_4, c3.corte_4, c2.corte_4, c1.corte_4, 0::BIGINT) AS corte_4,
        COALESCE(c2.comision_total, c1.total_a_pagar_corte_1, 0::NUMERIC) AS comision_total,
        COALESCE(c2.pago_corte_1, c1.total_a_pagar_corte_1, 0::NUMERIC) AS pago_corte_1,
        COALESCE(c2.total_a_pagar_corte_2, 0::NUMERIC) AS total_a_pagar_corte_2,
        COALESCE(c2.penalidad_1_monto, 0::NUMERIC) AS penalidad_1_monto,
        COALESCE(c2.clawback_1_monto, 0::NUMERIC) AS clawback_1_monto,
        COALESCE(c3.penalidad_2_monto, 0::NUMERIC) AS penalidad_2_monto,
        COALESCE(c3.clawback_2_monto, 0::NUMERIC) AS clawback_2_monto,
        COALESCE(c4.penalidad_3_monto, 0::NUMERIC) AS penalidad_3_monto,
        COALESCE(c4.clawback_3_monto, 0::NUMERIC) AS clawback_3_monto,
        c1.created_at,
        GREATEST(c1.updated_at, c2.updated_at, c3.updated_at, c4.updated_at) AS updated_at
    FROM resultado_comisiones_corte_1 c1
    LEFT JOIN resultado_comisiones_corte_2 c2 ON
        c1.periodo = c2.periodo
        AND c1.zona = c2.zona
        AND c1.ruc = c2.ruc
        AND COALESCE(c1.gestion, 'LEGACY') = COALESCE(c2.gestion, 'LEGACY')
    LEFT JOIN resultado_comisiones_corte_3 c3 ON
        c1.periodo = c3.periodo
        AND c1.zona = c3.zona
        AND c1.ruc = c3.ruc
        AND COALESCE(c1.gestion, 'LEGACY') = COALESCE(c3.gestion, 'LEGACY')
    LEFT JOIN resultado_comisiones_corte_4 c4 ON
        c1.periodo = c4.periodo
        AND c1.zona = c4.zona
        AND c1.ruc = c4.ruc
        AND COALESCE(c1.gestion, 'LEGACY') = COALESCE(c4.gestion, 'LEGACY')
)
SELECT
    periodo,
    zona,
    ruc,
    agencia,
    gestion,
    meta,
    top,
    altas,
    precio_sin_igv_promedio,
    porcentaje_cumplimiento,
    marcha_blanca,
    bono_arpu,
    factor_multiplicador,
    multiplicador_final,
    corte_1,
    corte_2,
    corte_3,
    corte_4,
    comision_total,
    pago_corte_1,
    total_a_pagar_corte_2,
    penalidad_1_monto,
    penalidad_2_monto,
    penalidad_3_monto,
    (penalidad_1_monto + penalidad_2_monto + penalidad_3_monto) AS total_penalidades,
    clawback_1_monto,
    clawback_2_monto,
    clawback_3_monto,
    (clawback_1_monto + clawback_2_monto + clawback_3_monto) AS total_clawbacks,
    (penalidad_1_monto + penalidad_2_monto + penalidad_3_monto + clawback_1_monto + clawback_2_monto + clawback_3_monto) AS total_descuentos,
    ROUND(comision_total - (penalidad_1_monto + penalidad_2_monto + penalidad_3_monto + clawback_1_monto + clawback_2_monto + clawback_3_monto), 2) AS resultado_neto_final,
    created_at,
    updated_at
FROM base_data
ORDER BY periodo DESC, zona, gestion NULLS LAST, agencia;

GRANT SELECT ON resultados_finales TO authenticated;
GRANT SELECT ON resultados_finales TO anon;

COMMENT ON VIEW resultados_finales IS 'Vista consolidada de resultados de comisiones.
Base: resultado_comisiones_corte_1 (visible desde que se guarda el primer corte).
JOINs con corte_2, corte_3, corte_4 usando (periodo, zona, ruc, gestion).
Incluye columna gestion para periodos >= 202512.';
