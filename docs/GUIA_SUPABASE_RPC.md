# Guía: Crear Funciones RPC en Supabase

Esta guía te explica paso a paso cómo crear la función `get_comisiones_resumen` en tu proyecto de Supabase.

---

## 📋 ¿Qué es una función RPC?

**RPC (Remote Procedure Call)** permite ejecutar funciones PostgreSQL directamente desde tu aplicación. En lugar de traer miles de registros y procesarlos en JavaScript, la base de datos hace el cálculo y devuelve solo el resultado.

### Ventajas:
- ⚡ **Más rápido**: El cálculo se hace en el servidor de BD
- 📉 **Menos datos**: Solo se transfiere el resultado
- 🔒 **Más seguro**: La lógica está en un solo lugar
- 🤖 **Ideal para IA**: ChatGPT puede llamar directamente a estas funciones

---

## 🚀 Paso 1: Acceder al Editor SQL de Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. En el menú lateral izquierdo, haz clic en **"SQL Editor"** (icono de consola)

![SQL Editor](https://supabase.com/docs/img/guides/database/sql-editor.png)

---

## 🛠️ Paso 2: Crear la Función

1. En el SQL Editor, haz clic en **"+ New query"**
2. Copia y pega el siguiente código SQL:

```sql
-- ============================================================================
-- FUNCIÓN RPC: get_comisiones_resumen (VERSIÓN OPTIMIZADA)
-- ============================================================================
-- Incluye JOIN con la tabla Parametros para obtener META y TOP
-- en una sola consulta optimizada.

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
    meta INTEGER,
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
    v_periodo TEXT;
BEGIN
    -- Calcular el rango de fechas del mes
    start_date := make_date(p_year, p_mes, 1);
    end_date := start_date + INTERVAL '1 month';
    
    -- Calcular el periodo en formato YYYYMM para buscar en Parametros
    v_periodo := p_year::TEXT || LPAD(p_mes::TEXT, 2, '0');
    
    RETURN QUERY
    SELECT 
        ventas.ruc,
        ventas.agencia,
        -- META y TOP desde la tabla Parametros (LEFT JOIN)
        COALESCE(p."META", 0)::INTEGER as meta,
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

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER) TO authenticated;
```

3. Haz clic en **"Run"** (o presiona `Ctrl+Enter`)

4. Deberías ver el mensaje: **"Success. No rows returned"**

---

## ✅ Paso 3: Verificar que la Función Existe

Para verificar que la función se creó correctamente, ejecuta esta consulta de prueba:

```sql
-- Probar la función con datos de agosto 2025, zona lima
SELECT * FROM get_comisiones_resumen('lima', 8, 2025);
```

Deberías ver una tabla con columnas: `ruc`, `agencia`, `meta`, `top`, `altas`, `corte_1`, `corte_2`, `corte_3`, `corte_4`, `precio_sin_igv_promedio`

---

## 📱 Paso 4: Llamar desde la Aplicación

Desde tu aplicación Next.js/React, puedes llamar a la función así:

```typescript
import { supabase } from '@/lib/supabase';

// Llamar a la función RPC
const { data, error } = await supabase.rpc('get_comisiones_resumen', {
    p_zona: 'lima',
    p_mes: 8,       // Agosto
    p_year: 2025
});

if (error) {
    console.error('Error:', error.message);
} else {
    console.log('Datos:', data);
    // data es un array con el resumen por agencia
}
```

---

## 🔧 Paso 5: Verificar en la Interfaz de Supabase

También puedes ver la función desde:

1. En el menú lateral, ve a **"Database"** → **"Functions"**
2. Busca `get_comisiones_resumen` en la lista
3. Haz clic para ver los detalles

---

## 📊 Explicación de los Filtros

La función aplica estos filtros automáticamente:

| Filtro | Campo | Condición |
|--------|-------|-----------|
| 1 | `FECHA_VALIDACION` | No es NULL |
| 2 | `FECHA_INSTALADO` | >= primer día del mes |
| 3 | `FECHA_INSTALADO` | < primer día del mes siguiente |
| 4 | `CANAL` | = 'Agencias' **(solo si zona = 'lima')** |

### Campos devueltos:

| Campo | Origen | Descripción |
|-------|--------|-------------|
| `ruc` | SalesRecord.DNI_ASESOR | RUC de la agencia |
| `agencia` | SalesRecord.ASESOR | Nombre de la agencia |
| `meta` | Parametros.META | Meta de ventas (JOIN) |
| `top` | Parametros.TOP | Si es agencia TOP (JOIN) |
| `altas` | `COUNT(*)` | Total de registros válidos |
| `corte_1` | `COUNT(*) WHERE CORTE_1 = 1` | Registros en corte 1 |
| `corte_2` | `COUNT(*) WHERE CORTE_2 = 1` | Registros en corte 2 |
| `corte_3` | `COUNT(*) WHERE CORTE_3 = 1` | Registros en corte 3 |
| `corte_4` | `COUNT(*) WHERE CORTE_4 = 1` | Registros en corte 4 |
| `precio_sin_igv_promedio` | `AVG(PRECIO/1.18)` | Precio promedio sin IGV |

### Ventajas de esta función optimizada:

1. **UNA sola consulta** - Incluye JOIN con Parametros
2. **Todo se calcula en la BD** - No hay procesamiento en el frontend
3. **Menos datos transferidos** - Solo el resumen final
4. **Más rápido** - PostgreSQL es muy eficiente en agregaciones

---

## 🤖 Uso con Chatbot de IA (ChatGPT)

Para que ChatGPT pueda consultar las comisiones, puedes crear una API endpoint:

```typescript
// app/api/comisiones/route.ts
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const zona = searchParams.get('zona') || 'lima';
    const mes = parseInt(searchParams.get('mes') || '1');
    const year = parseInt(searchParams.get('year') || '2025');
    const agencia = searchParams.get('agencia'); // Opcional: filtrar por agencia

    const { data, error } = await supabase.rpc('get_comisiones_resumen', {
        p_zona: zona,
        p_mes: mes,
        p_year: year
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Si se especifica una agencia, filtrar
    if (agencia) {
        const filtered = data.filter((d: any) => 
            d.agencia?.toLowerCase().includes(agencia.toLowerCase())
        );
        return NextResponse.json(filtered);
    }

    return NextResponse.json(data);
}
```

Luego ChatGPT puede hacer consultas como:
- `GET /api/comisiones?zona=lima&mes=8&year=2025`
- `GET /api/comisiones?zona=lima&mes=8&agencia=LEAD%20SALES`

---

## 🔄 Actualizar la Función

Si necesitas modificar la función:

1. Ve al SQL Editor
2. Modifica el código SQL
3. Ejecuta de nuevo (el `CREATE OR REPLACE` actualiza la función existente)

---

## ⚠️ Solución de Problemas

### Error: "function get_comisiones_resumen does not exist"

La función no se creó correctamente. Verifica:
1. Que ejecutaste el SQL completo
2. Que no hay errores de sintaxis
3. Que los nombres de tabla y columnas coinciden exactamente (son case-sensitive)

### Error: "permission denied for function"

Ejecuta los GRANT al final del script:
```sql
GRANT EXECUTE ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_comisiones_resumen(TEXT, INTEGER, INTEGER) TO authenticated;
```

### La función devuelve 0 registros

Verifica que:
1. Existen datos en `SalesRecord` para el mes/año especificado
2. Los datos tienen `FECHA_VALIDACION` no nulo
3. Los datos tienen `FECHA_INSTALADO` dentro del rango

---

## 📁 Ubicación del Script SQL

El script SQL también está disponible en:
```
supabase/migrations/001_create_comisiones_rpc.sql
```

Puedes ejecutar este archivo directamente en el SQL Editor de Supabase.

