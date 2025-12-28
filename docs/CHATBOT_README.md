# Chatbot IA - Win Comisiones

## 🤖 Descripción

Chatbot inteligente que permite consultar información sobre comisiones, ventas y agencias usando lenguaje natural. Está integrado con OpenAI GPT-4 y la base de datos de Supabase.

## 🚀 Configuración

### 1. Instalar dependencias

La dependencia `openai` ya está agregada en `package.json`:

```json
"openai": "^4.77.0"
```

### 2. Configurar variables de entorno

#### Para despliegue en Vercel (recomendado):

1. Ve a tu proyecto en Vercel
2. **Settings** > **Environment Variables**
3. Agrega:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Tu API key de OpenAI
   - **Environment**: Production, Preview y Development
4. Re-despliega el proyecto

#### Para desarrollo local (opcional):

Crea el archivo `.env.local` en la raíz:

```env
OPENAI_API_KEY=tu_api_key_aqui

# Supabase (ya configurado)
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
```

**⚠️ IMPORTANTE**: Nunca compartas tu API key públicamente ni la subas a Git.

### 3. Desplegar

Haz push a Git y Vercel desplegará automáticamente:

```bash
git add .
git commit -m "Add chatbot integration"
git push
```

El chatbot estará disponible en: `http://localhost:9002/chatbot`

## 📋 Características

### Consultas que puede responder:

1. **Comisiones por agencia**
   - "¿Cuánto comisionó ALIV TELECOM en abril corte 1?"
   - "¿Cuál fue la comisión de EXPORTEL en agosto?"

2. **Altas por agencia**
   - "¿Cuántas altas tuvo FUTURA CONNECTION en abril?"
   - "Dime las altas de LEAD en mayo"

3. **Clasificación de agencias**
   - "¿Qué agencias son GOLD?"
   - "Muéstrame las agencias SILVER"

4. **Información detallada**
   - "Detalles de comisiones de C & C SALES en abril"
   - "Resumen de ALIV en el corte 2"

### Información que proporciona:

Para cada consulta, el chatbot puede mostrar:
- ✅ Total de altas
- ✅ Meta asignada
- ✅ Porcentaje de cumplimiento
- ✅ Multiplicador aplicado
- ✅ **Total comisionado en soles (S/)**

## 🔍 Cómo funciona

1. **Entrada del usuario**: Escribe tu pregunta en lenguaje natural
2. **Procesamiento GPT-4**: OpenAI analiza la pregunta y determina qué datos necesita
3. **Function Calling**: Si es necesario, GPT-4 llama a la función `buscar_comisiones`
4. **Consulta a Supabase**: Se busca la información en `resultado_comisiones_guardado`
5. **Respuesta formateada**: El chatbot presenta los datos de manera clara y estructurada

## 📊 Tablas consultadas

El chatbot tiene acceso a:

- `resultado_comisiones_guardado` - Resultados calculados de comisiones por periodo/corte
- `SalesRecord` - Registros de ventas individuales
- `Parametros` - Metas y clasificación de agencias (GOLD/SILVER/REGULAR)
- `marcha_blanca` - Agencias en periodo de prueba
- `bono_1_arpu` - Bonos adicionales

## 🎯 Formatos de periodo

El chatbot entiende los meses en español y los convierte automáticamente:

- "agosto 2025" → `202508`
- "abril 2025" → `202504`
- "diciembre 2024" → `202412`

## 🔐 Seguridad

- ✅ Las consultas están limitadas para evitar inyección SQL
- ✅ Solo se permiten operaciones de lectura (SELECT)
- ✅ La API Key de OpenAI está protegida en variables de entorno
- ✅ Límite de 100 registros por consulta

## 🛠️ Mantenimiento

### Actualizar el esquema

Si agregas nuevas tablas o campos, actualiza el esquema en:

`src/app/api/chatbot/route.ts` → función `getDatabaseSchema()`

### Ajustar el comportamiento

Modifica el prompt del sistema en:

`src/app/api/chatbot/route.ts` → `messages[0].content`

### Agregar nuevas funciones

Puedes agregar más funciones en el array `functions` del `completion.create()`

## 📞 Soporte

Para dudas o problemas, contacta al equipo de desarrollo.

---

**Desarrollado con ❤️ para Win Telecom**

