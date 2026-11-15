# 📜 06. Directrices y Reglas de Oro para Agentes de IA y Desarrolladores

> **ATENCIÓN AGENTES DE IA (Copilot, Antigravity, Cursor, Claude, etc.):**  
> Cuando generes o modifiques código de la interfaz de usuario de CepheusLive, **DEBES CUMPLIR ESTAS REGLAS SIN EXCEPCIÓN**. Son los principios rectores que garantizan la calidad del proyecto para el NASA Space Apps Challenge.

---

## 🛑 Las 8 Reglas de Oro Inviolables de Frontend

### 1. Regla de Oro del Lenguaje Humano (Cero Barreras Cognitivas)
- **Prohibido:** Mostrar términos crudos como `WCS Poly`, `MJD 60841.59`, `SIAv2 query`, `HDU 2 Bitmask 0x04` en la vista principal.
- **Obligatorio:** Traducir todo a lenguaje cotidiano. El `MJD` debe presentarse como *"15 de junio de 2025 (14:22 UTC)"*; los `flags` deben presentarse como un **semáforo de calidad con texto explicativo**. Las coordenadas deben poder introducirse en grados o sexagesimal, pero la UI debe mostrar además el nombre del objeto o la constelación.

### 2. Regla de Oro de los 5 Objetos Obligatorios (Acceso en 1 Clic)
- Las tarjetas o botones de los 5 objetivos de prueba (**Barnard's Star, Epsilon Indi B, WISE 0855, RW Aurigae, R Draconis**) deben ser prominentes y accesibles con **un solo toque o clic** desde cualquier pantalla.
- Al hacer clic en un preset, la UI debe cargar sus coordenadas, configurar el `FOV` recomendado y seleccionar el modo más espectacular para ese objeto (ej. modo resta para Barnard's Star, detector D5/D6 para WISE 0855).

### 3. Regla de Oro de la Fotosensibilidad y Salud Visual
- La velocidad por defecto del parpadeo (*Blink*) no debe superar **2 Hz** (2 cuadros por segundo).
- Debe respetarse siempre la directiva CSS/JS `prefers-reduced-motion`. Si el sistema del usuario tiene activada la reducción de movimiento, el parpadeo debe iniciar pausado y ofrecer el modo **Cortina Deslizante (*Split-Screen*)**.
- Debe existir un botón visible de **Pausa** y atajo de teclado (<kbd>Espacio</kbd>).

### 4. Regla de Oro de Sincronización de URL (Deep Linking)
- Cualquier interacción que cambie el estado de la observación (`ra`, `dec`, `fov`, `mode`, `detector`, `fps`) debe actualizar la Query String del navegador con `window.history.replaceState`.
- Si un usuario copia la URL y se la envía a un amigo o la pega en otra pestaña, **debe reproducirse exactamente la misma vista astronómica**.

### 5. Regla de Oro del Modo Incrustable (`embed=1`)
- Cuando la URL contenga `embed=1` o `embed=true`, la interfaz debe ocultar automáticamente la cabecera del sitio, barras laterales y pies de página decorativos.
- El visor de imágenes debe ocupar el 100% del tamaño disponible, con controles superpuestos compactos y accesibles pensados para integrarse en un `<iframe>`.

### 6. Regla de Oro de Ergonomía Táctil y Tercera Edad
- Todo botón, slider o elemento interactivo debe tener un área táctil mínima de **$48\times 48\text{ píxeles}$**.
- La fuente de texto base nunca debe ser menor a **$16\text{ px}$** (preferentemente $18\text{ px}$ para cuerpos de texto descriptivos).
- El contraste de color entre texto y fondo debe satisfacer como mínimo **WCAG AA (4.5:1)** y preferentemente **WCAG AAA (7:1)**.

### 7. Regla de Oro de Resiliencia ante Fallos de Red
- Si el backend no responde o el servicio IRSA de la NASA está saturado, el frontend **nunca debe quedarse en blanco ni mostrar una pantalla rota**.
- Debe activar suavemente el catálogo pre-cacheado local (`data/presets/`) y notificar al usuario con amabilidad que está navegando en *"Modo Exploración con Datos Locales"*.

### 8. Regla de Oro de Rendimiento en Animaciones
- Prohibido usar `setInterval` para controlar el parpadeo de imágenes. Utilizar siempre `requestAnimationFrame` o temporizadores controlados por delta de tiempo (`performance.now()`) para garantizar 60 fps estables y sincronía de pantalla.

---

## ✅ Lista de Chequeo de Entrega (Definition of Done)

Antes de considerar terminada cualquier pantalla o componente de frontend, verifica:

- [ ] ¿Un niño de 8 años entendería qué botón presionar para ver moverse la estrella?
- [ ] ¿Un adulto mayor de 70 años puede leer el texto sin entrecerrar los ojos y pulsar los botones sin fallar el clic?
- [ ] ¿Funciona el parpadeo fluido a 60 fps sin saltos en blanco?
- [ ] ¿Está presente la alternativa accesible de "Cortina Deslizante" para evitar parpadeos molestos?
- [ ] ¿Al tocar las tarjetas de los 5 objetos de prueba se carga la vista adecuada de inmediato?
- [ ] ¿Los parámetros se reflejan en la URL y el botón "Copiar Enlace" funciona?
- [ ] ¿El modo `embed=1` se visualiza limpio y sin barras sobrantes en un `<iframe>`?
- [ ] ¿El gráfico de espectro señala con claridad las moléculas de Agua y Monóxido de Carbono?
- [ ] ¿El semáforo de calidad informa en verde/amarillo/rojo el estado de la foto?
