-- Migración para agregar tipos de registros Modbus y modos de operación

-- Agregar campos para tipo de registro Modbus y modo de operación para cada coil
ALTER TABLE PILONAS ADD COLUMN TIPO_COIL_SUBIR TEXT DEFAULT 'COIL';
ALTER TABLE PILONAS ADD COLUMN MODO_COIL_SUBIR TEXT DEFAULT 'RW';

ALTER TABLE PILONAS ADD COLUMN TIPO_COIL_BAJAR TEXT DEFAULT 'COIL';
ALTER TABLE PILONAS ADD COLUMN MODO_COIL_BAJAR TEXT DEFAULT 'RW';

ALTER TABLE PILONAS ADD COLUMN TIPO_COIL_ESTADO TEXT DEFAULT 'COIL';
ALTER TABLE PILONAS ADD COLUMN MODO_COIL_ESTADO TEXT DEFAULT 'R';

ALTER TABLE PILONAS ADD COLUMN TIPO_COIL_BLOQUEO TEXT DEFAULT 'COIL';
ALTER TABLE PILONAS ADD COLUMN MODO_COIL_BLOQUEO TEXT DEFAULT 'RW';

ALTER TABLE PILONAS ADD COLUMN TIPO_COIL_PUNTUAL TEXT DEFAULT 'COIL';
ALTER TABLE PILONAS ADD COLUMN MODO_COIL_PUNTUAL TEXT DEFAULT 'W';

-- Comentarios sobre los valores válidos:
-- Tipos de registro:
--   'COIL' - Coil (FC01 lectura, FC05/FC15 escritura)
--   'DISCRETE_INPUT' - Discrete Input (FC02 solo lectura)
--   'INPUT_REGISTER' - Input Register (FC04 solo lectura)
--   'HOLDING_REGISTER' - Holding Register (FC03 lectura, FC06/FC16 escritura)
--
-- Modos de operación:
--   'R' - Solo lectura
--   'W' - Solo escritura
--   'RW' - Lectura y escritura

-- Actualizar registros existentes con valores por defecto lógicos
UPDATE PILONAS SET 
    TIPO_COIL_SUBIR = 'COIL',
    MODO_COIL_SUBIR = 'RW',
    TIPO_COIL_BAJAR = 'COIL',
    MODO_COIL_BAJAR = 'RW',
    TIPO_COIL_ESTADO = 'COIL',
    MODO_COIL_ESTADO = 'R',
    TIPO_COIL_BLOQUEO = 'COIL',
    MODO_COIL_BLOQUEO = 'RW',
    TIPO_COIL_PUNTUAL = 'COIL',
    MODO_COIL_PUNTUAL = 'W'
WHERE TIPO_COIL_SUBIR IS NULL;

-- Para dispositivos LOGO existentes, actualizar el tipo de registro según su configuración
UPDATE PILONAS SET 
    TIPO_COIL_ESTADO = 'DISCRETE_INPUT'
WHERE TIPO_DISPOSITIVO = 'LOGO' 
    AND COIL_ESTADO >= 1 
    AND COIL_ESTADO <= 24;
