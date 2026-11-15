# 🛠️ 05. Catálogo de Librerías y Herramientas Recomendadas

Este catálogo reúne las **mejores librerías y herramientas modernas del ecosistema web**, seleccionadas por su madurez, rendimiento, accesibilidad y facilidad de integración con **cualquier framework o en JavaScript puro**.

---

## 1. Visores Astronómicos y Capas Celestes

| Herramienta | Tipo | ¿Por qué usarla en CepheusLive? | Enlace / Referencia |
|---|---|---|---|
| **Aladin Lite v3** | Biblioteca JavaScript oficial del CDS (*Centre de Données astronomiques de Strasbourg*) | Estándar mundial para visualizar el cielo. Permite superponer mapas HiPS de **AllWISE (2010)**, **Gaia DR3** (con vectores de movimiento propio) y catálogos SIMBAD en WebGL con sincronización de coordenadas en 3 líneas de código. | [Aladin Lite v3 Docs](https://aladin.cds.unistra.fr/AladinLite/doc/) |
| **`fitsjs` / `@hscmap/fits`** | Decodificador FITS cliente | Permite leer cabeceras FITS y arrays de flotantes directamente en el navegador si se desea inspeccionar metadatos WCS sin llamar al backend. | [fitsjs GitHub](https://github.com/astrojs/fitsjs) |

---

## 2. Motores de Renderizado de Imagen y Canvas (60 FPS)

| Herramienta | Enfoque | Beneficio Principal | Casos de Uso en CepheusLive |
|---|---|---|---|
| **Canvas 2D Nativo (`HTMLCanvasElement`)** | Estándar web sin dependencias | Cero sobrecarga de paquetes, control total sobre `ctx.drawImage()`, manipulación directa de píxeles (`ImageData`) para contraste dinámico y filtros de color. | *Blink Player* básico y modo cortina deslizante. |
| **PixiJS** | Motor WebGL 2D acelerado por hardware | Framerates ultra altos (60-120 fps) incluso con zoom y paneo continuo de imágenes de alta resolución. | Ideal si se desea zoom astronómico infinito con arrastre táctil fluido. |
| **OpenSeadragon** | Visor de imágenes de resolución ultra alta | Manejo nativo de *Deep Zoom*, gestos táctiles multitouch (pellizcar para zoom), minimapa de navegación de cielo. | Navegación suave de mosaicos de cielo completo. |

---

## 3. Gráficos Interactivos de Espectros y Curvas de Luz

| Herramienta | Peso | Facilidad de Uso | Ideal para: |
|---|---|---|---|
| **Chart.js** | Ligero (~60 KB) | ⭐⭐⭐⭐⭐ (Muy alta) | Curvas espectrales de $0.75\text{ a }5.0\,\mu\text{m}$ con marcadores flotantes de moléculas ($\text{H}_2\text{O}$, $\text{CO}_2$). Compatible con lectores de pantalla. |
| **Apache ECharts** | Completo (~300 KB) | ⭐⭐⭐⭐ (Alta) | Gráficos espectrales avanzados con barras de zoom interactivas en el eje X (*dataZoom* slider) y efectos visuales de gradiente de longitud de onda. |
| **Plotly.js** | Científico (~900 KB) | ⭐⭐⭐⭐ (Alta) | Excelente para astrónomos que esperan barras de error fotométrico ($1\sigma$) y exportación de datos a CSV/PNG en 1 clic. |
| **uPlot** | Ultra ligero (<40 KB) | ⭐⭐⭐ (Media) | El motor de trazado más rápido del mundo. Dibuja 100,000 puntos en milisegundos con cero consumo de batería. |

---

## 4. Primitivas de UI Accesibles y Diseño Inclusivo

| Herramienta | Descripción | Impacto en Accesibilidad |
|---|---|---|
| **Radix Primitives / Headless UI / Shoelace** | Componentes sin estilos pero con accesibilidad WAI-ARIA completa ya resuelta. | Garantiza que modales, menús desplegables, sliders y tooltips funcionen perfectamente con teclado y lectores de pantalla sin reinventar la rueda. |
| **Tailwind CSS / Open Props** | Utilidades de estilos y variables CSS estándar. | Implementación inmediata de la paleta cósmica, espaciados y tipografía responsiva definida en el documento 03. |
| **Lucide Icons / Phosphor Icons** | Sets de iconos SVG limpios y consistentes. | Iconos claros para tortuga/liebre, Play/Pausa, lupas, copos de nieve (frío), llamas (calor) y banderas de calidad. |

---

## 5. Gamificación, Tours Guiados y Apoyo a Usuarios No Expertos

| Herramienta | Propósito | Cómo potencia a niños y adultos mayores |
|---|---|---|
| **Driver.js** o **Shepherd.js** | Motor de visitas guiadas paso a paso (*Onboarding Tour*). | Al entrar por primera vez, resalta con un foco suave: *"1. Esta es la foto tomada en junio. 2. Esta es la foto de diciembre. ¡Mira cómo salta la estrella en el centro!"*. |
| **canvas-confetti** | Micro-celebración visual en canvas. | Cuando un niño o aficionado hace clic en el objeto en movimiento dentro del modo "Detective Cósmico", lanza confeti de estrellas para reforzar el descubrimiento. |
| **Howler.js** o Web Audio API nativa | Efectos de sonido sutiles y accesibles. | Retroalimentación sonora suave ("clic" estelar o tono armónico) al pausar o detectar cambios, con interruptor de silenciado siempre visible. |

---

## 6. Herramientas de Auditoría y Verificación de Calidad

- **`axe-core` / Lighthouse Accessibility:** Ejecutar para auditar que la página mantenga un puntaje de **100/100 en Accesibilidad** (contrastes, etiquetas `aria-label`, foco por teclado).
- **Simulador de Daltonismo (Color Oracle / Web Developer Tools):** Verificar que los mapas de resta temporal ($I_t - I_0$) y los gráficos espectrales se distingan perfectamente bajo deuteranopía, protanopía y tritanopía.
- **Chrome DevTools Rendering Emulation:** Probar la página con la opción `"Emulate CSS media feature prefers-reduced-motion: reduce"` para verificar que el parpadeo se detenga automáticamente.
