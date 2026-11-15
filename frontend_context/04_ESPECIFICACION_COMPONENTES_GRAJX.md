# 🧩 04. Especificación Detallada de Componentes CepheusLive

Este documento desglosa cada componente de la interfaz de usuario, definiendo su propósito, comportamiento accesible, controles e interactividad.

---

## 1. `SkySearchBar`: Barra de Búsqueda y Selector de Presets

### Propósito
Permitir al usuario seleccionar su zona de observación sin necesidad de saber coordenadas astronómicas, ofreciendo al mismo tiempo flexibilidad a los usuarios avanzados.

### Comportamiento y UX
1. **Entrada Universal de Búsqueda:**
   - Acepta nombres populares (ej. *"Estrella de Barnard"*, *"WISE 0855"*).
   - Acepta coordenadas sexagesimales (ej. `08h55m10.831s, -07d14m42.53s` o `17:57:48.5 +04:41:36`).
   - Acepta grados decimales (ej. `133.79513, -7.24515`).
   - Botón visible con icono de lupa 🔍 y tamaño generoso ($48\text{ px}$ de alto).
2. **Las 5 Tarjetas de Acceso Rápido (Los 5 Objetos Benchmark):**
   Debajo de la barra de búsqueda, se presentan 5 botones/tarjetas horizontales con scroll táctil suave:
   - 🌟 **Barnard's Star:** *"La estrella más veloz"* (Movimiento propio extremo).
   - 👯 **Epsilon Indi B:** *"El baile de las enanas marrones"* (Par binario).
   - ❄️ **WISE 0855:** *"El gigante helado invisible"* (Solo brilla en infrarrojo, ~250 K).
   - 💡 **RW Aurigae:** *"El faro que parpadea"* (Variabilidad por polvo estelar).
   - 🫀 **R Draconis:** *"La estrella gigante que late"* (Pulsación periódica gigante).
3. **Selector Intuitivo de Campo de Visión (`FOV`):**
   - Slider continuo con pasos discretos: $2'$, $5'$, $10'$, $20'$, $30'$.
   - **Metáfora visual:** Al lado del valor numérico, mostrar un icono explicativo:
     - $2'$: *"Cerca (Zoom máximo a la estrella)"*.
     - $15'$: *"Medio (Mitad de la Luna llena)"*.
     - $30'$: *"Panorámico (Tamaño de la Luna llena completa en el cielo)"*.

---

## 2. `BlinkPlayer`: Reproductor de Épocas y Animador Temporal

### Propósito
El corazón visual de la plataforma. Permite ver la película del universo alternando las épocas de SPHEREx (cada 6 meses) para descubrir movimiento o cambio de luz.

### Elementos y Controles
```
┌────────────────────────────────────────────────────────┐
│ [Modo: 🔄 Parpadeo | ➕ Suma de Luz | ➖ Resta de Cambios]│
│                                                        │
│                    [CANVAS DE PÍXELES]                 │
│                                                        │
│ [⏮️ Paso Atrás] [ ▶️ Reproducir / Pausa ] [⏭️ Paso Adelante]│
│ ────────────────────────●───────────────────────────── │
│ Época 1 (Jun 2025)                Época 2 (Dic 2025)   │
│ Velocidad: 🐢 ────────●───────── 🐇 (2 fotos / seg)    │
│ Detectores: [Todos] [D1] [D2] [D3] [D4] [D5] [D6] [RGB]│
└────────────────────────────────────────────────────────┘
```

### Modos de Visualización:
1. **Modo Parpadeo (*Blink*):** Alterna rítmicamente entre las épocas disponibles. El cerebro humano detecta instantáneamente cualquier píxel que salte de posición o cambie de intensidad.
2. **Modo Suma de Luz (*Deep Stack*):** Muestra el promedio/mediana de todas las fotos. Revela nebulosas y estrellas frías ultra tenues invisibles en un solo cuadro.
3. **Modo Resta de Cambios (*Temporal Difference*):** Resta una época contra la imagen mediana ($I_t - I_{\text{mediana}}$):
   - **Fondo gris neutro:** Lo que permaneció inmóvil desaparece por completo.
   - **Dipolo Azul / Rojo:** El objeto desplazado deja una huella azul en su nueva posición y una huella roja donde estaba antes.
