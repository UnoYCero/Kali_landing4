# Acceso a la base de datos Neon con Netlify

Este repositorio ya incluye una función serverless que consulta la base de datos Neon usando el paquete `@netlify/neon` y la variable de entorno `NETLIFY_DATABASE_URL` generada por Netlify DB.

## Preparación local
1. Asegúrate de tener instalado Node.js 18+ y el [CLI de Netlify](https://docs.netlify.com/cli/get-started/).
2. Exporta tu variable de entorno:
   ```bash
   export NETLIFY_DATABASE_URL="<URL que ves en Netlify DB>"
   ```
3. Instala dependencias (el CLI también instalará `@netlify/neon` cuando haga build):
   ```bash
   npm install
   ```
4. Levanta el entorno local para probar funciones:
   ```bash
   netlify dev
   ```
   La función quedará disponible en `http://localhost:8888/.netlify/functions/posts`.

## Usar la función `posts`
- **Obtener últimos registros** (máximo 20 por defecto):
  ```bash
  curl "http://localhost:8888/.netlify/functions/posts"
  ```
- **Obtener un registro por id**:
  ```bash
  curl "http://localhost:8888/.netlify/functions/posts?id=123"
  ```
- **Cambiar el límite de resultados** (tope 100):
  ```bash
  curl "http://localhost:8888/.netlify/functions/posts?limit=50"
  ```

La función usa la consulta sugerida por Netlify DB (`@netlify/neon`) y responde en JSON con el siguiente formato:

```json
// GET /.netlify/functions/posts
{"count": 20, "data": [{"id":1,"title":"..."}]}

// GET /.netlify/functions/posts?id=1
{"id":1,"title":"..."}
```

## Uso desde el front-end
Puedes consumir la función desde el navegador usando `fetch`:
```js
const response = await fetch('/.netlify/functions/posts');
const { data } = await response.json();
```
Con una `id` específica:
```js
const response = await fetch('/.netlify/functions/posts?id=5');
const post = await response.json();
```

Al desplegar en Netlify, la variable `NETLIFY_DATABASE_URL` se inyecta automáticamente por la integración de Neon; no necesitas exponer credenciales en el cliente.

## Guardar aplicaciones de los formularios
La landing ahora envía todos los formularios (Impulsora e Incubadora) al endpoint serverless `/.netlify/functions/applications`, que inserta la solicitud en la tabla `applications` de tu base de datos Neon.

- La función crea la tabla si no existe con un esquema seguro para ambos programas (campos específicos + JSON de respaldo en `raw`).
- Valida que se envíen los campos obligatorios y el programa elegido.
- Devuelve un folio (`id`) y marca de tiempo cuando el registro se guarda.

### Probar el endpoint manualmente
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "programa_seleccionado": "impulsora",
    "nombre": "Ada",
    "email": "ada@example.com",
    "ciudad": "CDMX",
    "profesion": "Ingeniera",
    "interes": "Quiero prototipar rápido",
    "motivacion": "Resolver un problema de movilidad",
    "experiencia": "Hackatones y laboratorios",
    "preferencia": "Trabajo en equipo",
    "razon": "Tengo hipótesis claras",
    "compromiso": true
  }' \
  http://localhost:8888/.netlify/functions/applications
```

La respuesta esperada:

```json
{
  "message": "Aplicación guardada con éxito.",
  "id": 1,
  "created_at": "2024-01-01T00:00:00.000Z",
  "program": "impulsora"
}
```

En producción, el formulario de la página ya hace esta petición y mostrará el folio cuando el envío sea exitoso.
