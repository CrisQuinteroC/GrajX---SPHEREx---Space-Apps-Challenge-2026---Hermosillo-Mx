/**
 * CepheusLive — Sistema de Internacionalización (i18n)
 * Soporta: English (en - Default), Español (es), Français (fr)
 *
 * Reglas:
 *  - NINGÚN texto visible debe estar escrito a mano en componentes: todo pasa por t().
 *  - Los textos estáticos del HTML usan data-i18n / data-i18n-title / data-i18n-aria / data-i18n-placeholder.
 *  - Los datos que llegan del backend (presets, moléculas, calidad, épocas) se traducen
 *    en el cliente usando el `id` del dato, así el backend no depende del idioma.
 */

const STORAGE_KEY = 'grajx_lang';
const DEFAULT_LOCALE = 'en'; // Idioma por defecto: Inglés

export const SUPPORTED_LOCALES = ['en', 'es', 'fr'];

export const translations = {
  /* ═══════════════════════════ ENGLISH ═══════════════════════════ */
  en: {
    // Page
    'page.title': 'CepheusLive — Public Multi-Epoch & Multi-Band SPHEREx Viewer (NASA)',
    'page.description': 'Multi-epoch, multi-band viewer for NASA’s SPHEREx space mission. Temporal analysis across 102 infrared bands.',
    'skip.link': 'Skip to image viewer',

    // Header & Settings
    'brand.home': 'CepheusLive Home',
    'settings.btn': 'Settings',
    'settings.open': 'Open settings',
    'settings.panelAria': 'Settings panel',
    'settings.title': 'Settings',
    'settings.appearance': 'Appearance',
    'settings.colorMode': 'Color mode',
    'settings.colorModeDesc': 'Toggle between dark and light',
    'settings.dark': 'Dark',
    'settings.light': 'Light',
    'settings.switchToLight': 'Switch to light mode',
    'settings.switchToDark': 'Switch to dark mode',
    'settings.toggleTitle': 'Change theme',
    'settings.language': 'Language',
    'settings.languageDesc': 'Interface language',
    'settings.selectLanguage': 'Select language',

    // Regions (aria)
    'region.search': 'Search and test objects',
    'region.viewer': 'SPHEREx temporal image viewer',
    'region.inspector': 'Information and spectral fingerprint',

    // SkySearchBar
    'search.objectLabel': 'Object from list:',
    'search.objectAria': 'Select an object from the list',
    'search.objectPlaceholder': 'Loading list...',
    'search.coordsLabel': 'Coordinates (RA, Dec) or name:',
    'search.coordsPlaceholder': 'E.g. 269.452, 4.693 or 17h57m48.5s +04d41m36s',
    'search.coordsAria': 'Sky coordinates or object name',
    'search.fovLabel': 'Field of view (FOV):',
    'search.loadBtn': 'Load data',
    'search.optgroupTargets': 'Required benchmark objects (SPHEREx)',
    'search.optgroupCustom': 'Custom',
    'search.customOption': 'Manual coordinates...',
    'search.formatError': 'Unrecognized format. Enter RA, Dec coordinates (e.g. 269.452, 4.693) or click the quadrant map.',
    'search.sourceLabel': 'SPHEREx source:',
    'search.sourceAuto': 'SPHEREx Auto (Cache / IRSA)',
    'search.sourceCache': 'SPHEREx Local FITS',
    'search.sourceLive': 'SPHEREx IRSA Live',
    'search.mapTitle': 'Celestial Quadrant Map (SPHEREx / Gaia DR3 / WISE)',
    'search.mapHint': 'Click any sky position or select a quadrant (Q1–Q4)',
    'search.quadAll': 'All sky (0°–360°)',

    // BlinkPlayer
    'player.modeRgb': 'RGB Color',
    'player.modeDiff': 'Difference',
    'player.modeBlink': 'Blink',
    'player.modeStack': 'Co-add',
    'player.modeCurtain': 'Curtain',
    'player.stretch': 'Stretch:',
    'player.maskToggle': '3σ Mask',
    'player.trajToggle': 'Trajectory',
    'player.exportGif': 'Export GIF',
    'player.loading': 'Processing SPHEREx data...',
    'player.speed': 'Speed:',
    'player.curtainHandle': 'Drag curtain',
    'player.epochLoading': 'Loading...',
    'player.epoch': 'Epoch',
    'player.motionTarget': 'Detected target',
    'player.labelBarnard': 'Proper motion',
    'player.labelWise': 'NIR emission',
    'player.labelRwAur': 'Photometric variation',
    'player.labelDefault': 'Target',
    'player.play': 'Play',
    'player.pause': 'Pause',
    'player.playPause': 'Play / Pause',
    'player.prevEpoch': 'Previous epoch',
    'player.nextEpoch': 'Next epoch',
    'player.timeline': 'SPHEREx epoch timeline',
    'player.fps': 'Frame rate',

    // DetectorSelector
    'detector.title': 'Bands:',
    'detector.all': 'All',
    'detector.allHint': 'Co-addition of 102 spectral bands',
    'detector.D1hint': 'Near optical / main-sequence stars',
    'detector.D2hint': 'Low interstellar dust extinction',
    'detector.D3hint': 'Red giant sensitivity',
    'detector.D4hint': 'Water ice molecular absorption (H₂O)',
    'detector.D5hint': 'Carbon monoxide and dioxide; cold dwarfs',
    'detector.D6hint': 'Thermal infrared; substellar-temperature objects',
    'detector.rgb': 'RGB composite',
    'detector.rgbHint': 'R: D5/D6, G: D3/D4, B: D1/D2',

    // MetadataPanel
    'meta.loading': 'Loading...',
    'meta.ra': 'RA',
    'meta.dec': 'Dec',
    'meta.customName': 'Custom coordinates',
    'meta.customTitle': 'Exploration zone',
    'meta.customDesc': 'Infrared observation centered on the selected sky patch.',
    'meta.qualityExcellent': 'Optimal quality',
    'meta.qualityZodiacal': 'Zodiacal light',
    'meta.qualityMsgExcellent': 'Nominal calibration, no artifacts.',
    'meta.qualityMsgZodiacal': 'Slight zodiacal scattering; corrected.',
    'meta.shareBtn': 'Share / Embed',
    'meta.band': 'Band / Detector',
    'meta.wavelength': 'Wavelength',
    'meta.exposure': 'Exposure',
    'meta.source': 'Source',
    'meta.trajectory': 'Trajectory',
    'meta.stationary': 'Stationary (< 1 px)',
    'meta.flags': 'Active flags',
    'meta.none': 'None',

    // SpectrumChart
    'spectrum.title': 'Infrared spectrum (0.75 to 5.0 µm)',
    'spectrum.badge': '102 LVF bands',
    'spectrum.waterIce': 'H₂O ice',
    'spectrum.absorptionAt': 'Absorption detected at {wl} µm',
    'mol.water_ice': 'Water ice (H₂O)',
    'mol.water_vapor': 'Water vapor (H₂O)',
    'mol.methane': 'Methane (CH₄)',
    'mol.co': 'Carbon monoxide (CO)',
    'mol.co2': 'Carbon dioxide (CO₂)',

    // AladinOverlay
    'aladin.title': 'SPHEREx vs Gaia DR3 & WISE',
    'aladin.wise': 'WISE 2010',
    'aladin.gaia': 'Gaia DR3',
    'aladin.spherex': 'SPHEREx 2025',
    'aladin.split': 'SPHEREx + Gaia/WISE',
    'aladin.gaiavector': 'Gaia DR3 proper motion',

    // EmbedModal
    'embed.title': 'Share & Embed',
    'embed.close': 'Close dialog',
    'embed.desc': 'Direct shareable link or HTML code to embed the animated SPHEREx viewer:',
    'embed.directLink': 'Direct link:',
    'embed.copyLink': 'Copy link',
    'embed.iframeCode': 'Embed code (<iframe>):',
    'embed.copyIframe': 'Copy iframe code',
    'embed.linkCopied': 'Link copied to clipboard',
    'embed.iframeCopied': 'Iframe code copied to clipboard',

    // Footer
    'footer.text': 'CepheusLive — NASA SPHEREx Mission. Scientific data provided by NASA/IPAC Infrared Science Archive (IRSA).',

    // Targets (presets)
    'preset.barnards_star.title': 'High proper motion',
    'preset.barnards_star.desc': 'Red dwarf 5.96 light-years away. It has the largest known proper motion (10.3 arcsec/yr). Difference mode shows its net displacement.',
    'preset.epsilon_indi_b.title': 'Brown dwarf binary system',
    'preset.epsilon_indi_b.desc': 'Cold substellar binary pair (T1 + T6) orbiting each other with high proper motion (4.7 arcsec/yr).',
    'preset.wise_0855.title': 'Ultra-cold brown dwarf',
    'preset.wise_0855.desc': 'Y-type object (~250 K). Emission is mainly detectable in the long-wavelength detectors (SPHEREx D5 and D6).',
    'preset.rw_aurigae.title': 'T Tauri variable star',
    'preset.rw_aurigae.desc': 'Young star whose brightness varies as circumstellar dust episodically dims it.',
    'preset.r_draconis.title': 'Pulsating giant star',
    'preset.r_draconis.desc': 'Mira-type variable red giant with periodic pulsation cycles and thermal variations.'
  },

  /* ═══════════════════════════ ESPAÑOL ═══════════════════════════ */
  es: {
    // Page
    'page.title': 'CepheusLive — Visor público multiépoca y multibanda de SPHEREx (NASA)',
    'page.description': 'Visualizador multiépoca y multibanda de la misión espacial SPHEREx de la NASA. Análisis temporal en 102 bandas infrarrojas.',
    'skip.link': 'Saltar al visor de imágenes',

    // Header & Settings
    'brand.home': 'Inicio de CepheusLive',
    'settings.btn': 'Ajustes',
    'settings.open': 'Abrir ajustes',
    'settings.panelAria': 'Panel de ajustes',
    'settings.title': 'Ajustes',
    'settings.appearance': 'Apariencia',
    'settings.colorMode': 'Modo de color',
    'settings.colorModeDesc': 'Alterna entre oscuro y claro',
    'settings.dark': 'Oscuro',
    'settings.light': 'Claro',
    'settings.switchToLight': 'Activar modo claro',
    'settings.switchToDark': 'Activar modo oscuro',
    'settings.toggleTitle': 'Cambiar tema',
    'settings.language': 'Idioma',
    'settings.languageDesc': 'Idioma de la interfaz',
    'settings.selectLanguage': 'Seleccionar idioma',

    // Regions (aria)
    'region.search': 'Búsqueda y objetos de prueba',
    'region.viewer': 'Visor temporal de imágenes SPHEREx',
    'region.inspector': 'Información y huella espectral',

    // SkySearchBar
    'search.objectLabel': 'Objeto de la lista:',
    'search.objectAria': 'Seleccionar un objeto de la lista',
    'search.objectPlaceholder': 'Cargando lista...',
    'search.coordsLabel': 'Coordenadas (AR, Dec) o nombre:',
    'search.coordsPlaceholder': 'Ej. 269.452, 4.693 o 17h57m48.5s +04d41m36s',
    'search.coordsAria': 'Coordenadas celestes o nombre del objeto',
    'search.fovLabel': 'Campo de visión (FOV):',
    'search.loadBtn': 'Cargar datos',
    'search.optgroupTargets': 'Objetos requeridos (SPHEREx)',
    'search.optgroupCustom': 'Personalizado',
    'search.customOption': 'Coordenadas manuales...',
    'search.formatError': 'Formato no reconocido. Escribe coordenadas AR, Dec (ej. 269.452, 4.693) o haz clic en el mapa de cuadrantes.',
    'search.sourceLabel': 'Fuente SPHEREx:',
    'search.sourceAuto': 'SPHEREx Auto (Caché / IRSA)',
    'search.sourceCache': 'SPHEREx FITS Local',
    'search.sourceLive': 'SPHEREx IRSA en vivo',
    'search.mapTitle': 'Mapa Celeste de Cuadrantes (SPHEREx / Gaia DR3 / WISE)',
    'search.mapHint': 'Haz clic en cualquier punto o elige un cuadrante (Q1–Q4)',
    'search.quadAll': 'Todo el cielo (0°–360°)',

    // BlinkPlayer
    'player.modeRgb': 'Color RGB',
    'player.modeDiff': 'Diferencia',
    'player.modeBlink': 'Parpadeo',
    'player.modeStack': 'Coadición',
    'player.modeCurtain': 'Cortina',
    'player.stretch': 'Estiramiento:',
    'player.maskToggle': 'Máscara 3σ',
    'player.trajToggle': 'Trayectoria',
    'player.exportGif': 'Descargar GIF',
    'player.loading': 'Procesando datos de SPHEREx...',
    'player.speed': 'Velocidad:',
    'player.curtainHandle': 'Arrastrar cortina',
    'player.epochLoading': 'Cargando...',
    'player.epoch': 'Época',
    'player.motionTarget': 'Objetivo detectado',
    'player.labelBarnard': 'Movimiento propio',
    'player.labelWise': 'Emisión NIR',
    'player.labelRwAur': 'Variación fotométrica',
    'player.labelDefault': 'Objetivo',
    'player.play': 'Reproducir',
    'player.pause': 'Pausar',
    'player.playPause': 'Reproducir / Pausar',
    'player.prevEpoch': 'Época anterior',
    'player.nextEpoch': 'Época siguiente',
    'player.timeline': 'Línea temporal de épocas de SPHEREx',
    'player.fps': 'Tasa de fotogramas',

    // DetectorSelector
    'detector.title': 'Bandas:',
    'detector.all': 'Todas',
    'detector.allHint': 'Coadición de 102 bandas espectrales',
    'detector.D1hint': 'Óptico cercano / estrellas de secuencia principal',
    'detector.D2hint': 'Baja extinción por polvo interestelar',
    'detector.D3hint': 'Sensibilidad a gigantes rojas',
    'detector.D4hint': 'Absorción molecular de hielo de agua (H₂O)',
    'detector.D5hint': 'Monóxido y dióxido de carbono; enanas frías',
    'detector.D6hint': 'Infrarrojo térmico; objetos con temperatura subestelar',
    'detector.rgb': 'Compuesto RGB',
    'detector.rgbHint': 'R: D5/D6, G: D3/D4, B: D1/D2',

    // MetadataPanel
    'meta.loading': 'Cargando...',
    'meta.ra': 'AR',
    'meta.dec': 'Dec',
    'meta.customName': 'Coordenadas personalizadas',
    'meta.customTitle': 'Zona de exploración',
    'meta.customDesc': 'Observación infrarroja centrada en el parche de cielo seleccionado.',
    'meta.qualityExcellent': 'Calidad óptima',
    'meta.qualityZodiacal': 'Luz zodiacal',
    'meta.qualityMsgExcellent': 'Calibración nominal sin artefactos.',
    'meta.qualityMsgZodiacal': 'Leve dispersión zodiacal; corregida.',
    'meta.shareBtn': 'Compartir / Incrustar',
    'meta.band': 'Banda / Detector',
    'meta.wavelength': 'Longitud de onda',
    'meta.exposure': 'Exposición',
    'meta.source': 'Fuente',
    'meta.trajectory': 'Trayectoria',
    'meta.stationary': 'Estacionario (< 1 px)',
    'meta.flags': 'Banderas activas',
    'meta.none': 'Ninguna',

    // SpectrumChart
    'spectrum.title': 'Espectro infrarrojo (0.75 a 5.0 µm)',
    'spectrum.badge': '102 bandas LVF',
    'spectrum.waterIce': 'Hielo de H₂O',
    'spectrum.absorptionAt': 'Absorción detectada en {wl} µm',
    'mol.water_ice': 'Hielo de agua (H₂O)',
    'mol.water_vapor': 'Vapor de agua (H₂O)',
    'mol.methane': 'Metano (CH₄)',
    'mol.co': 'Monóxido de carbono (CO)',
    'mol.co2': 'Dióxido de carbono (CO₂)',

    // AladinOverlay
    'aladin.title': 'SPHEREx vs Gaia DR3 y WISE',
    'aladin.wise': 'WISE 2010',
    'aladin.gaia': 'Gaia DR3',
    'aladin.spherex': 'SPHEREx 2025',
    'aladin.split': 'SPHEREx + Gaia/WISE',
    'aladin.gaiavector': 'Movimiento propio Gaia DR3',

    // EmbedModal
    'embed.title': 'Compartir e incrustar',
    'embed.close': 'Cerrar ventana',
    'embed.desc': 'Enlace directo para compartir o código HTML para incrustar el visor animado de SPHEREx:',
    'embed.directLink': 'Enlace directo:',
    'embed.copyLink': 'Copiar enlace',
    'embed.iframeCode': 'Código para incrustar (<iframe>):',
    'embed.copyIframe': 'Copiar código iframe',
    'embed.linkCopied': 'Enlace copiado al portapapeles',
    'embed.iframeCopied': 'Código iframe copiado al portapapeles',

    // Footer
    'footer.text': 'CepheusLive — Misión SPHEREx de la NASA. Datos científicos proporcionados por el NASA/IPAC Infrared Science Archive (IRSA).',

    // Targets (presets)
    'preset.barnards_star.title': 'Alto movimiento propio',
    'preset.barnards_star.desc': 'Estrella enana roja a 5.96 años luz. Tiene el mayor movimiento propio conocido (10.3 arcsec/año). En modo diferencia se aprecia su desplazamiento neto.',
    'preset.epsilon_indi_b.title': 'Sistema binario de enanas marrones',
    'preset.epsilon_indi_b.desc': 'Par binario subestelar frío (T1 + T6) en órbita mutua con alto movimiento propio (4.7 arcsec/año).',
    'preset.wise_0855.title': 'Enana marrón ultrafría',
    'preset.wise_0855.desc': 'Objeto de tipo Y (~250 K). Su emisión se detecta sobre todo en los detectores de onda larga (D5 y D6 de SPHEREx).',
    'preset.rw_aurigae.title': 'Estrella variable T Tauri',
    'preset.rw_aurigae.desc': 'Estrella joven cuyo brillo varía por oscurecimientos episódicos causados por polvo circunestelar.',
    'preset.r_draconis.title': 'Estrella gigante pulsante',
    'preset.r_draconis.desc': 'Gigante roja variable tipo Mira, con ciclos periódicos de pulsación y variaciones térmicas.'
  },

  /* ═══════════════════════════ FRANÇAIS ═══════════════════════════ */
  fr: {
    // Page
    'page.title': 'CepheusLive — Visualiseur public multi-époque et multi-bande SPHEREx (NASA)',
    'page.description': 'Visualiseur multi-époque et multi-bande de la mission spatiale SPHEREx de la NASA. Analyse temporelle sur 102 bandes infrarouges.',
    'skip.link': "Aller au visualiseur d'images",

    // Header & Settings
    'brand.home': "Accueil CepheusLive",
    'settings.btn': 'Paramètres',
    'settings.open': 'Ouvrir les paramètres',
    'settings.panelAria': 'Panneau des paramètres',
    'settings.title': 'Paramètres',
    'settings.appearance': 'Apparence',
    'settings.colorMode': 'Mode couleur',
    'settings.colorModeDesc': 'Basculer entre sombre et clair',
    'settings.dark': 'Sombre',
    'settings.light': 'Clair',
    'settings.switchToLight': 'Activer le mode clair',
    'settings.switchToDark': 'Activer le mode sombre',
    'settings.toggleTitle': 'Changer de thème',
    'settings.language': 'Langue',
    'settings.languageDesc': "Langue de l'interface",
    'settings.selectLanguage': 'Choisir la langue',

    // Regions (aria)
    'region.search': 'Recherche et objets de test',
    'region.viewer': "Visualiseur temporel d'images SPHEREx",
    'region.inspector': 'Informations et empreinte spectrale',

    // SkySearchBar
    'search.objectLabel': 'Objet de la liste :',
    'search.objectAria': 'Sélectionner un objet de la liste',
    'search.objectPlaceholder': 'Chargement de la liste...',
    'search.coordsLabel': 'Coordonnées (AR, Déc) ou nom :',
    'search.coordsPlaceholder': 'Ex. 269.452, 4.693 ou 17h57m48.5s +04d41m36s',
    'search.coordsAria': "Coordonnées célestes ou nom de l'objet",
    'search.fovLabel': 'Champ de vision (FOV) :',
    'search.loadBtn': 'Charger les données',
    'search.optgroupTargets': 'Objets de référence (SPHEREx)',
    'search.optgroupCustom': 'Personnalisé',
    'search.customOption': 'Coordonnées manuelles...',
    'search.formatError': 'Format non reconnu. Saisissez des coordonnées AR, Déc (ex. 269.452, 4.693) ou cliquez sur la carte des quadrants.',
    'search.sourceLabel': 'Source SPHEREx :',
    'search.sourceAuto': 'SPHEREx Auto (Cache / IRSA)',
    'search.sourceCache': 'SPHEREx FITS local',
    'search.sourceLive': 'SPHEREx IRSA en direct',
    'search.mapTitle': 'Carte Céleste des Quadrants (SPHEREx / Gaia DR3 / WISE)',
    'search.mapHint': 'Cliquez une région du ciel ou choisissez un quadrant (Q1–Q4)',
    'search.quadAll': 'Tout le ciel (0°–360°)',

    // BlinkPlayer
    'player.modeRgb': 'Couleur RVB',
    'player.modeDiff': 'Différence',
    'player.modeBlink': 'Clignotement',
    'player.modeStack': 'Co-addition',
    'player.modeCurtain': 'Rideau',
    'player.stretch': 'Étirement :',
    'player.maskToggle': 'Masque 3σ',
    'player.trajToggle': 'Trajectoire',
    'player.exportGif': 'Exporter GIF',
    'player.loading': 'Traitement des données SPHEREx...',
    'player.speed': 'Vitesse :',
    'player.curtainHandle': 'Faire glisser le rideau',
    'player.epochLoading': 'Chargement...',
    'player.epoch': 'Époque',
    'player.motionTarget': 'Cible détectée',
    'player.labelBarnard': 'Mouvement propre',
    'player.labelWise': 'Émission PIR',
    'player.labelRwAur': 'Variation photométrique',
    'player.labelDefault': 'Cible',
    'player.play': 'Lecture',
    'player.pause': 'Pause',
    'player.playPause': 'Lecture / Pause',
    'player.prevEpoch': 'Époque précédente',
    'player.nextEpoch': 'Époque suivante',
    'player.timeline': 'Chronologie des époques SPHEREx',
    'player.fps': "Fréquence d'images",

    // DetectorSelector
    'detector.title': 'Bandes :',
    'detector.all': 'Toutes',
    'detector.allHint': 'Co-addition de 102 bandes spectrales',
    'detector.D1hint': 'Optique proche / étoiles de la séquence principale',
    'detector.D2hint': 'Faible extinction par la poussière interstellaire',
    'detector.D3hint': 'Sensibilité aux géantes rouges',
    'detector.D4hint': "Absorption moléculaire de la glace d'eau (H₂O)",
    'detector.D5hint': 'Monoxyde et dioxyde de carbone ; naines froides',
    'detector.D6hint': 'Infrarouge thermique ; objets à température sous-stellaire',
    'detector.rgb': 'Composite RVB',
    'detector.rgbHint': 'R : D5/D6, V : D3/D4, B : D1/D2',

    // MetadataPanel
    'meta.loading': 'Chargement...',
    'meta.ra': 'AR',
    'meta.dec': 'Déc',
    'meta.customName': 'Coordonnées personnalisées',
    'meta.customTitle': "Zone d'exploration",
    'meta.customDesc': 'Observation infrarouge centrée sur la zone du ciel sélectionnée.',
    'meta.qualityExcellent': 'Qualité optimale',
    'meta.qualityZodiacal': 'Lumière zodiacale',
    'meta.qualityMsgExcellent': 'Calibration nominale, sans artefacts.',
    'meta.qualityMsgZodiacal': 'Légère diffusion zodiacale ; corrigée.',
    'meta.shareBtn': 'Partager / Intégrer',
    'meta.band': 'Bande / Détecteur',
    'meta.wavelength': 'Longueur d’onde',
    'meta.exposure': 'Exposition',
    'meta.source': 'Source',
    'meta.trajectory': 'Trajectoire',
    'meta.stationary': 'Stationnaire (< 1 px)',
    'meta.flags': 'Drapeaux actifs',
    'meta.none': 'Aucun',

    // SpectrumChart
    'spectrum.title': 'Spectre infrarouge (0.75 à 5.0 µm)',
    'spectrum.badge': '102 bandes LVF',
    'spectrum.waterIce': 'Glace de H₂O',
    'spectrum.absorptionAt': 'Absorption détectée à {wl} µm',
    'mol.water_ice': "Glace d'eau (H₂O)",
    'mol.water_vapor': "Vapeur d'eau (H₂O)",
    'mol.methane': 'Méthane (CH₄)',
    'mol.co': 'Monoxyde de carbone (CO)',
    'mol.co2': 'Dioxyde de carbone (CO₂)',

    // AladinOverlay
    'aladin.title': 'SPHEREx vs Gaia DR3 & WISE',
    'aladin.wise': 'WISE 2010',
    'aladin.gaia': 'Gaia DR3',
    'aladin.spherex': 'SPHEREx 2025',
    'aladin.split': 'SPHEREx + Gaia/WISE',
    'aladin.gaiavector': 'Mouvement propre Gaia DR3',

    // EmbedModal
    'embed.title': 'Partager et intégrer',
    'embed.close': 'Fermer la fenêtre',
    'embed.desc': 'Lien direct à partager ou code HTML pour intégrer le visualiseur animé SPHEREx :',
    'embed.directLink': 'Lien direct :',
    'embed.copyLink': 'Copier le lien',
    'embed.iframeCode': 'Code à intégrer (<iframe>) :',
    'embed.copyIframe': 'Copier le code iframe',
    'embed.linkCopied': 'Lien copié dans le presse-papiers',
    'embed.iframeCopied': 'Code iframe copié dans le presse-papiers',

    // Footer
    'footer.text': "CepheusLive — Mission SPHEREx de la NASA. Données scientifiques fournies par le NASA/IPAC Infrared Science Archive (IRSA).",

    // Targets (presets)
    'preset.barnards_star.title': 'Fort mouvement propre',
    'preset.barnards_star.desc': "Naine rouge à 5.96 années-lumière. Elle possède le plus grand mouvement propre connu (10.3 arcsec/an). En mode différence, on voit son déplacement net.",
    'preset.epsilon_indi_b.title': 'Système binaire de naines brunes',
    'preset.epsilon_indi_b.desc': 'Couple binaire sous-stellaire froid (T1 + T6) en orbite mutuelle, à fort mouvement propre (4.7 arcsec/an).',
    'preset.wise_0855.title': 'Naine brune ultra-froide',
    'preset.wise_0855.desc': "Objet de type Y (~250 K). Son émission est détectable surtout dans les détecteurs de grande longueur d'onde (D5 et D6 de SPHEREx).",
    'preset.rw_aurigae.title': 'Étoile variable T Tauri',
    'preset.rw_aurigae.desc': "Jeune étoile dont la luminosité varie à cause d'obscurcissements épisodiques dus à la poussière circumstellaire.",
    'preset.r_draconis.title': 'Étoile géante pulsante',
    'preset.r_draconis.desc': 'Géante rouge variable de type Mira, avec des cycles de pulsation périodiques et des variations thermiques.'
  }
};

