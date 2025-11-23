const { neon } = require('@netlify/neon');

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'on', 'yes', 'si', 'sí'].includes(value.toLowerCase());
  }
  return false;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { message: 'Método no permitido. Usa POST.' });
  }

  if (!process.env.NETLIFY_DATABASE_URL) {
    return jsonResponse(500, { message: 'Falta la variable NETLIFY_DATABASE_URL en el entorno.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { message: 'JSON inválido en el cuerpo de la solicitud.' });
  }

  const program = (payload.programa_seleccionado || payload.programa || payload.program || '').toLowerCase();
  if (!['impulsora', 'incubadora'].includes(program)) {
    return jsonResponse(400, { message: 'Debes seleccionar un programa válido (impulsora o incubadora).' });
  }

  const requiredFields = ['nombre', 'email', 'ciudad', 'profesion', 'interes', 'motivacion', 'experiencia', 'preferencia', 'razon'];
  const missing = requiredFields.filter((field) => !payload[field] || String(payload[field]).trim() === '');
  if (missing.length) {
    return jsonResponse(400, { message: `Faltan campos requeridos: ${missing.join(', ')}` });
  }

  const compromiso = parseBoolean(payload.compromiso);
  const edad = parseNumber(payload.edad);
  const socios = parseNumber(payload.socios);

  const sql = neon(process.env.NETLIFY_DATABASE_URL);

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS applications (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        program VARCHAR(50) NOT NULL,
        nombre TEXT,
        edad INT,
        email TEXT,
        ciudad TEXT,
        profesion TEXT,
        interes TEXT,
        motivacion TEXT,
        locura TEXT,
        vision_negocio TEXT,
        experiencia TEXT,
        preferencia TEXT,
        socios INT,
        idea_desc TEXT,
        idea_problema TEXT,
        mvp_desc TEXT,
        metricas TEXT,
        modelo_negocio TEXT,
        razon TEXT,
        compromiso BOOLEAN,
        tipo_inventor TEXT,
        raw JSONB NOT NULL
      );
    `;

    const [record] = await sql`
      INSERT INTO applications (
        program, nombre, edad, email, ciudad, profesion, interes, motivacion, locura, vision_negocio, experiencia, preferencia,
        socios, idea_desc, idea_problema, mvp_desc, metricas, modelo_negocio, razon, compromiso, tipo_inventor, raw
      ) VALUES (
        ${program},
        ${payload.nombre || null},
        ${edad},
        ${payload.email || null},
        ${payload.ciudad || null},
        ${payload.profesion || null},
        ${payload.interes || null},
        ${payload.motivacion || null},
        ${payload.locura || null},
        ${payload.vision_negocio || null},
        ${payload.experiencia || null},
        ${payload.preferencia || null},
        ${socios},
        ${payload.idea_desc || null},
        ${payload.idea_problema || null},
        ${payload.mvp_desc || null},
        ${payload.metricas || null},
        ${payload.modelo_negocio || null},
        ${payload.razon || null},
        ${compromiso},
        ${payload.tipo_inventor || null},
        ${JSON.stringify(payload)}
      )
      RETURNING id, created_at;
    `;

    return jsonResponse(201, {
      message: 'Aplicación guardada con éxito.',
      id: record.id,
      created_at: record.created_at,
      program
    });
  } catch (error) {
    console.error('Error guardando aplicación:', error);
    return jsonResponse(500, { message: 'Error interno guardando la aplicación', detail: error.message });
  }
};