4. **Modo Cortina Accesible (*Split Slider*):** Permite arrastrar una barra divisoria vertical con el ratón o el dedo para comparar antes y después sin ningún destello fotosensible.

---

## 3. `DetectorSelector`: Selector de los 6 Ojos Infrarrojos (D1 a D6)

### Propósito
Aprovechar creativamente las 102 bandas de SPHEREx agrupadas en sus 6 conjuntos de detectores de filtros variables lineales (LVF):

- **`D1`** ($0.75\text{–}1.1\,\mu\text{m}$): Luz visible cercana / estrellas ordinarias.
- **`D2`** ($1.1\text{–}1.6\,\mu\text{m}$): Traspasa el polvo interestelar tenue.
- **`D3`** ($1.6\text{–}2.4\,\mu\text{m}$): Muy sensible a estrellas gigantes rojas frías.
- **`D4`** ($2.4\text{–}3.8\,\mu\text{m}$): **Detección de firmas de Hielo de Agua ($\text{H}_2\text{O}$)** y monóxido de carbono ($\text{CO}$).
- **`D5`** ($3.8\text{–}4.4\,\mu\text{m}$): Sensible a dióxido de carbono ($\text{CO}_2$) y enanas marrones frías.
- **`D6`** ($4.4\text{–}5.0\,\mu\text{m}$): Infrarrojo térmico lejano; detecta objetos casi helados como WISE 0855.
- **`Falso Color RGB` (Coadición Creativa):**
  - **Canal Rojo:** Detector D5/D6 (los objetos más fríos se ven rojos brillantes).
  - **Canal Verde:** Detector D3/D4.
  - **Canal Azul:** Detector D1/D2 (las estrellas calientes se ven azules).

---

## 4. `SpectrumChart`: Visor de Huella Espectral al Vuelo

### Propósito
Al hacer clic o tocar cualquier punto del visor de imágenes, este gráfico dibuja inmediatamente la distribución espectral de energía ($0.75\text{ a }5.0\,\mu\text{m}$) captada por los detectores LVF.

### Experiencia Educativa para el Usuario No Experto:
- **Eje X:** Longitud de onda en micrómetros ($\mu\text{m}$), con un degradado de color que va desde el rojo tenue ($0.75\,\mu\text{m}$) hasta el violeta infrarrojo térmico ($5.0\,\mu\text{m}$).
- **Eje Y:** Brillo / Flujo infrarrojo.
- **Marcadores Moleculares Automáticos:** Si el espectro tiene valles de absorción característicos, el gráfico coloca etiquetas didácticas flotantes:
  - 💧 *"Banda de Hielo de Agua"* en $3.05\,\mu\text{m}$.
  - 🫧 *"Banda de Monóxido de Carbono (CO)"* en $4.67\,\mu\text{m}$.
  - ❄️ *"Metano ($\text{CH}_4$)"* en $3.3\,\mu\text{m}$.

---

## 5. `AladinOverlay`: Comparador Temporal Histórico (WISE 2010 vs SPHEREx 2025)

### Propósito
Cumplir la consideración del reto de superposición con otros observatorios espaciales:
- Integra el visor astronómico oficial del CDS (**Aladin Lite v3**).
- Permite alternar la vista entre el mapa histórico de **AllWISE (año 2010)** y las imágenes recientes de **SPHEREx (2025+)**.
- ¡Son **15 años de diferencia temporal**! Permite mostrar a los jueces y usuarios cómo una estrella de alto movimiento propio (como Barnard o WISE 0855) se ha movido una distancia gigantesca en el firmamento.
- Opción de activar vectores de movimiento propio del catálogo **Gaia DR3** dibujados como flechas verdes sobre los objetos.

---

## 6. `QualityBadge` y `MetadataPanel`: Semáforo de Calidad y Metadatos

### Propósito
Informar al usuario si la imagen es confiable o si tiene imperfecciones naturales de los detectores espaciales sin abrumarlo con códigos de error crudos:

- 🟢 **Verde ("Excelente Calidad"):** Todos los píxeles calibrados, sin contaminación solar ni rayos cósmicos.
- 🟡 **Amarillo ("Luz de Fondo Detectada"):** Presencia de emisión zodiacal o cercanía al plano galáctico, corregida por el software.
- 🔴 **Rojo ("Artefacto Espacial"):** Se detectó el paso de un rayo cósmico de alta energía o saturación por una estrella ultra brillante.
