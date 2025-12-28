# 🚀 Guía Rápida - Desplegar Chatbot en Vercel

## ✅ Paso 1: Verificar que `package.json` tiene OpenAI

**Ya está hecho** ✓

```json
"dependencies": {
  ...
  "openai": "^4.77.0",
  ...
}
```

---

## 🔑 Paso 2: Configurar API Key en Vercel

### Opción A: Desde el Dashboard de Vercel

1. **Abre tu proyecto en Vercel**
   - Ve a: https://vercel.com/dashboard
   - Selecciona tu proyecto `CiomisionesWin`

2. **Agrega la variable de entorno**
   - Click en **Settings** (arriba)
   - Click en **Environment Variables** (menú lateral)
   - Click en **Add New**

3. **Configura la variable**
   ```
   Name:  OPENAI_API_KEY
   Value: [Tu API Key de OpenAI]
   
   Environments: ☑ Production  ☑ Preview  ☑ Development
   ```
   
   **Nota**: Usa la API key que te proporcionaron (comienza con `sk-proj-`)

4. **Guardar**
   - Click en **Save**

### Opción B: Desde Vercel CLI (si la tienes instalada)

```bash
vercel env add OPENAI_API_KEY
# Pega tu API key cuando te lo pida
# Selecciona: Production, Preview, Development
```

---

## 📤 Paso 3: Desplegar

### Método 1: Push a Git (Automático)

```bash
git add .
git commit -m "feat: Add chatbot with OpenAI integration"
git push origin main
```

Vercel detectará el push y desplegará automáticamente.

### Método 2: Desde Vercel Dashboard (Manual)

1. Ve a tu proyecto en Vercel
2. Click en **Deployments**
3. Click en **Redeploy** (botón derecho del último deployment)
4. Confirma el redespliegue

---

## ✅ Paso 4: Verificar el despliegue

1. **Espera a que termine el build** (1-3 minutos)
2. **Visita tu sitio**: `https://tu-proyecto.vercel.app/chatbot`
3. **Prueba el chatbot** con estas preguntas:
   - "¿Cuánto comisionó ALIV TELECOM en abril corte 1?"
   - "¿Cuántas altas tuvo EXPORTEL en abril?"
   - "¿Qué agencias son GOLD?"

---

## 🔍 Verificar que la API Key está configurada

### Desde Vercel Dashboard:

1. **Settings** > **Environment Variables**
2. Deberías ver: `OPENAI_API_KEY` con valor `***********` (oculto)
3. Si NO aparece, vuelve al **Paso 2**

### En los logs del deployment:

1. Ve a **Deployments** > Click en el último deployment
2. En **Build Logs**, busca:
   ```
   ✓ Compiled successfully
   ```
3. NO debe aparecer:
   ```
   ✗ Module not found: Can't resolve 'openai'
   ```

---

## 🆘 Solución de problemas

### Error: "Module not found: Can't resolve 'openai'"

**Causa**: No se instaló la dependencia
**Solución**: Verifica que `package.json` tiene `"openai": "^4.77.0"` y vuelve a hacer push

### Error: "OpenAI API key not found"

**Causa**: No configuraste la variable de entorno
**Solución**: Ve a **Settings** > **Environment Variables** y agrega `OPENAI_API_KEY`

### Error: "429 Too Many Requests"

**Causa**: Excediste el límite de llamadas a OpenAI
**Solución**: Espera unos minutos o revisa tu plan en OpenAI

### El chatbot no responde

1. **Verifica en Vercel Logs**:
   - Ve a **Deployments** > Click en deployment > **Functions**
   - Busca errores en `/api/chatbot`

2. **Verifica la API Key**:
   - La key debe empezar con `sk-proj-`
   - Debe tener acceso a GPT-4

3. **Verifica que los datos existen**:
   - El chatbot busca en `resultado_comisiones_guardado`
   - Asegúrate de haber guardado resultados primero

---

## 📊 Monitoring (Opcional)

Para ver el uso del chatbot en Vercel:

1. **Analytics** > **Web Vitals**
   - Verifica el rendimiento de `/chatbot`

2. **Deployments** > **Functions**
   - Ve cuántas veces se llama `/api/chatbot`
   - Revisa los tiempos de respuesta

---

## 🎉 ¡Listo!

Si todo salió bien, tu chatbot debería estar funcionando en:

**https://tu-proyecto.vercel.app/chatbot**

Puedes compartir el link con tu equipo para que empiecen a usarlo.

---

**Desarrollado con ❤️ para Win Telecom**

