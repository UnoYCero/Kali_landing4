-- ==========================================================================
-- KALEIDOSCOPIO - SECURE PASSWORD MANAGER SCHEMA
-- Ejecuta este script en el SQL Editor de tu proyecto de Supabase
-- ==========================================================================

-- 1. Tabla de usuarios independiente
CREATE TABLE IF NOT EXISTS usuarios_contraseñas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    usuario TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estado TEXT NOT NULL DEFAULT 'activo',
    primer_acceso_completado BOOLEAN NOT NULL DEFAULT FALSE,
    ultimo_acceso TIMESTAMP WITH TIME ZONE
);

-- 2. Tabla para sesiones activas
CREATE TABLE IF NOT EXISTS sesiones_contraseñas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios_contraseñas(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expira_en TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 3. Tabla de proyectos
CREATE TABLE IF NOT EXISTS proyectos_contraseñas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    color TEXT,
    icono TEXT,
    creado_por UUID REFERENCES usuarios_contraseñas(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de servicios
CREATE TABLE IF NOT EXISTS servicios_contraseñas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES proyectos_contraseñas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    creado_por UUID REFERENCES usuarios_contraseñas(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de credenciales
CREATE TABLE IF NOT EXISTS credenciales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    servicio_id UUID NOT NULL REFERENCES servicios_contraseñas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL,
    usuario TEXT,
    password_text TEXT NOT NULL, -- Contraseña guardada
    url TEXT NOT NULL,
    notes TEXT, -- Nota: renombrado internamente para evitar conflicto, pero mantendremos notas
    notas TEXT,
    visibilidad TEXT NOT NULL DEFAULT 'privado' CHECK (visibilidad IN ('privado', 'compartido')),
    creado_por UUID REFERENCES usuarios_contraseñas(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE usuarios_contraseñas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_contraseñas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos_contraseñas ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_contraseñas ENABLE ROW LEVEL SECURITY;
ALTER TABLE credenciales ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores si las hay
DROP POLICY IF EXISTS "Permitir consulta de usuarios para login" ON usuarios_contraseñas;
DROP POLICY IF EXISTS "Permitir actualización de perfil propio" ON usuarios_contraseñas;
DROP POLICY IF EXISTS "Permitir todo en sesiones" ON sesiones_contraseñas;
DROP POLICY IF EXISTS "Ver proyectos si está autenticado" ON proyectos_contraseñas;
DROP POLICY IF EXISTS "Gestionar proyectos si está autenticado" ON proyectos_contraseñas;
DROP POLICY IF EXISTS "Ver servicios si está autenticado" ON servicios_contraseñas;
DROP POLICY IF EXISTS "Gestionar servicios si está autenticado" ON servicios_contraseñas;
DROP POLICY IF EXISTS "Ver credenciales autorizadas" ON credenciales;
DROP POLICY IF EXISTS "Gestionar credenciales propias" ON credenciales;

-- Políticas de Seguridad basadas en x-custom-session-token

-- Usuarios: lectura libre de usuario y hash para el proceso de Login
CREATE POLICY "Permitir consulta de usuarios para login" ON usuarios_contraseñas 
    FOR SELECT USING (true);

-- Usuarios: permitir actualización únicamente de su propio registro (ej. cambio de contraseña inicial)
CREATE POLICY "Permitir actualización de perfil propio" ON usuarios_contraseñas 
    FOR UPDATE USING (
        id = (SELECT usuario_id FROM sesiones_contraseñas WHERE token = (current_setting('request.headers', true)::json->>'x-custom-session-token') AND expira_en > NOW())
    );

-- Sesiones: permitir todo (inserción al hacer login y limpieza al expirar/desconectarse)
CREATE POLICY "Permitir todo en sesiones" ON sesiones_contraseñas 
    FOR ALL USING (true) WITH CHECK (true);

-- Proyectos: permitir consulta si hay sesión activa
CREATE POLICY "Ver proyectos si está autenticado" ON proyectos_contraseñas 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM sesiones_contraseñas WHERE token = (current_setting('request.headers', true)::json->>'x-custom-session-token') AND expira_en > NOW())
    );

-- Proyectos: permitir insertar, actualizar y borrar si hay sesión activa
CREATE POLICY "Gestionar proyectos si está autenticado" ON proyectos_contraseñas 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM sesiones_contraseñas WHERE token = (current_setting('request.headers', true)::json->>'x-custom-session-token') AND expira_en > NOW())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM sesiones_contraseñas WHERE token = (current_setting('request.headers', true)::json->>'x-custom-session-token') AND expira_en > NOW())
    );

-- Servicios: permitir consulta si hay sesión activa
CREATE POLICY "Ver servicios si está autenticado" ON servicios_contraseñas 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM sesiones_contraseñas WHERE token = (current_setting('request.headers', true)::json->>'x-custom-session-token') AND expira_en > NOW())
    );

-- Servicios: permitir gestionar si hay sesión activa
CREATE POLICY "Gestionar servicios si está autenticado" ON servicios_contraseñas 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM sesiones_contraseñas WHERE token = (current_setting('request.headers', true)::json->>'x-custom-session-token') AND expira_en > NOW())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM sesiones_contraseñas WHERE token = (current_setting('request.headers', true)::json->>'x-custom-session-token') AND expira_en > NOW())
    );

-- Credenciales: consultar si es compartida O si el creador es el usuario actual de la sesión
CREATE POLICY "Ver credenciales autorizadas" ON credenciales 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sesiones_contraseñas 
            WHERE token = (current_setting('request.headers', true)::json->>'x-custom-session-token') 
              AND expira_en > NOW()
              AND (
                credenciales.visibilidad = 'compartido' 
                OR credenciales.creado_por = sesiones_contraseñas.usuario_id
              )
        )
    );

-- Credenciales: gestionar (crear, editar, eliminar) solo si el usuario es el creador
CREATE POLICY "Gestionar credenciales propias" ON credenciales 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sesiones_contraseñas 
            WHERE token = (current_setting('request.headers', true)::json->>'x-custom-session-token') 
              AND expira_en > NOW()
              AND credenciales.creado_por = sesiones_contraseñas.usuario_id
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM sesiones_contraseñas 
            WHERE token = (current_setting('request.headers', true)::json->>'x-custom-session-token') 
              AND expira_en > NOW()
              AND creado_por = sesiones_contraseñas.usuario_id
        )
    );

-- 6. Insertar usuarios iniciales con contraseña por defecto: 'cambiame123'
-- Hash SHA-256 de 'cambiame123': 3518b9cb40225e3e8ea97cec84acdda8d1d013295cd0b3675f7bd23995ff414c
INSERT INTO usuarios_contraseñas (nombre, usuario, password_hash)
VALUES 
('Alan Soubran', 'alan.soubran', '3518b9cb40225e3e8ea97cec84acdda8d1d013295cd0b3675f7bd23995ff414c'),
('Bruno Chavarin', 'bruno.chavarin', '3518b9cb40225e3e8ea97cec84acdda8d1d013295cd0b3675f7bd23995ff414c')
ON CONFLICT (usuario) DO NOTHING;
