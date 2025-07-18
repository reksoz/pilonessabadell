# Guía de Actualización para pilona-routes.js

## Cambios necesarios en las rutas POST y PUT

### 1. En la ruta POST `/api/pilonas` (crear nueva pilona)

Reemplazar la desestructuración de campos:

```javascript
// ANTES:
const {
  nombre,
  direccionIP,
  puerto,
  unitId,
  coilSubir,
  coilBajar,
  coilEstado,
  coilBloqueo,
  coilPuntual,
  // ...
} = req.body;

// DESPUÉS:
const {
  nombre,
  direccionIP,
  puerto,
  unitId,
  // Nueva estructura de coils
  coilEstadoSubidaBajada,
  coilBajadaPuntual,
  coilForzadaAbajo,
  coilForzadaArriba,
  tiempoPuntual,
  // Tipos de registro (opcional)
  tipoCoilEstadoSubidaBajada,
  tipoCoilBajadaPuntual,
  tipoCoilForzadaAbajo,
  tipoCoilForzadaArriba,
  // ...
} = req.body;
```

### 2. Actualizar la query INSERT:

```javascript
// ANTES:
const query = `
  INSERT INTO PILONAS (
    NOMBRE, DIRECCION_IP, PUERTO, UNIT_ID,
    COIL_SUBIR, COIL_BAJAR, COIL_ESTADO, COIL_BLOQUEO, COIL_PUNTUAL,
    LATITUD, LONGITUD
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

// DESPUÉS:
const query = `
  INSERT INTO PILONAS (
    NOMBRE, DIRECCION_IP, PUERTO, UNIT_ID,
    COIL_ESTADO_SUBIDA_BAJADA, COIL_BAJADA_PUNTUAL, 
    COIL_FORZADA_ABAJO, COIL_FORZADA_ARRIBA,
    TIEMPO_PUNTUAL,
    TIPO_COIL_ESTADO_SUBIDA_BAJADA, TIPO_COIL_BAJADA_PUNTUAL,
    TIPO_COIL_FORZADA_ABAJO, TIPO_COIL_FORZADA_ARRIBA,
    LATITUD, LONGITUD
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const params = [
  nombre,
  direccionIP,
  puerto || 502,
  unitId || 1,
  coilEstadoSubidaBajada,
  coilBajadaPuntual,
  coilForzadaAbajo,
  coilForzadaArriba,
  tiempoPuntual || 3000,
  tipoCoilEstadoSubidaBajada || 'COIL',
  tipoCoilBajadaPuntual || 'COIL',
  tipoCoilForzadaAbajo || 'COIL',
  tipoCoilForzadaArriba || 'COIL',
  latitud,
  longitud
];
```

### 3. En la ruta PUT `/api/pilonas/:id` (actualizar pilona)

Similar a POST pero con UPDATE:

```javascript
const query = `
  UPDATE PILONAS SET
    NOMBRE = ?,
    DIRECCION_IP = ?,
    PUERTO = ?,
    UNIT_ID = ?,
    COIL_ESTADO_SUBIDA_BAJADA = ?,
    COIL_BAJADA_PUNTUAL = ?,
    COIL_FORZADA_ABAJO = ?,
    COIL_FORZADA_ARRIBA = ?,
    TIEMPO_PUNTUAL = ?,
    TIPO_COIL_ESTADO_SUBIDA_BAJADA = ?,
    TIPO_COIL_BAJADA_PUNTUAL = ?,
    TIPO_COIL_FORZADA_ABAJO = ?,
    TIPO_COIL_FORZADA_ARRIBA = ?,
    LATITUD = ?,
    LONGITUD = ?
  WHERE ID = ?
`;
```

### 4. Validación de campos (opcional pero recomendado)

Añadir validación para asegurar que los coils tengan valores válidos:

```javascript
// Validar que los coils principales estén definidos
if (coilEstadoSubidaBajada === undefined || coilEstadoSubidaBajada === null) {
  return res.status(400).json({ 
    error: 'El coil de estado subida/bajada es requerido' 
  });
}

// Validar tipos de registro
const tiposValidos = ['COIL', 'INPUT', 'HOLDING_REGISTER'];
if (tipoCoilEstadoSubidaBajada && !tiposValidos.includes(tipoCoilEstadoSubidaBajada)) {
  return res.status(400).json({ 
    error: 'Tipo de registro inválido' 
  });
}
```

### 5. Compatibilidad con datos antiguos

Para mantener compatibilidad, puedes añadir lógica de mapeo:

```javascript
// Si vienen los campos antiguos, mapearlos a los nuevos
if (!coilEstadoSubidaBajada && coilEstado !== undefined) {
  coilEstadoSubidaBajada = coilEstado;
}
if (!coilBajadaPuntual && coilPuntual !== undefined) {
  coilBajadaPuntual = coilPuntual;
}
if (!coilForzadaAbajo && coilBajar !== undefined) {
  coilForzadaAbajo = coilBajar;
}
if (!coilForzadaArriba && coilBloqueo !== undefined) {
  coilForzadaArriba = coilBloqueo;
}
```

## Ejemplo completo de ruta POST actualizada:

```javascript
router.post('/api/pilonas', verificarAutenticacion, verificarRol(['administrador']), async (req, res) => {
  const {
    nombre,
    direccionIP,
    puerto,
    unitId,
    // Nueva estructura
    coilEstadoSubidaBajada,
    coilBajadaPuntual,
    coilForzadaAbajo,
    coilForzadaArriba,
    tiempoPuntual,
    tipoCoilEstadoSubidaBajada,
    tipoCoilBajadaPuntual,
    tipoCoilForzadaAbajo,
    tipoCoilForzadaArriba,
    latitud,
    longitud,
    // Campos antiguos para compatibilidad
    coilEstado,
    coilPuntual,
    coilBajar,
    coilBloqueo
  } = req.body;

  // Mapeo de compatibilidad
  const estadoFinal = coilEstadoSubidaBajada ?? coilEstado;
  const puntualFinal = coilBajadaPuntual ?? coilPuntual;
  const forzadaAbajoFinal = coilForzadaAbajo ?? coilBajar;
  const forzadaArribaFinal = coilForzadaArriba ?? coilBloqueo;

  try {
    const query = `
      INSERT INTO PILONAS (
        NOMBRE, DIRECCION_IP, PUERTO, UNIT_ID,
        COIL_ESTADO_SUBIDA_BAJADA, COIL_BAJADA_PUNTUAL, 
        COIL_FORZADA_ABAJO, COIL_FORZADA_ARRIBA,
        TIEMPO_PUNTUAL,
        TIPO_COIL_ESTADO_SUBIDA_BAJADA, TIPO_COIL_BAJADA_PUNTUAL,
        TIPO_COIL_FORZADA_ABAJO, TIPO_COIL_FORZADA_ARRIBA,
        LATITUD, LONGITUD, ESTADO
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'error')
    `;

    const result = await db.run(query, [
      nombre,
      direccionIP,
      puerto || 502,
      unitId || 1,
      estadoFinal,
      puntualFinal,
      forzadaAbajoFinal,
      forzadaArribaFinal,
      tiempoPuntual || 3000,
      tipoCoilEstadoSubidaBajada || 'COIL',
      tipoCoilBajadaPuntual || 'COIL',
      tipoCoilForzadaAbajo || 'COIL',
      tipoCoilForzadaArriba || 'COIL',
      latitud,
      longitud
    ]);

    res.json({ 
      id: result.lastID, 
      message: 'Pilona creada correctamente' 
    });
  } catch (error) {
    console.error('Error al crear pilona:', error);
    res.status(500).json({ error: 'Error al crear pilona' });
  }
});
```
