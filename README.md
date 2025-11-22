# Kaleidoscopio Landing

Landing page y API mínima para recibir aplicaciones de los cohort.

## Ejecutar localmente y guardar postulaciones
1. Instala dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor (sirve la landing y expone la API):
   ```bash
   npm start
   ```
   El sitio queda en `http://localhost:3000` y el endpoint de guardado en `POST /api/aplicaciones`.

### Dónde se guardan los datos
- Las postulaciones se almacenan en `data/submissions.json` como una lista con marca de tiempo.
- Para limpiar la base, borra el archivo o elimina elementos del JSON.

### ¿Cómo fluye la información del formulario?
1) La landing (`index.html`) envía el formulario multi-paso a `POST /api/aplicaciones` usando `fetch` (ver `assets/js/main.js`).
2) Express recibe el JSON, valida nombre y email y persiste todo el payload en `data/submissions.json` con un `submittedAt` (ver `server.js`).
3) Puedes consultar todo lo recibido con `GET /api/aplicaciones`, o abrir `data/submissions.json` para ver los registros. Cada elemento es un objeto con los campos del formulario, el programa elegido y la fecha.

### Probar rápido
1. Abre la landing, completa el formulario y envíalo.
2. Verifica que `data/submissions.json` tenga el registro nuevo.
3. También puedes consultar todo con:
   ```bash
   curl http://localhost:3000/api/aplicaciones
   ```

### Producción
- Ajusta la variable de entorno `PORT` si necesitas otro puerto.
- Si quieres mover la base a Postgres/MySQL, reutiliza el endpoint `/api/aplicaciones` en otro servicio manteniendo la misma ruta para no tocar el front.
