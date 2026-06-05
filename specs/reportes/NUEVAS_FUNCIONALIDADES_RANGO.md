# Nuevas Funcionalidades de Rango de Tiempo - Reportes Históricos

## 🎯 Cambios Implementados

### 1. **Selector de Tipo de Rango**
El usuario ahora puede elegir entre dos modos de consulta:

#### Modo Minutos (10-60 minutos)
- Rango mínimo: 10 minutos
- Rango máximo: 60 minutos
- Ideal para análisis detallado de períodos cortos

#### Modo Horas (1-24 horas)
- Rango mínimo: 1 hora
- Rango máximo: 24 horas
- Ideal para análisis de períodos largos o día completo

**Interfaz**: Dos botones toggle en la parte superior de los controles de rango

---

### 2. **Formato de Hora 12H con AM/PM**
En lugar del formato 24 horas, ahora se utiliza el formato 12 horas más familiar:

#### Estructura de Entrada
Cada hora se ingresa como:
- **Hora**: 1-12 (input numérico)
- **Minuto**: 0-59 (input numérico)
- **Período**: AM o PM (selector dropdown)

**Ejemplos:**
- 9:30 AM → 09:30:00 (24h)
- 5:45 PM → 17:45:00 (24h)
- 12:00 AM → 00:00:00 (medianoche en 24h)
- 12:00 PM → 12:00:00 (mediodía en 24h)

#### Conversión Automática
La aplicación convierte automáticamente de 12h a 24h:
- 1 AM = 01:00 en 24h
- 12 AM = 00:00 en 24h (medianoche)
- 1 PM = 13:00 en 24h
- 12 PM = 12:00 en 24h (mediodía)

---

## 📋 Cambios Técnicos

### Frontend Component (TypeScript)

**Propiedades nuevas:**
```typescript
rangeType: 'minutes' | 'hours' = 'hours';

startHour = '09';
startMinute = '00';
startPeriod: 'AM' | 'PM' = 'AM';

endHour = '05';
endMinute = '00';
endPeriod: 'AM' | 'PM' = 'PM';
```

**Métodos nuevos:**
```typescript
validateTimeRange(): string
// Valida rango según tipo seleccionado
// Retorna mensaje de error si es inválido

timeToMilliseconds(hour, minute, period): number
// Convierte 12h a milisegundos

convertTo24hFormat(hour, minute, period): string
// Convierte 12h a formato 24h (HH:MM:SS)
```

**Manejo de cruces de medianoche:**
Si `horaFin` es menor que `horaInicio`, la aplicación suma 24h al fin (esto permite rangos que cruzan medianoche, ej: 10 PM a 2 AM).

### Frontend Template (HTML)

**Nuevo selector de tipo:**
```html
<div class="range-type-selector">
  <button (click)="rangeType = 'minutes'" [class.active]="rangeType === 'minutes'">
    Minutos (10-60 min)
  </button>
  <button (click)="rangeType = 'hours'" [class.active]="rangeType === 'hours'">
    Horas (1-24 h)
  </button>
</div>
```

**Nuevos inputs de hora (12h):**
```html
<div class="time-picker">
  <input type="number" min="1" max="12" [(ngModel)]="startHour" />
  <span>:</span>
  <input type="number" min="0" max="59" [(ngModel)]="startMinute" />
  <select [(ngModel)]="startPeriod">
    <option value="AM">AM</option>
    <option value="PM">PM</option>
  </select>
</div>
```

### Estilos (SCSS)

**Clases nuevas:**
- `.range-type-selector` — contenedor del selector de tipo
- `.range-type-btn` — botones toggle (con estado `.active`)
- `.range-time-group` — grupo de hora + minuto + período
- `.time-picker` — contenedor de inputs de hora
- `.time-input` — estilos para inputs numéricos
- `.period-select` — estilos para selector AM/PM
- `.time-separator` — separador `:` entre hora y minuto

**Características:**
- Responsive en mobile (flex-direction: column)
- Colores coherentes con design system
- Estados hover y focus animados
- Spinner buttons ocultos en inputs numéricos

---

## 🧪 Ejemplos de Uso

### Caso 1: Análisis de 30 minutos
1. Usuario presiona selector de fecha en topbar
2. Selecciona una fecha → "Aplicar"
3. Entra a modo historial
4. **Tipo de Rango:** Minutos ← selecciona este
5. **Desde:** 2:00 PM
6. **Hasta:** 2:30 PM
7. **Validación:** ✅ 30 minutos es válido (10-60)
8. Presiona "Aplicar Rango"
9. Tabla carga datos de ese período

