# Implementación de Detección de Fallos en Pilonas

## Resumen del cambio

Se ha implementado un sistema para detectar cuando una pilona está en estado de fallo. El fallo se detecta cuando:
- Q3 (sensor de posición) indica que la pilona está ARRIBA (valor 1)
- Q1 (electroválvula) está INACTIVA (valor 0)

Esta combinación indica que la pilona está arriba pero sin el control de la electroválvula, lo cual es un estado de error.

## Cambios realizados

### 1. Backend - modbus-controllers.js

#### Función leerEstado()
Se modificó para leer tanto Q3 (estado) como Q1 (electroválvula):

```javascript
// Ahora lee ambos coils
const estado_subida_bajada = resultEstado.data[0]; // Q3
const electrovalvula = resultElectrovalvula.data[0]; // Q1

// Detecta el fallo
const estado = {
  estado_subida_bajada,
  electrovalvula,
  fallo_arriba: estado_subida_bajada === true && electrovalvula === false
};
```

#### Función determinarEstadoTextual()
Se agregó la verificación del nuevo estado de fallo:

```javascript
// Verificar si hay fallo (Q3 arriba pero sin Q1)
if (estado.fallo_arriba) {
  return 'fallo_arriba';
}
```

### 2. Frontend - main.js

Se agregaron las definiciones para el nuevo estado:

```javascript
const estadoColores = {
  // ... otros estados ...
  'fallo_arriba': '#FFA500'  // Naranja para fallo
};

const estadoTexto = {
  // ... otros estados ...
  'fallo_arriba': 'Fallo - Arriba sin electroválvula'
};

const estadoClases = {
  // ... otros estados ...
  'fallo_arriba': 'badge-fallo-intermitente'
};
```

### 3. CSS - estados-fallo.css

Se creó un nuevo archivo CSS con animaciones intermitentes:

```css
/* Animación intermitente ámbar-rojo */
@keyframes intermitente-amber-red {
  0%, 100% {
    background-color: #FFA500; /* Ámbar */
    color: white;
  }
  50% {
    background-color: #ff4444; /* Rojo */
    color: white;
  }
}

.badge-fallo-intermitente {
  animation: intermitente-amber-red 1s ease-in-out infinite;
}
```

### 4. HTML - index.html

Se incluyó el nuevo archivo CSS:

```html
<!-- Estilos para estados de fallo -->
<link rel="stylesheet" href="css/estados-fallo.css">
```

## Comportamiento visual

Cuando se detecta un fallo (Q3=1 y Q1=0):
- El badge del estado mostrará "Fallo - Arriba sin electroválvula"
- El color alternará entre ámbar (#FFA500) y rojo (#ff4444) cada segundo
- El marcador en el mapa también mostrará esta animación intermitente
- En las tablas, la fila completa tendrá el efecto intermitente

## Estados posibles

1. **Normal arriba**: Q3=1, Q1=1 → Color rojo fijo
2. **Normal abajo**: Q3=0, Q1=0 → Color verde fijo
3. **Fallo arriba**: Q3=1, Q1=0 → Intermitente ámbar/rojo
4. **Bloqueada arriba**: Con forzado activo → Color rojo oscuro
5. **Bloqueada abajo**: Con forzado activo → Color verde oscuro
6. **Sin comunicación**: Error de lectura → Color morado
7. **Error/Desconocido**: Estado indefinido → Color gris

## Notas importantes

- La lectura de Q1 (electroválvula) se mapea al campo `coilForzadaArriba` en la configuración actual
- Si no se puede leer Q1, se asume que no hay fallo y se muestra el estado normal
- La animación CSS es suave y no consume muchos recursos
- El sistema es retrocompatible: si Q1 no está configurado, funciona como antes

## Próximos pasos recomendados

1. Verificar que el mapeo de Q1 a `coilForzadaArriba` es correcto para su instalación
2. Ajustar los tiempos de animación si es necesario (actualmente 1 segundo)
3. Considerar agregar alertas sonoras o notificaciones para fallos críticos
4. Implementar un log de fallos en la base de datos para histórico
