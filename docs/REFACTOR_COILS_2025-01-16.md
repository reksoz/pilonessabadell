# Refactorización de Estructura de Coils - Sistema de Pilonas

## Fecha: 16 de Enero de 2025

## Resumen de Cambios

Se ha simplificado la estructura de configuración de coils en el sistema de control de pilonas, pasando de tener múltiples campos separados a solo 4 parámetros principales.

## Nueva Estructura de Coils

### 1. **COIL_ESTADO_SUBIDA_BAJADA** (Solo Lectura)
- **Función**: Lectura del estado actual de la pilona
- **Valores**: 
  - 1 = Pilona subida
  - 0 = Pilona bajada
- **Operación**: Lectura mediante FC01 (Read Coils)

### 2. **COIL_BAJADA_PUNTUAL** (Lectura/Escritura)
- **Función**: Acción temporal de bajada para clientes
- **Operación**: 
  - Lectura: FC01
  - Escritura: FC05 con pulso temporal
- **Tiempo de pulso**: Configurable (por defecto 3000ms)

### 3. **COIL_FORZADA_ABAJO** (Lectura/Escritura)
- **Función**: Forzar la pilona en posición bajada (bloqueo)
- **Operación**: 
  - Lectura: FC01
  - Escritura: FC05

### 4. **COIL_FORZADA_ARRIBA** (Lectura/Escritura)
- **Función**: Forzar la pilona en posición subida (bloqueo)
- **Operación**: 
  - Lectura: FC01
  - Escritura: FC05

## Archivos Modificados

### 1. **Frontend (HTML)**
- `public/index.html`: Actualizado el modal de configuración de pilonas con la nueva estructura de 4 coils

### 2. **Frontend (JavaScript)**
- `public/js/modal-pilona-handler.js`: 
  - Actualizada la función de guardado para enviar los nuevos campos
  - Añadido mapeo automático de campos antiguos a nuevos para compatibilidad

### 3. **Backend (Controladores)**
- `modbus-controllers.js`: Ya estaba actualizado con la nueva lógica de control

### 4. **Base de Datos**
- Creado script de migración: `migrations/001_refactor_coils_structure.sql`
- Añade las nuevas columnas manteniendo las antiguas por compatibilidad

## Mapeo de Campos Antiguos a Nuevos

| Campo Antiguo | Campo Nuevo | Función |
|---------------|-------------|---------|
| COIL_ESTADO | COIL_ESTADO_SUBIDA_BAJADA | Estado de la pilona |
| COIL_PUNTUAL | COIL_BAJADA_PUNTUAL | Bajada temporal |
| COIL_BAJAR | COIL_FORZADA_ABAJO | Bloqueo abajo |
| COIL_BLOQUEO | COIL_FORZADA_ARRIBA | Bloqueo arriba |
| COIL_SUBIR | (Eliminado) | Ya no es necesario |

## Mejoras Implementadas

1. **Interfaz más clara**: El modal ahora muestra claramente la función de cada coil
2. **Configuración simplificada**: Solo 4 parámetros principales en lugar de 5-6
3. **Compatibilidad**: El sistema mantiene compatibilidad con pilonas configuradas con el sistema anterior
4. **Flexibilidad**: Cada coil puede configurarse como COIL o INPUT según necesidad

## Próximos Pasos

1. Ejecutar el script de migración en la base de datos
2. Probar la configuración con pilonas reales
3. Actualizar las rutas API si es necesario
4. Considerar eliminar las columnas antiguas después de confirmar que todo funciona

## Notas Importantes

- La configuración de LOGO sigue pendiente de implementación completa
- Se mantienen las columnas antiguas en la BD por seguridad
- El sistema es retrocompatible con configuraciones existentes