/* ═══════════════════════════ Núcleo ═══════════════════════════ */

function detectInitialLocale() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && translations[saved]) return saved;
  return DEFAULT_LOCALE;
}

class I18n {
  constructor() {
    this._locale = detectInitialLocale();
    document.documentElement.lang = this._locale;
  }

  get locale() {
    return this._locale;
  }

  /** ¿Existe la clave en el idioma activo o en el idioma por defecto? */
  has(key) {
    return Boolean(
      (translations[this._locale] && translations[this._locale][key]) ||
      (translations[DEFAULT_LOCALE] && translations[DEFAULT_LOCALE][key])
    );
  }

  /** Traduce una clave. Soporta {param} en la cadena. */
  t(key, params) {
    let str =
      (translations[this._locale] && translations[this._locale][key]) ||
      (translations[DEFAULT_LOCALE] && translations[DEFAULT_LOCALE][key]) ||
      key;
    if (params) {
      str = str.replace(/\{(\w+)\}/g, (m, name) => (name in params ? params[name] : m));
    }
    return str;
  }

  /** Número con separador decimal del idioma activo (0.75 → 0,75 en fr/es-MX usa punto). */
  num(value, maxDecimals = 1) {
    // es se mantiene con punto decimal (uso en México); fr usa coma.
    const tag = this._locale === 'fr' ? 'fr-FR' : this._locale === 'es' ? 'es-MX' : 'en-US';
    return new Intl.NumberFormat(tag, { maximumFractionDigits: maxDecimals }).format(value);
  }

