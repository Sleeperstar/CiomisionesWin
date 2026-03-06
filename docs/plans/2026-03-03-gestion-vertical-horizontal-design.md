# Diseño: Gestión Vertical/Horizontal en Comisiones

**Fecha**: 2026-03-03  
**Aplica desde**: Periodo 202512 (Diciembre 2025)  
**Alcance**: Corte 1 (Cortes 2-4 pendientes)

## Contexto

A partir de diciembre 2025, las agencias manejan dos gestiones distintas: **Vertical** y **Horizontal**. Cada venta en `SalesRecord` ya tiene esta clasificación en la columna `TIPO_COBERTURA`. Además, las agencias en **Marcha Blanca** se reportan como un grupo independiente.

## Decisiones de Diseño

### Enfoque elegido: B Refinado (tablas y función nuevas, legacy intacta)

Se eligió separar la lógica nueva de la legacy por dos razones:
1. **Claridad para el chatbot**: funciones independientes permiten que GPT las lea y explique sin ambigüedad.
2. **Comparabilidad**: el usuario puede pedir comparar cálculos antiguos vs nuevos consultando funciones distintas.

### Regla de periodo

| Periodo | Función RPC | Lógica |
|---------|-------------|--------|
| < 202512 | `get_comisiones_resumen` | Legacy: sin gestiones |
| >= 202512 | `get_comisiones_resumen_v2` | Nueva: V/H/MB separados |

## Esquema de BD

### Tablas nuevas

- `parametros_gestion`: Metas por gestión. Un asesor puede tener 2 filas (Vertical + Horizontal) para el mismo periodo. El TOP sigue en `Parametros` (global por asesor).
- `factor_multiplicador_vertical`: Factores por TOP y % cumplimiento para gestión Vertical.
- `factor_multiplicador_horizontal`: Factores por TOP y % cumplimiento para gestión Horizontal.

### Tablas modificadas

- `resultado_comisiones_corte_1`: Nueva columna `gestion` (NULL=legacy, VERTICAL, HORIZONTAL, MARCHA_BLANCA). Unique index actualizado a `(periodo, zona, ruc, COALESCE(gestion, 'LEGACY'))`.

### Tablas sin cambios

- `Parametros`, `SalesRecord`, `marcha_blanca`, `bono_1_arpu`, `factor_multiplicador_gold/silver/regular`

## Función `get_comisiones_resumen_v2`

### Diferencias con la función legacy

1. **Agrupación**: `GROUP BY DNI_ASESOR, ASESOR, TIPO_COBERTURA` (agrega por gestión)
2. **Metas**: vienen de `parametros_gestion` en vez de `Parametros.META`
3. **Factores**: usa `factor_multiplicador_vertical` o `factor_multiplicador_horizontal` según TIPO_COBERTURA, con columna `top` para diferenciar GOLD/SILVER/REGULAR
4. **Marcha Blanca**: si el asesor tiene marcha blanca, su gestión se marca como `MARCHA_BLANCA` (factor fijo 2.5, meta/% cumplimiento = NULL)
5. **Retorno**: incluye columna `gestion` (VERTICAL/HORIZONTAL/MARCHA_BLANCA)
6. **Ordenamiento**: Vertical primero, luego Horizontal, luego Marcha Blanca

### Fórmula (sin cambios en la esencia)

```
total_a_pagar = precio_sin_igv_promedio × multiplicador_final × corte_N
```

Donde `multiplicador_final = factor_multiplicador + (1 si bono ARPU)`.

## Frontend

El componente `ResultadoComision` detecta el periodo y:
- **< 202512**: Llama a `get_comisiones_resumen` (tabla sin columna GESTIÓN, con columna M.BLANCA)
- **>= 202512**: Llama a `get_comisiones_resumen_v2` (tabla con columna GESTIÓN, colores por grupo, badges V/H/MB en header)

Colores por gestión:
- Vertical: verde esmeralda (borde izquierdo + badge)
- Horizontal: azul cielo (borde izquierdo + badge)
- Marcha Blanca: púrpura (borde izquierdo + badge)

## Pendientes

- [ ] Poblar `factor_multiplicador_vertical` y `factor_multiplicador_horizontal` con rangos reales
- [ ] Poblar `parametros_gestion` con metas reales por gestión
- [ ] Agregar registros de `marcha_blanca` para periodos >= 202512 si aplica
- [ ] Implementar la misma lógica para Cortes 2, 3 y 4
- [ ] Actualizar componente `UploadParameters` para subir metas por gestión
