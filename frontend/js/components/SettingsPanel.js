/**
 * GrajX — SettingsPanel Component
 * Panel de ajustes desplegable en el header con:
 *  - Toggle de tema claro/oscuro
 *  - Selector de idioma (en / es / fr) con botones de tarjeta + bandera SVG
 */

import { i18n } from '../i18n.js';
import { store } from '../state.js';

const THEME_STORAGE_KEY = 'grajx-theme';
const LIGHT_CLASS = 'light-mode';

/* Banderas circulares en SVG (los emojis de bandera no se renderizan en Windows). */
const FLAGS = {
  en: `
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs><clipPath id="flag-clip-en"><circle cx="16" cy="16" r="16"/></clipPath></defs>
      <g clip-path="url(#flag-clip-en)">
        <rect width="32" height="32" fill="#fff"/>
        <g fill="#B22234">
          <rect y="0" width="32" height="3.2"/><rect y="6.4" width="32" height="3.2"/>
          <rect y="12.8" width="32" height="3.2"/><rect y="19.2" width="32" height="3.2"/>
          <rect y="25.6" width="32" height="3.2"/>
        </g>
        <rect width="16" height="16.6" fill="#3C3B6E"/>
        <g fill="#fff">
          <circle cx="3.5" cy="3.5" r=".9"/><circle cx="8" cy="3.5" r=".9"/><circle cx="12.5" cy="3.5" r=".9"/>
          <circle cx="5.7" cy="8.3" r=".9"/><circle cx="10.2" cy="8.3" r=".9"/>
          <circle cx="3.5" cy="13" r=".9"/><circle cx="8" cy="13" r=".9"/><circle cx="12.5" cy="13" r=".9"/>
        </g>
      </g>
    </svg>`,
  es: `
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs><clipPath id="flag-clip-es"><circle cx="16" cy="16" r="16"/></clipPath></defs>
      <g clip-path="url(#flag-clip-es)">
        <rect width="11" height="32" fill="#006847"/>
        <rect x="10.67" width="10.67" height="32" fill="#fff"/>
        <rect x="21.33" width="10.67" height="32" fill="#CE1126"/>
        <circle cx="16" cy="16" r="3.2" fill="#8C6D2E"/>
        <circle cx="16" cy="16" r="2.1" fill="#C9A24B"/>
      </g>
    </svg>`,
  fr: `
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs><clipPath id="flag-clip-fr"><circle cx="16" cy="16" r="16"/></clipPath></defs>
      <g clip-path="url(#flag-clip-fr)">
        <rect width="11" height="32" fill="#0055A4"/>
        <rect x="10.67" width="10.67" height="32" fill="#fff"/>
        <rect x="21.33" width="10.67" height="32" fill="#EF4135"/>
      </g>
    </svg>`
};

// El nombre de cada idioma se muestra SIEMPRE en su propio idioma (convención de selectores de idioma).
const LANGUAGES = [
  { code: 'en', label: 'English',  short: 'EN' },
  { code: 'es', label: 'Español',  short: 'ES' },
  { code: 'fr', label: 'Français', short: 'FR' },
];

export class SettingsPanel {
  constructor() {
    this._open = false;
    this._isLight = false;

    this._btn = document.getElementById('btn-settings');
    this._panel = document.getElementById('settings-panel');
    this._toggle = document.getElementById('theme-toggle');
    this._toggleLabel = document.getElementById('theme-toggle-label');

    if (!this._btn || !this._panel) return;

    this._applyStoredTheme();
    this._attachEvents();

    window.addEventListener('grajx:locale-changed', () => this._onLocaleChanged());
  }

  /* ── Tema ────────────────────────────────────────────── */