  /** "Época 1 (junio de 2025)" a partir de la fecha UTC de un frame. */
  epochLabel(frame) {
    const n = (frame.frame_index ?? 0) + 1;
    const date = new Date(frame.observation_date_utc);
    if (isNaN(date)) return `${this.t('player.epoch')} ${n}`;
    const tag = this._locale === 'fr' ? 'fr-FR' : this._locale === 'es' ? 'es-MX' : 'en-US';
    const month = new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
    return `${this.t('player.epoch')} ${n} (${month})`;
  }

  /** Texto traducido de un preset (title | desc | fact); usa los datos del API como respaldo. */
  presetText(preset, field, fallback = '') {
    if (preset && preset.id) {
      const key = `preset.${preset.id}.${field}`;
      if (this.has(key)) return this.t(key);
    }
    return fallback;
  }

  setLocale(locale) {
    if (!translations[locale] || locale === this._locale) return;
    this._locale = locale;
    localStorage.setItem(STORAGE_KEY, locale);
    this.applyToDOM();
    window.dispatchEvent(new CustomEvent('grajx:locale-changed', { detail: { locale } }));
  }

  applyToDOM() {
    document.documentElement.lang = this._locale;
    document.title = this.t('page.title');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', this.t('page.description'));
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', this.t('page.title'));
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', this.t('page.description'));

    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = this.t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', this.t(el.dataset.i18nTitle));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', this.t(el.dataset.i18nAria));
    });
  }
}

export const i18n = new I18n();

// Helpers exportados
export function getLanguage() { return i18n.locale; }
export function setLanguage(lang) { i18n.setLocale(lang); }
export function t(key, params) { return i18n.t(key, params); }
