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

-- 6. Tabla para registro independiente de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo TEXT NOT NULL,
    empresa TEXT NOT NULL,
    correo TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    telefono TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activo BOOLEAN DEFAULT TRUE
);

-- 7. Tabla para planes de clientes
CREATE TABLE IF NOT EXISTS cliente_planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    nombre_plan TEXT NOT NULL DEFAULT 'Plan de mantenimiento web',
    horas_mensuales NUMERIC NOT NULL DEFAULT 8.00,
    estado TEXT NOT NULL DEFAULT 'Activo', -- 'Activo', 'Suspendido', 'Pendiente'
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabla para la bolsa de horas actual de cada cliente
CREATE TABLE IF NOT EXISTS cliente_horas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE UNIQUE,
    horas_contratadas NUMERIC NOT NULL DEFAULT 8.00,
    horas_utilizadas NUMERIC NOT NULL DEFAULT 0.00,
    horas_restantes NUMERIC NOT NULL DEFAULT 8.00,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tabla para el historial de control de horas (trabajos realizados)
CREATE TABLE IF NOT EXISTS cliente_horas_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duracion TEXT NOT NULL, -- e.g., '1:45'
    duracion_minutos INTEGER NOT NULL, -- e.g., 105
    responsable TEXT NOT NULL,
    comentarios TEXT NOT NULL
);

-- 10. Tabla para configuración de fecha de corte / reinicio de bolsa de horas
CREATE TABLE IF NOT EXISTS configuracion_cortes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE UNIQUE,
    dia_corte INTEGER NOT NULL DEFAULT 28 CHECK (dia_corte >= 1 AND dia_corte <= 31),
    ultimo_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Habilitar RLS en las nuevas tablas
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_horas_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_cortes ENABLE ROW LEVEL SECURITY;

-- 12. Políticas públicas para permitir todo a anon (desarrollo rápido y coincidencia con esquema existente)
DROP POLICY IF EXISTS "Permitir todo a anon en clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir todo a anon en cliente_planes" ON cliente_planes;
DROP POLICY IF EXISTS "Permitir todo a anon en cliente_horas" ON cliente_horas;
DROP POLICY IF EXISTS "Permitir todo a anon en cliente_horas_historial" ON cliente_horas_historial;
DROP POLICY IF EXISTS "Permitir todo a anon en configuracion_cortes" ON configuracion_cortes;

CREATE POLICY "Permitir todo a anon en clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon en cliente_planes" ON cliente_planes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon en cliente_horas" ON cliente_horas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon en cliente_horas_historial" ON cliente_horas_historial FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon en configuracion_cortes" ON configuracion_cortes FOR ALL USING (true) WITH CHECK (true);

-- 13. Crear índices adicionales
CREATE INDEX IF NOT EXISTS idx_cliente_planes_cliente_id ON cliente_planes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_horas_cliente_id ON cliente_horas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_horas_historial_cliente_id ON cliente_horas_historial(cliente_id);
CREATE INDEX IF NOT EXISTS idx_configuracion_cortes_cliente_id ON configuracion_cortes(cliente_id);

-- ==========================================================================
-- AMPLIACIÓN DE CUENTAS - ACTUALIZACIONES DE ESQUEMA (VERSIÓN 2)
-- ==========================================================================

-- 1. Ampliación de tabla cliente_planes
ALTER TABLE cliente_planes ADD COLUMN IF NOT EXISTS monto_mensual NUMERIC DEFAULT 0.00;
ALTER TABLE cliente_planes ADD COLUMN IF NOT EXISTS url_contrato TEXT;
ALTER TABLE cliente_planes ADD COLUMN IF NOT EXISTS notas_internas TEXT;

-- 2. Ampliación de tabla cliente_horas_historial para bitácora técnica extendida
ALTER TABLE cliente_horas_historial ADD COLUMN IF NOT EXISTS hora_inicio TIMESTAMP WITH TIME ZONE;
ALTER TABLE cliente_horas_historial ADD COLUMN IF NOT EXISTS hora_fin TIMESTAMP WITH TIME ZONE;
ALTER TABLE cliente_horas_historial ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- 3. Nueva tabla para auditoría interna de modificaciones de horas
CREATE TABLE IF NOT EXISTS auditoria_horas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_admin TEXT NOT NULL DEFAULT 'Admin',
    accion TEXT NOT NULL,
    valor_anterior TEXT NOT NULL,
    valor_nuevo TEXT NOT NULL
);

-- 4. Habilitar RLS y Políticas
ALTER TABLE auditoria_horas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a anon en auditoria_horas" ON auditoria_horas;
CREATE POLICY "Permitir todo a anon en auditoria_horas" ON auditoria_horas FOR ALL USING (true) WITH CHECK (true);

-- 5. Crear índice para auditoría
CREATE INDEX IF NOT EXISTS idx_auditoria_horas_cliente_id ON auditoria_horas(cliente_id);