  _applyStoredTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light') {
      this._setTheme(true, false);
    } else if (stored === 'dark') {
      this._setTheme(false, false);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this._setTheme(!prefersDark, false);
    }
  }

  _setTheme(isLight, persist = true) {
    this._isLight = isLight;
    document.body.classList.toggle(LIGHT_CLASS, isLight);
    this._refreshThemeLabels();
    if (persist) localStorage.setItem(THEME_STORAGE_KEY, isLight ? 'light' : 'dark');
    store.setState({ theme: isLight ? 'light' : 'dark' });
    window.dispatchEvent(new CustomEvent('grajx:theme-changed', { detail: { isLight } }));
  }

  _refreshThemeLabels() {
    if (this._toggle) {
      this._toggle.setAttribute('aria-checked', this._isLight ? 'true' : 'false');
      // La etiqueta describe la ACCIÓN que ejecutará el botón.
      this._toggle.setAttribute(
        'aria-label',
        this._isLight ? i18n.t('settings.switchToDark') : i18n.t('settings.switchToLight')
      );
    }
    if (this._toggleLabel) {
      this._toggleLabel.textContent = this._isLight ? i18n.t('settings.light') : i18n.t('settings.dark');
    }
  }

  /* ── Panel ───────────────────────────────────────────── */

  _openPanel() {
    this._open = true;
    this._panel.removeAttribute('hidden');
    this._btn.setAttribute('aria-expanded', 'true');
  }

  _closePanel() {
    this._open = false;
    this._panel.setAttribute('hidden', '');
    this._btn.setAttribute('aria-expanded', 'false');
  }

  _togglePanel() {
    this._open ? this._closePanel() : this._openPanel();
  }

  /* ── Idioma ──────────────────────────────────────────── */

  _buildLanguageSection() {
    let section = this._panel.querySelector('#settings-lang-section');
    if (!section) {
      section = document.createElement('div');
      section.id = 'settings-lang-section';
      section.className = 'settings-section settings-lang-section';
      this._panel.appendChild(section);
    }

    section.innerHTML = `
      <span class="settings-section-label">${i18n.t('settings.language')}</span>
      <span class="settings-row-desc">${i18n.t('settings.languageDesc')}</span>

      <div class="lang-selector-group" role="radiogroup" aria-label="${i18n.t('settings.selectLanguage')}">
        ${LANGUAGES.map(lang => {
          const active = lang.code === i18n.locale;
          return `
            <button
              type="button"
              class="lang-btn${active ? ' active' : ''}"
              data-lang="${lang.code}"
              role="radio"
              aria-checked="${active}"
              lang="${lang.code}"
              title="${lang.label}"
            >
              <span class="lang-flag">${FLAGS[lang.code]}</span>
              <span class="lang-text">
                <span class="lang-name">${lang.label}</span>
                <span class="lang-code">${lang.short}</span>
              </span>
              <span class="lang-check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="5 12.5 10 17.5 19 7.5"></polyline>
                </svg>
              </span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    section.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        if (lang === i18n.locale) return;
        i18n.setLocale(lang);
        store.setState({ language: lang });
      });
    });
  }

  _onLocaleChanged() {
    this._refreshThemeLabels();
    this._buildLanguageSection();
    // Mantiene el foco en el idioma elegido tras reconstruir los botones.
    const activeBtn = this._panel.querySelector('.lang-btn.active');
    if (activeBtn && this._open) activeBtn.focus({ preventScroll: true });
  }

  /* ── Eventos ─────────────────────────────────────────── */

  _attachEvents() {
    this._btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._togglePanel();
    });

    if (this._toggle) {
      this._toggle.addEventListener('click', () => {
        this._setTheme(!this._isLight);
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._open) {
        this._closePanel();
        this._btn.focus();
      }
    });

    document.addEventListener('click', (e) => {
      // composedPath() se calcula al despachar el evento: sigue siendo válido aunque el botón
      // pulsado se haya reconstruido (p. ej. al cambiar de idioma) y ya no esté en el DOM.
      const path = e.composedPath();
      const inside = path.includes(this._panel) || path.includes(this._btn);
      if (this._open && !inside) {
        this._closePanel();
      }
    });

    this._buildLanguageSection();
  }
}
