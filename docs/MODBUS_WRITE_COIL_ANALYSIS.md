# Análisis de Write Single Coil vs Write Multiple Coils

## Problema Detectado

En los logs se observa que se está usando **Write Multiple Coils (FC15)** en lugar de **Write Single Coil (FC05)**.

### Trama Actual (Incorrecta):
```
[TCP]>Tx > 18:33:20:872 - 00 D4 00 00 00 09 FF 0F 1F FF 00 0A 02 E8 03
```

Desglose:
- `00 D4` - Transaction ID
- `00 00` - Protocol ID (Modbus TCP)
- `00 09` - Length (9 bytes)
- `FF` - Unit ID (255)
- `0F` - **Function Code 15 (Write Multiple Coils)**
- `1F FF` - Starting Address (8191 = 0x1FFF)
- `00 0A` - Quantity of Coils (10)
- `02` - Byte Count
- `E8 03` - Coil Values

### Trama Correcta (Write Single Coil):

Para ON:
```
00 D4 00 00 00 06 FF 05 20 00 FF 00
```
- `05` - Function Code 5 (Write Single Coil)
- `20 00` - Coil Address (8192 = 0x2000)
- `FF 00` - Value ON

Para OFF:
```
00 D4 00 00 00 06 FF 05 20 00 00 00
```
- `05` - Function Code 5 (Write Single Coil)
- `20 00` - Coil Address (8192 = 0x2000)
- `00 00` - Value OFF

## Mapeo de Direcciones LOGO

Para LOGO! 8, las direcciones Modbus son:

### Salidas Digitales (Q):
- Q1: 8192 (0x2000)
- Q2: 8193 (0x2001)
- Q3: 8194 (0x2002)
- ...

### Marcas Digitales (M):
- M1: 8256 (0x2040)
- M2: 8257 (0x2041)
- ...

### Entradas Digitales (I):
- I1: 0 (0x0000)
- I2: 1 (0x0001)
- ...

## Posibles Causas del Problema

1. **Error de Offset**: El log muestra dirección 8191 (0x1FFF) en lugar de 8192 (0x2000)
2. **Función Incorrecta**: Se está usando FC15 (Write Multiple) en lugar de FC05 (Write Single)
3. **Configuración del Cliente**: El cliente Modbus puede estar configurado incorrectamente

## Solución Propuesta

### 1. Verificar la configuración del formulario
El usuario debe poder especificar:
- Dirección base para cada tipo de elemento (Q, M, I)
- Si se usa Write Single Coil o Write Multiple Coils

### 2. Logging mejorado
Agregar logs más detallados que muestren:
- La función Modbus exacta que se está usando
- La dirección exacta (decimal y hex)
- El valor exacto que se envía

### 3. Opción de configuración
Permitir al usuario elegir entre:
- Write Single Coil (FC05) - Recomendado
- Write Multiple Coils (FC15) - Para compatibilidad

## Código de Ejemplo

```javascript
// Para Write Single Coil (FC05)
await client.writeCoil(8192, true);  // Q1 ON
await client.writeCoil(8192, false); // Q1 OFF

// Para Write Multiple Coils (FC15)
await client.writeCoils(8192, [true]); // Q1 ON
await client.writeCoils(8192, [false]); // Q1 OFF
```

## Verificación con QModMaster

En QModMaster debes configurar:
1. **Modbus Mode**: TCP
2. **Unit ID**: 255 (o el que uses)
3. **Function Code**: 05 (Write Single Coil)
4. **Start Address**: 8192
5. **Data Format**: Bin (para coils)

Para escribir:
- ON: Valor 1 o FF00
- OFF: Valor 0 o 0000
