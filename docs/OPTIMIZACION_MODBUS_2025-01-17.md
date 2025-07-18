# Rediseño Optimizado de Lectura y Escritura Modbus - Sistema de Pilonas

## Fecha: 17 de Enero de 2025

## Resumen Ejecutivo

Se ha rediseñado completamente el sistema de comunicación Modbus para optimizar la lectura de coils, reducir la carga de conexiones TCP y mejorar el rendimiento general del sistema de control de pilonas.

## Cambios Principales Implementados

### 1. **Lectura Optimizada por Rangos**

#### Antes:
- Se realizaban múltiples lecturas individuales por cada coil
- Cada lectura abría y cerraba una conexión TCP
- Para 4 coils = 4 conexiones TCP cada 2 segundos

#### Ahora:
- Se calcula automáticamente el rango mínimo y máximo de coils configurados
- Una única lectura obtiene todos los coils del rango
- Los valores se extraen bit a bit según el protocolo Modbus
- Para 4 coils = 1 conexión TCP cada 3 segundos

### 2. **Gestión Mejorada de Conexiones**

- **Conexiones temporales**: Cada operación abre, ejecuta y cierra la conexión
- **Timeout configurables**: 5 segundos para conexión, 2 segundos para operaciones
- **Registro de errores**: Se mantiene un registro de pilonas sin comunicación
- **Reintentos inteligentes**: 3 reintentos para escritura con delays progresivos

### 3. **Procesamiento Paralelo Controlado**

- Las pilonas se procesan en grupos de 5 para evitar sobrecarga
- Detección automática de pilonas offline para evitar intentos innecesarios
- Sistema de pausado temporal durante operaciones críticas

### 4. **Protocolo de Bajada Puntual Mejorado**

El protocolo mantiene los 5 pasos pero con mejor gestión de errores:
1. Escribir 1 en coil de bajada puntual
2. Esperar confirmación (lectura de 1) con timeout de 10 segundos
3. Esperar tiempo configurado
4. Escribir 0 en coil
5. Verificar procesamiento

### 5. **Interpretación de Tramas Modbus**

#### Ejemplo de Lectura de Rango:
```
Petición: 00 01 00 00 00 06 FF 01 03 E9 00 14
         [TxID][PrtID][Len][UID][FC][Addr][Count]
         
- Función 01: Read Coils
- Dirección inicial: 0x03E9 (1001)
- Cantidad: 0x0014 (20 coils)

Respuesta: 00 01 00 00 00 06 FF 01 03 E9 03 00
          [TxID][PrtID][Len][UID][FC][ByteCount][Data]
          
- ByteCount: 3 bytes (para 20 coils)
- Data: E9 03 00 = 11101001 00000011 00000000
- Interpretación LSB first: [1,0,0,1,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0]
```

## Beneficios del Rediseño

### 1. **Reducción de Conexiones TCP**
- **Antes**: 4 conexiones × 30 pilonas × 30 lecturas/minuto = 3,600 conexiones/minuto
- **Ahora**: 1 conexión × 30 pilonas × 20 lecturas/minuto = 600 conexiones/minuto
- **Reducción**: 83% menos conexiones TCP

### 2. **Mayor Eficiencia**
- Menos overhead de establecimiento/cierre de conexiones
- Menor latencia en la obtención de estados
- Reducción del tráfico de red

### 3. **Mejor Gestión de Errores**
- Detección automática de pilonas sin comunicación
- Reintentos inteligentes solo cuando es necesario
- Registro de errores para diagnóstico

### 4. **Escalabilidad**
- Sistema preparado para manejar más pilonas
- Procesamiento paralelo controlado
- Configuración flexible de intervalos

## Configuración

Los parámetros principales se pueden ajustar en el objeto CONFIG:

```javascript
const CONFIG = {
  CONNECTION_TIMEOUT: 5000,     // Timeout de conexión (ms)
  OPERATION_TIMEOUT: 2000,      // Timeout de operaciones (ms)
  READ_INTERVAL: 3000,          // Intervalo entre lecturas (ms)
  WRITE_RETRIES: 3,            // Reintentos de escritura
  CONNECTION_RETRY_DELAY: 5000  // Delay entre reintentos de conexión (ms)
};
```

## Compatibilidad

El sistema mantiene total compatibilidad con la API existente:
- Mismas funciones exportadas
- Mismos parámetros
- Mismo comportamiento desde la perspectiva del frontend

## Monitoreo y Diagnóstico

El sistema ahora proporciona mejor información para diagnóstico:
- Estado de conexión por pilona
- Registro de errores con timestamps
- Detección automática de pilonas offline

## Próximos Pasos Recomendados

1. **Testing exhaustivo** con pilonas reales
2. **Ajuste fino** de timeouts según la red
3. **Implementación de métricas** para monitorear rendimiento
4. **Considerar cache** de estados para reducir aún más las lecturas

## Notas Técnicas

- El sistema detecta automáticamente el rango óptimo de coils a leer
- Si el rango supera 100 coils, se limita para evitar problemas
- Las pilonas sin coils configurados se saltan automáticamente
- El procesamiento paralelo está limitado a 5 pilonas simultáneas

## Archivos Modificados

- `modbus-controllers.js`: Reemplazado con versión optimizada
- `modbus-controllers-backup-2025-01-17.js`: Backup del código anterior
