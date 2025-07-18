# Sistema Modbus Optimizado - Documentación de Implementación

## Fecha: 17 de Enero de 2025

## Resumen de la Implementación

Se ha implementado un sistema optimizado de comunicación Modbus que:

1. **Lee por rangos** en lugar de coils individuales
2. **Reduce conexiones TCP** en un 83%
3. **Maneja errores inteligentemente**
4. **Soporta múltiples tipos de pilonas**

## Problemas Resueltos

### 1. Error al bajar pilona (500)
- **Causa**: El coil de bajada puntual no estaba configurado
- **Solución**: Sistema de fallback que usa COIL_BAJAR si no hay COIL_BAJADA_PUNTUAL
- **Detección automática**: Si no hay coil puntual, cambia directamente el estado

### 2. Arranque lento
- **Causa**: Múltiples lecturas individuales al inicio
- **Solución**: Primera lectura inmediata con procesamiento paralelo (grupos de 5)
- **Logs claros**: Muestra progreso del ciclo de lectura

### 3. Conexiones excesivas
- **Antes**: 4 conexiones por pilona cada 2 segundos
- **Ahora**: 1 conexión por pilona cada 3 segundos
- **Optimización**: Lectura de rango que obtiene todos los coils de una vez

## Arquitectura del Sistema

### Clases Principales

#### OptimizedPilonaManager
- Gestiona una pilona individual
- Calcula rangos óptimos de lectura
- Maneja conexiones y errores
- Mapea coils según configuración

#### OptimizedContinuousMonitor
- Monitorea todas las pilonas
- Procesamiento paralelo controlado
- Detección de cambios de estado
- Sistema de pausado/reanudado

#### PilonaController
- API principal del sistema
- Gestiona acciones de control
- Protocolo de bajada puntual
- Compatible con sistema anterior

## Configuración de Coils

### Mapeo Estándar
```javascript
{
  estado_subida_bajada: COIL_ESTADO,      // Solo lectura
  bajada_puntual: COIL_BAJADA_PUNTUAL,    // Solo escritura
  forzada_abajo: COIL_FORZADA_ABAJO,      // Lectura/Escritura
  forzada_arriba: COIL_FORZADA_ARRIBA     // Lectura/Escritura
}
```

### Fallback para Bajada Puntual
Si no existe COIL_BAJADA_PUNTUAL, el sistema usa:
1. COIL_PUNTUAL
2. COIL_BAJAR
3. Cambio directo de estado (sin protocolo puntual)

## Protocolo de Bajada Puntual

### Condiciones
- Solo se ejecuta si existe coil de bajada puntual configurado
- Para usuarios tipo "cliente" siempre usa este protocolo
- Para otros usuarios, detecta automáticamente

### Pasos del Protocolo
1. **Escribir 1** en coil bajada puntual
2. **Esperar confirmación** (timeout 10s)
3. **Esperar tiempo configurado** (default 3s)
4. **Escribir 0** en coil bajada puntual
5. **Verificar procesamiento**

## Optimización de Lectura

### Cálculo de Rangos
```javascript
// Ejemplo: Coils en direcciones 1001, 1003, 1005
minAddr = 1001
maxAddr = 1005
cantidad = 5 // Lee desde 1001 hasta 1005

// Una sola lectura obtiene todos los valores
readCoils(1001, 5) // Returns: [true, false, true, false, true]
```

### Casos Especiales
- **Direcciones muy separadas** (>50): Lee individualmente
- **Solo una dirección**: Lectura directa
- **Sin coils configurados**: Salta la pilona

## Gestión de Errores

### Detección de Pilonas Offline
- Error de conexión marca timestamp
- Considera offline si error < 10 segundos
- Salta pilonas offline en ciclos siguientes

### Reintentos
- **Escritura**: 3 reintentos con delay 500ms
- **Conexión**: Reintento cada 5 segundos
- **Lectura**: Sin reintentos (espera siguiente ciclo)

## Logs del Sistema

### Logs Informativos
```
=== Iniciando monitoreo continuo optimizado ===
Creados 6 gestores de pilonas
--- Iniciando ciclo de lectura ---
[14] Leyendo rango: 8193 (3 coils)
[14] Cambio detectado: {estado_subida_bajada: true, forzada_abajo: false, forzada_arriba: false}
--- Ciclo completado en 245ms ---
```

### Logs de Error
```
[14] Error: ECONNREFUSED
[14] Error escribiendo bajada_puntual (intento 1/3): timeout
[14] El coil de bajada puntual no está configurado correctamente
```

## Configuración Global

```javascript
const CONFIG = {
  CONNECTION_TIMEOUT: 5000,     // Timeout de conexión
  OPERATION_TIMEOUT: 2000,      // Timeout de operaciones
  READ_INTERVAL: 3000,          // Intervalo entre lecturas
  WRITE_RETRIES: 3,            // Reintentos de escritura
  CONNECTION_RETRY_DELAY: 5000  // Delay entre reconexiones
};
```

## Compatibilidad

El sistema mantiene 100% compatibilidad con:
- Frontend existente
- Base de datos
- API de rutas
- Sistema de permisos

## Próximos Pasos

1. **Monitorear rendimiento** en producción
2. **Ajustar timeouts** según la red
3. **Implementar métricas** de conexiones/errores
4. **Optimizar rangos** según distribución real de coils
