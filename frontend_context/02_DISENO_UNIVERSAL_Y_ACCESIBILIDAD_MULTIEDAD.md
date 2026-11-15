# 🌍 02. Diseño Universal y Accesibilidad Multi-Edad (Infantil a Tercera Edad)

> **Mantra de Inclusión:** *"El universo pertenece a todos. Si nuestra interfaz excluye a un niño o confunde a un abuelo, hemos fallado en la misión de divulgación de la NASA."*

Este documento establece las directrices de diseño centrado en el ser humano para garantizar que la plataforma **GrajX** sea utilizable, disfrutable y educativa para usuarios sin conocimientos astronómicos de cualquier edad.

---

## 1. Matriz de Adaptabilidad por Rango Etario

| Perfil | Características Clave | Barreras Habituales | Solución de Diseño en GrajX |
|---|---|---|---|
| **Infantil / Escolar** *(6 a 12 años)* | - Aprendizaje visual y lúdico.<br>- Curiosidad inmediata.<br>- Poca tolerancia al texto denso. | - Jerga técnica (RA/Dec, ICRS, WCS, Mag).<br>- Interfaces grises o estáticas.<br>- Frustración ante tiempos de espera. | - **Modo "Detective Cósmico":** Metáfora de juego (encontrar qué se movió o cambió).<br>- Iconos grandes ilustrados (la tortuga 🐢 y la liebre 🐇 para la velocidad).<br>- Micro-recompensas visuales y comparaciones del mundo real (ej. *"este campo es del tamaño de la Luna llena"*). |
| **Jóvenes y Adultos No Expertos** *(13 a 64 años)* | - Familiarizados con apps de streaming y redes.<br>- Búsqueda de inmediatez y estética moderna.<br>- Desean compartir descubrimientos. | - Interfaces sobrecargadas tipo software de escritorio de los 90.<br>- Falta de contexto sobre qué están viendo. | - **Controles tipo reproductor de vídeo moderno** (barra de tiempo fluida con Play/Pausa estilo YouTube/Netflix).<br>- Tarjetas de presets atractivas con datos curiosos ("Fun Facts").<br>- Botón de compartir en redes o incrustar en 1 clic. |
| **Tercera Edad / Adultos Mayores** *(65+ años)* | - Gran interés en ciencia y divulgación.<br>- Posible reducción en agudeza visual, contraste o pulso motriz.<br>- Respeto por instrucciones claras. | - Textos diminutos (<14px) con bajo contraste.<br>- Botones pequeños y juntos (dificultad de pulsación).<br>- Pérdida de orientación en la pantalla. | - **Objetivos táctiles gigantes** (mínimo $48\times 48\text{ px}$).<br>- **Tipografía de alta legibilidad** (base de 18px, espaciado generoso).<br>- **Etiquetado explícito en español cotidiano**: *"Foto 1 (Junio 2025)"* en vez de *"Epoch MJD 60841.59"*. |

---

## 2. Accesibilidad Crítica: Fotosensibilidad y Parpadeo Seguro

Un **Blink Comparator** astronómico tradicional alterna imágenes rápidamente para resaltar cambios. Sin embargo, **el parpadeo rápido puede inducir ataques epilépticos fotosensibles o mareos visuales**.

