"""
GrajX — Benchmark Targets Catalog (NASA Space Apps Challenge 2026)
Catálogo de los 5 objetos astronómicos obligatorios para validación de SPHEREx.
"""

BENCHMARK_PRESETS = [
    {
        "id": "barnards_star",
        "name": "Barnard's Star (GJ 699)",
        "friendly_title": "Alto Movimiento Propio",
        "category": "moving_star",
        "description": "Estrella enana roja a 5.96 a.l. Posee el mayor movimiento propio conocido (10.3 arcsec/año). En modo resta se aprecia el desplazamiento neto.",
        "ra": 269.45208,
        "dec": 4.69336,
        "recommended_fov": 5.0,
        "recommended_mode": "diff",
        "recommended_detector": "all",
        "fun_fact": "Su desplazamiento acumulado es perceptible en escalas de tiempo de pocos años.",
        "motion_rate": "10.3 arcsec/año"
    },
    {
        "id": "epsilon_indi_b",
        "name": "Epsilon Indi B (Ba/Bb)",
        "friendly_title": "Sistema Binario de Enanas Marrones",
        "category": "brown_dwarf",
        "description": "Par binario de objetos subestelares fríos (T1 + T6) en órbita mutua con alto movimiento propio (4.7 arcsec/año).",
        "ra": 331.04390,
        "dec": -56.78194,
        "recommended_fov": 4.0,
        "recommended_mode": "blink",
        "recommended_detector": "D4",
        "fun_fact": "Cuerpos fríos detectados con mayor contraste en longitudes de onda del infrarrojo cercano.",
        "motion_rate": "4.7 arcsec/año"
    },
    {
        "id": "wise_0855",
        "name": "WISE 0855−0714",
        "friendly_title": "Enana Marrón Ultra Fría",
        "category": "cold_brown_dwarf",
        "description": "Objeto tipo Y (~250 K). Emisión detectable predominantemente en detectores de onda larga (D5 y D6 de SPHEREx).",
        "ra": 133.79513,
        "dec": -7.24515,
        "recommended_fov": 6.0,
        "recommended_mode": "blink",
        "recommended_detector": "D5",
        "fun_fact": "Presenta absorción característica de nubes de hielo de agua en 3.05 micrómetros.",
        "motion_rate": "8.1 arcsec/año"
    },
    {
        "id": "rw_aurigae",
        "name": "RW Aurigae",
        "friendly_title": "Estrella Variable T Tauri",
        "category": "variable_star",
        "description": "Estrella joven con variaciones de brillo fotométrico por oscurecimiento episódico de polvo circumestelar.",
        "ra": 76.95608,
        "dec": 30.40133,
        "recommended_fov": 3.0,
        "recommended_mode": "blink",
        "recommended_detector": "all",
        "fun_fact": "Mantiene posición fija mientras su flujo lumínico varía entre distintas épocas.",
        "motion_rate": "Variabilidad fotométrica"
    },
    {
        "id": "r_draconis",
        "name": "R Draconis",
        "friendly_title": "Estrella Gigante Pulsante",
        "category": "pulsating_giant",
        "description": "Estrella gigante roja variable tipo Mira con ciclos periódicos de pulsación y variaciones térmicas.",
        "ra": 248.16763,
        "dec": 66.75497,
        "recommended_fov": 8.0,
        "recommended_mode": "blink",
        "recommended_detector": "D3",
        "fun_fact": "Su atmósfera en expansión y contracción muestra marcadas firmas moleculares de vapor de agua y monóxido de carbono.",
        "motion_rate": "Pulsación periódica"
    }
]
