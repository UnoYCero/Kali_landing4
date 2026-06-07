-- ==========================================
-- KALEIDOSCOPIO - SUPABASE DATABASE SCHEMA
-- Ejecuta este script en el SQL Editor de tu proyecto de Supabase
-- ==========================================

-- 1. Tabla de configuraciones del administrador
CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar contraseña por defecto (hasheada con SHA-256)
INSERT INTO admin_settings (key, value)
VALUES ('admin_password_hash', 'fc722e9e65cf6b0537fbaca32c8c0a9463a745b4eb3024a15be9d11c26762462')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- 2. Tabla para estados dinámicos del CRM
CREATE TABLE IF NOT EXISTS statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL, -- Código de color en formato hex, por ejemplo: #00ffa3
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar estados iniciales recomendados con la paleta de colores neón de Kaleidoscopio
INSERT INTO statuses (name, color) VALUES
('contactado', '#3ed1ff'),         -- Azul neón
('cotización enviada', '#f3ff3e'),   -- Amarillo neón
('en revisión', '#ffb347'),         -- Naranja neón
('cerrado', '#00ffa3'),             -- Verde neón
('perdido', '#ff3e7f')              -- Rojo/Rosa neón
ON CONFLICT (name) DO NOTHING;


-- 3. Tabla para la gestión de prospectos (CRM)
CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    organization TEXT,
    description TEXT,
    status_id UUID REFERENCES statuses(id) ON DELETE SET NULL,
    tool TEXT NOT NULL, -- general, pedidos, web, ia
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_prospects_tool ON prospects(tool);
CREATE INDEX IF NOT EXISTS idx_prospects_status_id ON prospects(status_id);

-- 5. Configurar políticas de Row Level Security (RLS)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para lectura y escritura desde la app (usando anon key)
-- Eliminamos primero si existen para evitar errores al re-ejecutar el script
DROP POLICY IF EXISTS "Permitir todo a anon en admin_settings" ON admin_settings;
DROP POLICY IF EXISTS "Permitir todo a anon en statuses" ON statuses;
DROP POLICY IF EXISTS "Permitir todo a anon en prospects" ON prospects;

CREATE POLICY "Permitir todo a anon en admin_settings" ON admin_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon en statuses" ON statuses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon en prospects" ON prospects FOR ALL USING (true) WITH CHECK (true);
