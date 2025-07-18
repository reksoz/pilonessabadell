-- Script de migración para actualizar la estructura de coils en la tabla PILONAS
-- Fecha: 2025-01-16
-- Descripción: Refactoriza la estructura de coils para usar solo 4 parámetros principales

-- 1. Añadir las nuevas columnas
ALTER TABLE PILONAS ADD COLUMN COIL_ESTADO_SUBIDA_BAJADA INTEGER;
ALTER TABLE PILONAS ADD COLUMN COIL_BAJADA_PUNTUAL INTEGER;
ALTER TABLE PILONAS ADD COLUMN COIL_FORZADA_ARRIBA INTEGER;
ALTER TABLE PILONAS ADD COLUMN COIL_FORZADA_ABAJO INTEGER;

-- 2. Añadir columnas para tipos de registro
ALTER TABLE PILONAS ADD COLUMN TIPO_COIL_ESTADO_SUBIDA_BAJADA TEXT DEFAULT 'COIL';
ALTER TABLE PILONAS ADD COLUMN TIPO_COIL_BAJADA_PUNTUAL TEXT DEFAULT 'COIL';
ALTER TABLE PILONAS ADD COLUMN TIPO_COIL_FORZADA_ARRIBA TEXT DEFAULT 'COIL';
ALTER TABLE PILONAS ADD COLUMN TIPO_COIL_FORZADA_ABAJO TEXT DEFAULT 'COIL';

-- 3. Añadir columnas para tiempo puntual
ALTER TABLE PILONAS ADD COLUMN TIEMPO_PUNTUAL INTEGER DEFAULT 3000;

-- 4. Migrar datos existentes a la nueva estructura
UPDATE PILONAS 
SET 
  COIL_ESTADO_SUBIDA_BAJADA = COIL_ESTADO,
  COIL_BAJADA_PUNTUAL = COIL_PUNTUAL,
  COIL_FORZADA_ARRIBA = COIL_BLOQUEO,
  COIL_FORZADA_ABAJO = COIL_BAJAR
WHERE COIL_ESTADO_SUBIDA_BAJADA IS NULL;

-- 5. Actualizar valores por defecto para pilonas sin configuración
UPDATE PILONAS 
SET 
  COIL_ESTADO_SUBIDA_BAJADA = 0
WHERE COIL_ESTADO_SUBIDA_BAJADA IS NULL;

UPDATE PILONAS 
SET 
  COIL_BAJADA_PUNTUAL = 1
WHERE COIL_BAJADA_PUNTUAL IS NULL;

UPDATE PILONAS 
SET 
  COIL_FORZADA_ABAJO = 2
WHERE COIL_FORZADA_ABAJO IS NULL;

UPDATE PILONAS 
SET 
  COIL_FORZADA_ARRIBA = 3
WHERE COIL_FORZADA_ARRIBA IS NULL;

-- 6. Las columnas antiguas se mantienen por compatibilidad temporal
-- No las eliminamos para evitar pérdida de datos accidental
-- Se pueden eliminar en una migración futura cuando se confirme que todo funciona correctamente

-- 7. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pilona_coils_new ON PILONAS (
  COIL_ESTADO_SUBIDA_BAJADA,
  COIL_BAJADA_PUNTUAL,
  COIL_FORZADA_ABAJO,
  COIL_FORZADA_ARRIBA
);

-- 8. Actualizar la vista de auditoría si existe
-- (Esto depende de tu implementación específica)

-- Fin del script de migración
