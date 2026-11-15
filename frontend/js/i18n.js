/**
 * GrajX — Sistema de Internacionalización (i18n)
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
    'page.title': 'GrajX — Public Multi-Epoch & Multi-Band SPHEREx Viewer (NASA)',
    'page.description': 'Multi-epoch, multi-band viewer for NASA’s SPHEREx space mission. Temporal analysis across 102 infrared bands.',
    'skip.link': 'Skip to image viewer',

    // Header & Settings
    'brand.subtitle': 'Space Apps Challenge Hermosillo',
    'brand.home': 'GrajX Home',
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
    'search.coordsPlaceholder': 'E.g. 269.452, 4.693 or name...',
    'search.coordsAria': 'Sky coordinates or object name',
    'search.fovLabel': 'Field of view (FOV):',
    'search.loadBtn': 'Load data',
    'search.optgroupTargets': 'Available objects',
    'search.optgroupCustom': 'Custom',
    'search.customOption': 'Manual coordinates...',
    'search.formatError': 'Unrecognized format. Select from the list or type numeric coordinates (e.g. 269.45, 4.69).',

    // BlinkPlayer
    'player.modeDiff': 'Difference',
    'player.modeBlink': 'Blink',
    'player.modeStack': 'Co-add',
    'player.modeCurtain': 'Curtain',
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
    'meta.customFact': 'SPHEREx visits this point every 6 months, building a full-sky spectral map.',
    'meta.qualityExcellent': 'Optimal quality',
    'meta.qualityZodiacal': 'Zodiacal light',
    'meta.qualityMsgExcellent': 'Nominal calibration, no artifacts.',
    'meta.qualityMsgZodiacal': 'Slight zodiacal scattering; corrected.',
    'meta.shareBtn': 'Share / Embed',

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
    'spectrum.interp.cold_body': 'Ultra-cold substellar body (~250 K). The dip at 3.05 µm indicates absorption by water-ice clouds.',
    'spectrum.interp.continuous': 'Continuous infrared spectrum with circumstellar molecular absorption lines.',

    // AladinOverlay
    'aladin.title': 'Historical baseline (15 years)',
    'aladin.wise': 'WISE 2010',
    'aladin.spherex': 'SPHEREx 2025',
    'aladin.split': 'Overlay',
    'aladin.footnote': 'Temporal comparison between the 2010 AllWISE catalog and recent SPHEREx 2025 observations.',
    'aladin.gaiavector': 'Gaia DR3 vector (10.3″/yr)',

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
    'footer.text': 'GrajX — NASA SPHEREx Mission. Scientific data provided by NASA/IPAC Infrared Science Archive (IRSA).',

    // Targets (presets)
    'preset.barnards_star.title': 'High proper motion',
    'preset.barnards_star.desc': 'Red dwarf 5.96 light-years away. It has the largest known proper motion (10.3 arcsec/yr). Difference mode shows its net displacement.',
    'preset.barnards_star.fact': 'Its accumulated displacement is noticeable over just a few years.',
    'preset.epsilon_indi_b.title': 'Brown dwarf binary system',
    'preset.epsilon_indi_b.desc': 'Cold substellar binary pair (T1 + T6) orbiting each other with high proper motion (4.7 arcsec/yr).',
    'preset.epsilon_indi_b.fact': 'Cold bodies are detected with the greatest contrast at near-infrared wavelengths.',
    'preset.wise_0855.title': 'Ultra-cold brown dwarf',
    'preset.wise_0855.desc': 'Y-type object (~250 K). Emission is mainly detectable in the long-wavelength detectors (SPHEREx D5 and D6).',
    'preset.wise_0855.fact': 'It shows the characteristic absorption of water-ice clouds at 3.05 micrometers.',
    'preset.rw_aurigae.title': 'T Tauri variable star',
    'preset.rw_aurigae.desc': 'Young star whose brightness varies as circumstellar dust episodically dims it.',
    'preset.rw_aurigae.fact': 'Its position stays fixed while its flux varies noticeably between epochs.',
    'preset.r_draconis.title': 'Pulsating giant star',
    'preset.r_draconis.desc': 'Mira-type variable red giant with periodic pulsation cycles and thermal variations.',
    'preset.r_draconis.fact': 'Its expanding and contracting atmosphere shows strong molecular signatures of water vapor and carbon monoxide.'
  },

  /* ═══════════════════════════ ESPAÑOL ═══════════════════════════ */
  es: {
    // Page
    'page.title': 'GrajX — Visor público multiépoca y multibanda de SPHEREx (NASA)',
    'page.description': 'Visualizador multiépoca y multibanda de la misión espacial SPHEREx de la NASA. Análisis temporal en 102 bandas infrarrojas.',
    'skip.link': 'Saltar al visor de imágenes',

    // Header & Settings
    'brand.subtitle': 'Space Apps Challenge Hermosillo',
    'brand.home': 'Inicio de GrajX',
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
    'search.coordsPlaceholder': 'Ej. 269.452, 4.693 o nombre...',
    'search.coordsAria': 'Coordenadas celestes o nombre del objeto',
    'search.fovLabel': 'Campo de visión (FOV):',
    'search.loadBtn': 'Cargar datos',
    'search.optgroupTargets': 'Objetos disponibles',
    'search.optgroupCustom': 'Personalizado',
    'search.customOption': 'Coordenadas manuales...',
    'search.formatError': 'Formato no reconocido. Selecciona de la lista o escribe coordenadas numéricas (ej. 269.45, 4.69).',

    // BlinkPlayer
    'player.modeDiff': 'Diferencia',
    'player.modeBlink': 'Parpadeo',
    'player.modeStack': 'Coadición',
    'player.modeCurtain': 'Cortina',
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
    'meta.customFact': 'SPHEREx visita este punto cada 6 meses y va construyendo un mapa espectral de todo el cielo.',
    'meta.qualityExcellent': 'Calidad óptima',
    'meta.qualityZodiacal': 'Luz zodiacal',
    'meta.qualityMsgExcellent': 'Calibración nominal sin artefactos.',
    'meta.qualityMsgZodiacal': 'Leve dispersión zodiacal; corregida.',
    'meta.shareBtn': 'Compartir / Incrustar',

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
    'spectrum.interp.cold_body': 'Cuerpo subestelar ultrafrío (~250 K). La depresión en 3.05 µm indica absorción por nubes de hielo de agua.',
    'spectrum.interp.continuous': 'Espectro infrarrojo continuo con líneas de absorción molecular circunestelares.',

    // AladinOverlay
    'aladin.title': 'Línea base histórica (15 años)',
    'aladin.wise': 'WISE 2010',
    'aladin.spherex': 'SPHEREx 2025',
    'aladin.split': 'Superposición',
    'aladin.footnote': 'Comparación temporal entre el catálogo AllWISE de 2010 y las observaciones recientes de SPHEREx 2025.',
    'aladin.gaiavector': 'Vector Gaia DR3 (10.3″/año)',

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
    'footer.text': 'GrajX — Misión SPHEREx de la NASA. Datos científicos proporcionados por el NASA/IPAC Infrared Science Archive (IRSA).',

    // Targets (presets)
    'preset.barnards_star.title': 'Alto movimiento propio',
    'preset.barnards_star.desc': 'Estrella enana roja a 5.96 años luz. Tiene el mayor movimiento propio conocido (10.3 arcsec/año). En modo diferencia se aprecia su desplazamiento neto.',
    'preset.barnards_star.fact': 'Su desplazamiento acumulado es perceptible en escalas de pocos años.',
    'preset.epsilon_indi_b.title': 'Sistema binario de enanas marrones',
    'preset.epsilon_indi_b.desc': 'Par binario subestelar frío (T1 + T6) en órbita mutua con alto movimiento propio (4.7 arcsec/año).',
    'preset.epsilon_indi_b.fact': 'Los cuerpos fríos se detectan con mayor contraste en el infrarrojo cercano.',
    'preset.wise_0855.title': 'Enana marrón ultrafría',
    'preset.wise_0855.desc': 'Objeto de tipo Y (~250 K). Su emisión se detecta sobre todo en los detectores de onda larga (D5 y D6 de SPHEREx).',
    'preset.wise_0855.fact': 'Presenta la absorción característica de nubes de hielo de agua en 3.05 micrómetros.',
    'preset.rw_aurigae.title': 'Estrella variable T Tauri',
    'preset.rw_aurigae.desc': 'Estrella joven cuyo brillo varía por oscurecimientos episódicos causados por polvo circunestelar.',
    'preset.rw_aurigae.fact': 'Mantiene su posición fija mientras su flujo varía notablemente entre épocas.',
    'preset.r_draconis.title': 'Estrella gigante pulsante',
    'preset.r_draconis.desc': 'Gigante roja variable tipo Mira, con ciclos periódicos de pulsación y variaciones térmicas.',
    'preset.r_draconis.fact': 'Su atmósfera, que se expande y se contrae, muestra marcadas firmas moleculares de vapor de agua y monóxido de carbono.'
  },

  /* ═══════════════════════════ FRANÇAIS ═══════════════════════════ */
  fr: {
    // Page
    'page.title': 'GrajX — Visualiseur public multi-époque et multi-bande SPHEREx (NASA)',
    'page.description': 'Visualiseur multi-époque et multi-bande de la mission spatiale SPHEREx de la NASA. Analyse temporelle sur 102 bandes infrarouges.',
    'skip.link': "Aller au visualiseur d'images",

    // Header & Settings
    'brand.subtitle': 'Space Apps Challenge Hermosillo',
    'brand.home': "Accueil GrajX",
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
    'search.coordsPlaceholder': 'Ex. 269.452, 4.693 ou nom...',
    'search.coordsAria': "Coordonnées célestes ou nom de l'objet",
    'search.fovLabel': 'Champ de vision (FOV) :',
    'search.loadBtn': 'Charger les données',
    'search.optgroupTargets': 'Objets disponibles',
    'search.optgroupCustom': 'Personnalisé',
    'search.customOption': 'Coordonnées manuelles...',
    'search.formatError': 'Format non reconnu. Sélectionnez dans la liste ou saisissez des coordonnées numériques (ex. 269.45, 4.69).',

    // BlinkPlayer
    'player.modeDiff': 'Différence',
    'player.modeBlink': 'Clignotement',
    'player.modeStack': 'Co-addition',
    'player.modeCurtain': 'Rideau',
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
    'meta.customFact': 'SPHEREx revient sur ce point tous les 6 mois et construit ainsi une carte spectrale de tout le ciel.',
    'meta.qualityExcellent': 'Qualité optimale',
    'meta.qualityZodiacal': 'Lumière zodiacale',
    'meta.qualityMsgExcellent': 'Calibration nominale, sans artefacts.',
    'meta.qualityMsgZodiacal': 'Légère diffusion zodiacale ; corrigée.',
    'meta.shareBtn': 'Partager / Intégrer',

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
    'spectrum.interp.cold_body': "Corps sous-stellaire ultra-froid (~250 K). Le creux à 3.05 µm indique une absorption par des nuages de glace d'eau.",
    'spectrum.interp.continuous': "Spectre infrarouge continu avec des raies d'absorption moléculaire circumstellaires.",

    // AladinOverlay
    'aladin.title': 'Référence historique (15 ans)',
    'aladin.wise': 'WISE 2010',
    'aladin.spherex': 'SPHEREx 2025',
    'aladin.split': 'Superposition',
    'aladin.footnote': 'Comparaison temporelle entre le catalogue AllWISE de 2010 et les observations récentes de SPHEREx 2025.',
    'aladin.gaiavector': 'Vecteur Gaia DR3 (10.3″/an)',

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
    'footer.text': "GrajX — Mission SPHEREx de la NASA. Données scientifiques fournies par le NASA/IPAC Infrared Science Archive (IRSA).",

    // Targets (presets)
    'preset.barnards_star.title': 'Fort mouvement propre',
    'preset.barnards_star.desc': "Naine rouge à 5.96 années-lumière. Elle possède le plus grand mouvement propre connu (10.3 arcsec/an). En mode différence, on voit son déplacement net.",
    'preset.barnards_star.fact': 'Son déplacement cumulé est perceptible en quelques années seulement.',
    'preset.epsilon_indi_b.title': 'Système binaire de naines brunes',
    'preset.epsilon_indi_b.desc': 'Couple binaire sous-stellaire froid (T1 + T6) en orbite mutuelle, à fort mouvement propre (4.7 arcsec/an).',
    'preset.epsilon_indi_b.fact': 'Les corps froids sont détectés avec le plus fort contraste dans le proche infrarouge.',
    'preset.wise_0855.title': 'Naine brune ultra-froide',
    'preset.wise_0855.desc': "Objet de type Y (~250 K). Son émission est détectable surtout dans les détecteurs de grande longueur d'onde (D5 et D6 de SPHEREx).",
    'preset.wise_0855.fact': "Elle présente l'absorption caractéristique des nuages de glace d'eau à 3.05 micromètres.",
    'preset.rw_aurigae.title': 'Étoile variable T Tauri',
    'preset.rw_aurigae.desc': "Jeune étoile dont la luminosité varie à cause d'obscurcissements épisodiques dus à la poussière circumstellaire.",
    'preset.rw_aurigae.fact': "Sa position reste fixe tandis que son flux varie nettement d'une époque à l'autre.",
    'preset.r_draconis.title': 'Étoile géante pulsante',
    'preset.r_draconis.desc': 'Géante rouge variable de type Mira, avec des cycles de pulsation périodiques et des variations thermiques.',
    'preset.r_draconis.fact': "Son atmosphère, qui se dilate et se contracte, montre de fortes signatures moléculaires de vapeur d'eau et de monoxyde de carbone."
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