### Reglas Inviolables de Seguridad:
1. **Límite de Frecuencia Seguro:** La velocidad de parpadeo automática por defecto **nunca debe superar los 2 Hz** (2 cambios por segundo). El slider de velocidad debe tener un tope máximo seguro de 5 Hz.
2. **Alternativa Accesible ("Cortina Deslizante / Split-Slider"):** Proveer siempre un modo alternativo donde en lugar de parpadear, el usuario arrastra un deslizador horizontal sobre la imagen para revelar la Época A y la Época B gradualmente (como los comparadores de "Antes y Después").
3. **Respeto a `prefers-reduced-motion`:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     /* Desactivar reproducción automática del blink comparator al cargar */
     .blink-player-autoplay {
       animation: none !important;
     }
     /* Ofrecer modo paso a paso por defecto */
   }
   ```
4. **Pausa Inmediata con un Clic o Tecla Espacio:** Al tocar o hacer clic sobre cualquier parte del visor de imágenes, la animación debe pausarse al instante.

---

## 3. Diccionario de Lenguaje Simple (Cero Jerga Intimidante)

Para evitar que los usuarios no expertos abandonen la plataforma, toda la terminología astrofísica debe tener su traducción amigable en la interfaz principal (dejando los términos técnicos como detalle opcional o en un tooltip con el icono ℹ️):

| Término Científico | Nombre Amigable en la UI | Explicación para Todos los Públicos |
|---|---|---|
| **RA / Dec** *(Right Ascension / Declination)* | **Dirección en el Cielo** | *"Es como la latitud y longitud, pero dibujadas en la esfera del cielo nocturno."* |
| **FOV** *(Field of View)* | **Zoom del Cielo** | *"Qué tan cerca o lejos estamos mirando (ej. del tamaño de una moneda o de la Luna entera)."* |
| **Blink Comparator** | **Animador de Diferencias** | *"Alterna fotos tomadas en distintas fechas para que tus ojos noten de inmediato si algo se movió o parpadeó."* |
| **Median Stacking / Coadd** | **Suma de Luz (Foto Profunda)** | *"Combina varias imágenes para revelar objetos muy tenues y borrar el ruido espacial."* |
| **Temporal Difference ($I_t - I_0$)** | **Modo 'Resta' (Ver Cambios)** | *"Borra todo lo que se queda quieto y deja en pantalla brillante solo lo que se movió o cambió de brillo."* |
| **Detectores D1 a D6 (LVF)** | **Ojos Infrarrojos 1 al 6** | *"SPHEREx tiene 6 ojos especiales, cada uno sensible a colores invisibles diferentes del calor espacial."* |
| **Flags de Calidad / Contaminación** | **Semáforo de la Foto** | *🟢 Foto limpia / 🟡 Luz de estrellas vecinas / 🔴 Rayo cósmico detectado.* |
| **Espectro Electromagnético** | **Huella Dactilar de Luz** | *"Nos dice de qué está hecho el objeto: agua, hielo, gas o polvo espacial."* |

---

## 4. Estándares WCAG 2.1 AAA / AA para Tercera Edad y Baja Visión

1. **Relación de Contraste de Color:**
   - Todo texto sobre fondo oscuro debe superar una relación de contraste mínima de **7:1** (Nivel AAA) para texto estándar y **4.5:1** para texto grande ($\ge 18\text{pt}$ o $\ge 14\text{pt}$ negrita).
   - Fondos recomendados: Negro espacial profundo (`#0A0D14`) y gris grafito (`#161B26`).
   - Texto principal: Blanco puro (`#FFFFFF`) o blanco estelar (`#F0F4F8`). **Nunca gris tenue sobre negro**.
2. **Tamaños de Blanco Táctil (Fitts's Law):**
   - Botones primarios (Play, Pausa, Presets, Buscar): Mínimo $48\times 48\text{ px}$ con márgenes de separación de al menos $12\text{ px}$ para evitar clics accidentales causados por temblor esencial o artrosis.
3. **Escalabilidad de Texto:**
   - La interfaz debe soportar un zoom de navegador del **200% sin romperse**, sin solapar botones ni provocar scroll horizontal accidental.
4. **Retroalimentación Multisensorial:**
   - Cada acción interactiva (hacer clic en un preset, detectar un objeto, cambiar de modo) debe tener **confirmación visual inequívoca** (un halo brillante, cambio de color y texto descriptivo) y opcionalmente un sonido suave sutil ("ping" estelar) activable/desactivable con un interruptor visible.

---

## 5. Accesibilidad por Teclado y Lectores de Pantalla (ARIA)

Cualquier persona con movilidad reducida o ciega debe poder navegar la herramienta utilizando exclusivamente el teclado o su software de asistencia:

- <kbd>Espacio</kbd> o <kbd>K</kbd>: Alternar Play / Pausa en el reproductor.
- <kbd>←</kbd> / <kbd>→</kbd>: Retroceder o avanzar un fotograma (Época previa / siguiente).
- <kbd>M</kbd>: Cambiar entre modos de visualización (Blink $\rightarrow$ Suma $\rightarrow$ Resta).
- <kbd>Tab</kbd>: Foco visible con un contorno de alto contraste (borde azul cian `#00E5FF` de $3\text{ px}$).
- **Regiones ARIA Live:**
  ```html
  <div role="status" aria-live="polite" class="sr-only">
    Mostrando fotograma 2 de 4: Época Diciembre 2025. Objeto en movimiento detectado en el cuadrante superior.
  </div>
  ```
