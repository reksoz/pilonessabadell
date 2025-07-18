-- Script de migración para agregar el campo de electroválvula a la tabla PILONAS
-- Fecha: 2025-01-18
-- Propósito: Agregar campo para detección de fallos cuando la pilona está arriba pero no hay señal de electroválvula

-- 1. Agregar columna para la dirección del coil de electroválvula
ALTER TABLE PILONAS ADD COLUMN COIL_ELECTROVALVULA INTEGER DEFAULT NULL;

-- 2. Agregar columna para el tipo de registro de la electroválvula
ALTER TABLE PILONAS ADD COLUMN TIPO_COIL_ELECTROVALVULA TEXT DEFAULT 'COIL';

-- 3. Agregar columna para el modo de operación (siempre será R - solo lectura)
ALTER TABLE PILONAS ADD COLUMN MODO_COIL_ELECTROVALVULA TEXT DEFAULT 'R';

-- 4. Agregar columna para puerto específico (opcional)
ALTER TABLE PILONAS ADD COLUMN PUERTO_COIL_ELECTROVALVULA INTEGER DEFAULT NULL;

-- 5. Agregar columna para Unit ID específico (opcional)
ALTER TABLE PILONAS ADD COLUMN UNIT_ID_COIL_ELECTROVALVULA INTEGER DEFAULT NULL;

-- Nota: Por defecto, el campo COIL_ELECTROVALVULA es NULL, lo que significa que la detección
-- de fallos de electroválvula no está habilitada hasta que se configure manualmente.

-- Para aplicar esta migración, ejecutar:
-- sqlite3 pilona.db < migrations/add-electrovalvula-field.sql