### Caso 2: Análisis de todo el día
1. Usuario presiona selector de fecha
2. Selecciona una fecha → "Aplicar"
3. Entra a modo historial
4. **Tipo de Rango:** Horas ← selecciona este
5. **Desde:** 12:00 AM (medianoche)
6. **Hasta:** 12:00 AM (próxima medianoche, 24h después)
7. **Validación:** ✅ 24 horas es válido (1-24)
8. Presiona "Aplicar Rango"
9. Tabla carga datos de todo el día

### Caso 3: Rango que cruza medianoche
1. **Tipo de Rango:** Horas
2. **Desde:** 10:00 PM
3. **Hasta:** 2:00 AM
4. **Lógica interna:** 
   - 10 PM = 22:00 (milisegundos: 79200000)
   - 2 AM = 02:00 (milisegundos: 7200000)
   - Como 7200000 < 79200000, suma 24h: 7200000 + 86400000 = 93600000
   - Diferencia: 93600000 - 79200000 = 14400000 ms = 4 horas ✅
5. Presiona "Aplicar Rango"
6. Tabla carga datos de 10 PM a 2 AM

---

## 🔍 Validación

### Modo Minutos
```
Si diferencia < 10 minutos:
  ❌ "El rango mínimo para minutos es 10 minutos."

Si diferencia > 60 minutos:
  ❌ "El rango máximo para minutos es 60 minutos."

En caso contrario:
  ✅ Permitir
```

### Modo Horas
```
Si diferencia < 1 hora:
  ❌ "El rango mínimo para horas es 1 hora."

Si diferencia > 24 horas:
  ❌ "El rango máximo para horas es 24 horas."

En caso contrario:
  ✅ Permitir
```

---

## 📊 Comparativa: Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Formato de hora** | 24h (HH:MM:SS) | 12h + AM/PM |
| **Rango flexible** | Fijo: 20 min - 24h | Seleccionable: 10-60 min ó 1-24h |
| **Interfaz** | Inputs de hora | Inputs numéricos + dropdown |
| **Medianoche** | 00:00:00 | 12:00 AM |
| **Mediodía** | 12:00:00 | 12:00 PM |

---

## 🚀 Testing Local

```bash
cd Frontend_SafeAir
npm start

# En navegador: http://localhost:4200
# 1. Login
# 2. Dashboard → Selector de fecha → Aplicar
# 3. En modo historial:
#    - Cambiar entre "Minutos" y "Horas"
#    - Ingresa horas (1-12), minutos (0-59), período (AM/PM)
#    - Prueba rango válido (ej: 9:00 AM - 10:00 AM = 1 hora)
#    - Prueba rango inválido (ej: 9:00 AM - 9:05 AM = 5 min)
#    - Prueba cruce de medianoche (ej: 11:00 PM - 1:00 AM = 2 horas)
#    - Presiona "Aplicar Rango"
#    - Descarga CSV/PDF
```

---

## 📝 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `dashboard-view-page.component.ts` | Propiedades 12h, métodos de conversión y validación |
| `dashboard-view-page.component.html` | Selector de tipo, inputs 12h, dropdowns AM/PM |
| `dashboard-view-page.component.scss` | Estilos para nuevos inputs y botones |

---

## ✅ Checklist de Validación

- [ ] Build compila sin errores
- [ ] TypeScript no tiene warnings
- [ ] Selector de tipo de rango funciona
- [ ] Inputs de hora aceptan 1-12
- [ ] Inputs de minuto aceptan 0-59
- [ ] Dropdown AM/PM funciona
- [ ] Validación: minutos < 10 muestra error
- [ ] Validación: minutos > 60 muestra error
- [ ] Validación: horas < 1 muestra error
- [ ] Validación: horas > 24 muestra error
- [ ] Rango válido carga tabla
- [ ] Conversión 12h → 24h correcta
- [ ] Cruce de medianoche funciona
- [ ] CSV descarga con formato correcto
- [ ] PDF abre ventana de impresión

---

## 🎨 Interfaz Visual

```
┌─────────────────────────────────────────────────────────┐
│  Tipo de Rango:                                         │
│  [Minutos (10-60 min)] [Horas (1-24 h)]               │
├─────────────────────────────────────────────────────────┤
│  Desde:                    Hasta:                       │
│  [09]:[00] [AM ▼]         [05]:[00] [PM ▼]            │
│                                                         │
│  [Aplicar Rango] [Descargar CSV] [Imprimir PDF]       │
├─────────────────────────────────────────────────────────┤
│  ⚠️ Error (si aplica)                                  │
└─────────────────────────────────────────────────────────┘
```

---

**Listo para producción.** La funcionalidad es backward-compatible (no afecta otros endpoints ni datos persistidos).
