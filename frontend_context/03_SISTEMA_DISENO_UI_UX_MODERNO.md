# 🎨 03. Sistema de Diseño UI/UX Moderno (Tokens, Colores y Layout)

Este documento define el **sistema de diseño visual (*Design System*)**, los tokens agnósticos en variables CSS y los patrones de maquetación para lograr una interfaz atractiva, profesional, digna de la NASA y a la vez cálida y comprensible para el público general.

---

## 1. Tokens de Diseño Agnósticos (Variables CSS)

Estos tokens pueden consumirse directamente en CSS puro, Sass, Tailwind CSS o módulos de estilos en cualquier framework:

```css
:root {
  /* ========================================================
     PALETA DE COLORES CÓSMICA DE ALTO CONTRASTE
     ======================================================== */
  /* Fondos del Espacio Profundo */
  --color-bg-space: #07090E;         /* Fondo base de la aplicación */
  --color-bg-surface: #111622;       /* Superficie de tarjetas y paneles */
  --color-bg-surface-hover: #1A2234; /* Hover en tarjetas y menús */
  --color-bg-overlay: rgba(7, 9, 14, 0.85); /* Fondos de modales con blur */

  /* Colores de Acento y Luz Estelar */
  --color-accent-cyan: #00F0FF;      /* Enfoque primario, selección y enlaces */
  --color-accent-amber: #FFB300;     /* Épocas destacadas, estrellas y alertas */
  --color-accent-purple: #9D4EDD;    /* Detectores infrarrojos lejanos (D5/D6) */
  --color-accent-rose: #FF2E93;      /* Indicadores de calor / infrarrojo */

  /* Semáforo de Calidad y Validación */
  --color-status-success: #00E676;   /* Verde: Calidad óptima, imagen limpia */
  --color-status-warning: #FFD600;   /* Amarillo: Luz dispersa o artefacto menor */
  --color-status-error: #FF1744;     /* Rojo: Saturación o rayo cósmico */

  /* Colores para Mapas de Resta Temporal (Accesibles para Daltonismo) */
  --color-diff-positive: #00E5FF;    /* Cian: Objeto nuevo / aumento de brillo */
  --color-diff-negative: #FF3D00;    /* Naranja rojizo: Objeto que se desplazó/apagó */
  --color-diff-neutral: #808080;     /* Gris medio: Sin cambios entre épocas */

  /* Textos de Alta Legibilidad (WCAG AAA) */
  --color-text-primary: #FFFFFF;     /* Títulos, controles principales y valores */
  --color-text-secondary: #B0BEC5;   /* Subtítulos y descripciones explicativas */
  --color-text-muted: #78909C;       /* Metadatos secundarios y notas al pie */

  /* ========================================================
     TIPOGRAFÍA ESCALABLE Y ACCESIBLE
     ======================================================== */
  --font-family-display: "Outfit", "Space Grotesk", system-ui, -apple-system, sans-serif;
  --font-family-body: "Inter", "Atkinson Hyperlegible", system-ui, sans-serif;
  --font-family-mono: "JetBrains Mono", "SF Mono", monospace;

  /* Escala Modular de Texto */
  --font-size-xs: 0.875rem;   /* 14px */
  --font-size-sm: 1.0rem;     /* 16px (Base para accesibilidad) */
  --font-size-md: 1.125rem;   /* 18px (Lectura cómoda adultos mayores) */
  --font-size-lg: 1.375rem;   /* 22px */
  --font-size-xl: 1.75rem;    /* 28px */
  --font-size-2xl: 2.25rem;   /* 36px */

  /* ========================================================
     ESPACIADO Y RADIOS DE BORDE
     ======================================================== */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-full: 9999px;

  /* ========================================================
     SOMBRAS Y PROFUNDIDAD
     ======================================================== */
  --shadow-glow-cyan: 0 0 20px rgba(0, 240, 255, 0.35);
  --shadow-glow-amber: 0 0 20px rgba(255, 179, 0, 0.35);
  --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.45);
}
```

---

## 2. Jerarquía Visual y Disposición en Pantalla (*Layout*)

La disposición se organiza en **3 áreas de enfoque claro** para no dispersar la atención visual del usuario:

```
┌────────────────────────────────────────────────────────────────────────┐
│  🌌 CepheusLive [NASA SPHEREx]    [Barra de Búsqueda y Selector de Presets]  │  <-- CABECERA
├────────────────────────────────────────┬───────────────────────────────┤
│                                        │                               │
│                                        │  📊 PANEL DE INFORMACIÓN      │
│  🔭 VISOR CENTRAL PRINCIPAL            │                               │
│  (Canvas WebGL / Blink Player)         │  • Identidad del Objeto       │
│                                        │  • ¿Qué fenómeno estás viendo?│
│  • Píxeles astronómicos limpios        │  • Semáforo de Calidad        │
│  • Controles flotantes:                │  • Selector de Zoom (FOV)     │
│    [⏮️ Paso] [▶️ Play] [⏭️ Paso]        ├───────────────────────────────┤
│    [Slider de Épocas] [Velocidad]      │  🌈 HUELLA ESPECTRAL (0.75-5µm│
│    [Modo: Parpadeo / Suma / Resta]     │  • Gráfico interactivo táctil │
│    [Detectores D1 ... D6]              │  • Bandas moleculares (Agua/CO│
│                                        │                               │
└────────────────────────────────────────┴───────────────────────────────┘
```

### Comportamiento Responsivo:
- **Pantallas Grandes / Escritorio ($\ge 1024\text{ px}$):** Vista dividida en dos columnas: Visor a la izquierda (65% del ancho) e Inspector didáctico a la derecha (35%).
- **Tablets y Móviles ($< 1024\text{ px}$):** Columna única vertical. El visor ocupa la parte superior con relación de aspecto $1:1$ cuadrada para maximizar el área de píxeles, y los paneles de explicación se despliegan en pestañas inferiores amigables.
- **Modo Embebido (`embed=1`):** La cabecera y el panel derecho se ocultan. El visor abarca el 100% del viewport con controles compactos superpuestos tipo YouTube.

---

## 3. Microinteracciones y Estados de Carga Empáticos

### A) Cargador Cósmico (*Cosmic Loader*)
Cuando se descarga un recorte desde IRSA o se procesa un apilamiento matemático:
- **Lo que NO se debe hacer:** Mostrar una pantalla congelada o un círculo genérico gris sin información.
- **Lo que SÍ se debe hacer:** Mostrar una pequeña constelación de estrellas que pulsan suavemente con un mensaje humano en rotación:
  - *"Conectando con el archivo infrarrojo de SPHEREx en California..."*
  - *"Alineando las fotos espaciales tomadas con 6 meses de diferencia..."*
  - *"Cargando tus datos del universo..."*

### B) Estados Vacíos y Guía Proactiva
Si el usuario llega por primera vez y no ha ingresado coordenadas:
- Presentar un banner acogedor: *"¿No sabes qué buscar? Toca cualquiera de nuestras 5 estrellas y mundos invisibles favoritos para ver magia espacial en 1 clic:"* seguido de las 5 tarjetas ilustradas.

### C) Estados de Error Comprensibles y Resilientes
Si la conexión a IRSA falla o las coordenadas no tienen cobertura:
- **Mensaje al usuario:** *"¡Vaya! No pudimos descargar nuevas fotos de esa zona en este momento. Sin embargo, hemos activado el modo de demostración con nuestros 5 objetos espaciales guardados para que sigas aprendiendo sin interrupciones."*
- Botón grande: *"Ver WISE 0855 (Enana marrón fría) 🚀"*.
