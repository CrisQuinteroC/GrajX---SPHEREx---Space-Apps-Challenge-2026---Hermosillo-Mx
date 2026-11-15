# 🌌 Contexto Maestro Frontend — Proyecto GrajX (SPHEREx NASA)

Bienvenido a la **Carpeta de Contexto Frontend** de **GrajX**. Este directorio es la **fuente de verdad permanente y exclusiva para la interfaz de usuario, experiencia de usuario (UX/UI), accesibilidad universal y diseño visual** de la plataforma web pública para la misión espacial **SPHEREx** de la NASA (NASA Space Apps Challenge Hermosillo).

---

## 🎯 Propósito de este Contexto

Este conjunto de documentos está diseñado para que **cualquier agente de inteligencia artificial o desarrollador humano** sepa exactamente:
1. **Qué construir** y **cómo presentarlo** sin importar el framework o lenguaje que se elija (agnóstico).
2. **Cómo traducir datos astrofísicos complejos** (102 bandas infrarrojas, 6 detectores, matrices FITS, coordenadas ICRS, curvas espectrales) a un lenguaje **100% intuitivo, amigable y comprensible** para personas no expertas.
3. **Cómo garantizar inclusión total para todas las edades**: desde un niño de primaria jugando al "detective cósmico", hasta un adulto mayor con visión reducida o dificultades motrices, sin perder la rigurosidad científica que busca un astrónomo aficionado.
4. **Cómo implementar un diseño moderno, fluido y responsivo** que funcione tanto en una pantalla 4K, una tablet táctil, un teléfono móvil o incrustado en un `<iframe>` de ciencia ciudadana (Zooniverse / Backyard Worlds).

---

## 🗺️ Mapa de Navegación de la Carpeta

Para implementar o consultar cualquier aspecto del frontend, navega a los archivos dedicados:

| Archivo | Contenido Clave |
|---|---|
| [**`01_PRINCIPIOS_Y_ARQUITECTURA_AGNOSTICA.md`**](./01_PRINCIPIOS_Y_ARQUITECTURA_AGNOSTICA.md) | Principios de diseño frontend desacoplado de frameworks, capas de la aplicación, contratos de API REST/JSON con el backend y sincronización de URL (Deep Linking). |
| [**`02_DISENO_UNIVERSAL_Y_ACCESIBILIDAD_MULTIEDAD.md`**](./02_DISENO_UNIVERSAL_Y_ACCESIBILIDAD_MULTIEDAD.md) | Estrategia de diseño para 3 grupos etarios (Infantil, Adultos y Tercera Edad), estándares WCAG 2.1 AAA/AA, control de parpadeo seguro (`prefers-reduced-motion`) y lenguaje no intimidante. |
| [**`03_SISTEMA_DISENO_UI_UX_MODERNO.md`**](./03_SISTEMA_DISENO_UI_UX_MODERNO.md) | Tokens de diseño agnósticos (variables CSS), paleta espacial de alto contraste, tipografía accesible, microinteracciones, semáforos de calidad visuales y feedback de estados. |
| [**`04_ESPECIFICACION_COMPONENTES_GRAJX.md`**](./04_ESPECIFICACION_COMPONENTES_GRAJX.md) | Guía detallada de los 6 componentes nucleares: Buscador Cósmico, Reproductor Blink, Mezclador de Detectores D1-D6, Visor de Espectros ("Huella Molecular"), Comparador Temporal WISE/Gaia y Modo Embebido. |
| [**`05_LIBRERIAS_Y_HERRAMIENTAS_RECOMENDADAS.md`**](./05_LIBRERIAS_Y_HERRAMIENTAS_RECOMENDADAS.md) | Catálogo de herramientas modernas multi-framework para Canvas/WebGL, gráficos táctiles, Aladin Lite v3, iconografía accesible, tours interactivos y auditoría a11y. |
| [**`06_DIRECTRICES_Y_REGLAS_PARA_AGENTES.md`**](./06_DIRECTRICES_Y_REGLAS_PARA_AGENTES.md) | Mandamientos de desarrollo frontend, reglas de oro que ningún agente de IA debe violar, y lista de chequeo (DoD) antes de dar por terminada una tarea. |

---

## 💡 Filosofía Central: "Astronomía Táctil y Sin Barreras"

```
┌────────────────────────────────────────────────────────┐
│  "Si un niño de 8 años no puede encontrar la estrella  │
│   que se mueve en 3 clics, o si un adulto mayor no     │
│   puede leer los controles sin forzar la vista,        │
│   el diseño debe simplificarse aún más."               │
└────────────────────────────────────────────────────────┘
```

El reto de SPHEREx no es solo mostrar datos; es **democratizar el descubrimiento astronómico**. Las imágenes infrarrojas y los filtros variables lineales (LVF) no son fáciles de visualizar intuitivamente porque capturan luz que los ojos humanos no ven ($0.75\text{–}5.0\,\mu\text{m}$). Nuestra interfaz es el **traductor visual** que convierte esa radiación invisible en emoción, asombro y ciencia al alcance de todos.
