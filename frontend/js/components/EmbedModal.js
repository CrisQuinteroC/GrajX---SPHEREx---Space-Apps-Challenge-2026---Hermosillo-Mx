/**
 * GrajX — EmbedModal Component
 * Modal accesible para Compartir URL e Incrustar visor mediante iframe.
 */

import { i18n } from '../i18n.js';
import { store } from '../state.js';

export class EmbedModal {
  constructor(container) {
    this.container = container;
    this.init();
  }

  init() {
    this.render();
    this.attachGlobalEvents();
    this.attachDomEvents();
  }

  render() {
    const wasOpen = this.container.querySelector('#embed-modal-backdrop')?.classList.contains('open');
    const prevUrl = this.container.querySelector('#shareable-url-box')?.textContent || '';
    const prevIframe = this.container.querySelector('#iframe-code-box')?.textContent || '';

    this.container.innerHTML = `
      <div class="modal-backdrop${wasOpen ? ' open' : ''}" id="embed-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-embed-title">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 id="modal-embed-title">${i18n.t('embed.title')}</h3>
            <button type="button" class="modal-close-btn" id="btn-close-modal" aria-label="${i18n.t('embed.close')}">✕</button>
          </div>

          <div class="modal-body">
            <p style="font-size: 13px; color: var(--color-text-secondary);">
              ${i18n.t('embed.desc')}
            </p>

            <label style="font-size: 13px; font-weight: 600; color: var(--color-text-primary);">
              ${i18n.t('embed.directLink')}
            </label>
            <div class="code-snippet-box" id="shareable-url-box"></div>
            <button type="button" class="btn-secondary" id="btn-copy-url">
              ${i18n.t('embed.copyLink')}
            </button>

            <label style="font-size: 13px; font-weight: 600; color: var(--color-text-primary); margin-top: 6px;">
              ${i18n.t('embed.iframeCode').replace('<', '&lt;').replace('>', '&gt;')}
            </label>
            <div class="code-snippet-box" id="iframe-code-box"></div>
            <button type="button" class="btn-secondary" id="btn-copy-iframe">
              ${i18n.t('embed.copyIframe')}
            </button>
          </div>
        </div>
      </div>

      <div class="toast-container" id="toast-container"></div>
    `;

    // Conserva el contenido si el modal estaba abierto al cambiar de idioma
    if (wasOpen) {
      this.container.querySelector('#shareable-url-box').textContent = prevUrl;
      this.container.querySelector('#iframe-code-box').textContent = prevIframe;
    }
  }

  refreshSnippets() {
    const urlBox = this.container.querySelector('#shareable-url-box');
    const iframeBox = this.container.querySelector('#iframe-code-box');
    if (!urlBox || !iframeBox) return;

    const currentUrl = window.location.href;
    const embedUrl = new URL(currentUrl);
    embedUrl.searchParams.set('embed', '1');

    urlBox.textContent = currentUrl;
    iframeBox.textContent = `<iframe src="${embedUrl.toString()}" width="100%" height="600" frameborder="0" allowfullscreen title="GrajX SPHEREx Viewer"></iframe>`;
  }

  open() {
    const backdrop = this.container.querySelector('#embed-modal-backdrop');
    this.refreshSnippets();
    backdrop.classList.add('open');
  }

  close() {
    const backdrop = this.container.querySelector('#embed-modal-backdrop');
    backdrop.classList.remove('open');
  }

  showToast(message) {
    const container = this.container.querySelector('#toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    const span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, 2000);
  }

  /** Listeners en window y store: se registran una sola vez. */
  attachGlobalEvents() {
    window.addEventListener('grajx:open-embed-modal', () => this.open());

    const syncIfOpen = () => {
      const backdrop = this.container.querySelector('#embed-modal-backdrop');
      if (backdrop && backdrop.classList.contains('open')) {
        this.refreshSnippets();
      }
    };

    window.addEventListener('grajx:url-updated', syncIfOpen);
    store.subscribe('*', syncIfOpen);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    window.addEventListener('grajx:locale-changed', () => {
      this.render();
      this.attachDomEvents();
      syncIfOpen();
    });
  }

  /** Listeners sobre el DOM del modal: se vuelven a ligar tras cada render. */
  attachDomEvents() {
    const btnClose = this.container.querySelector('#btn-close-modal');
    const backdrop = this.container.querySelector('#embed-modal-backdrop');
    const btnCopyUrl = this.container.querySelector('#btn-copy-url');
    const btnCopyIframe = this.container.querySelector('#btn-copy-iframe');

    btnClose.addEventListener('click', () => this.close());
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    btnCopyUrl.addEventListener('click', () => {
      const text = this.container.querySelector('#shareable-url-box').textContent;
      navigator.clipboard.writeText(text);
      this.showToast(i18n.t('embed.linkCopied'));
    });

    btnCopyIframe.addEventListener('click', () => {
      const text = this.container.querySelector('#iframe-code-box').textContent;
      navigator.clipboard.writeText(text);
      this.showToast(i18n.t('embed.iframeCopied'));
    });
  }
}