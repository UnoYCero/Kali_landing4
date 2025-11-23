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
