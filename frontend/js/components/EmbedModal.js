/**
 * GrajX — EmbedModal Component
 * Modal accesible para Compartir URL e Incrustar visor mediante iframe.
 */

import { store } from '../state.js';

export class EmbedModal {
  constructor(container) {
    this.container = container;
    this.init();
  }

  init() {
    this.render();
    this.attachEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="modal-backdrop" id="embed-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-embed-title">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 id="modal-embed-title">Compartir e Incrustar</h3>
            <button type="button" class="modal-close-btn" id="btn-close-modal" aria-label="Cerrar modal">✕</button>
          </div>

          <div class="modal-body">
            <p style="font-size: 13px; color: var(--color-text-secondary);">
              Enlace directo reproducible o código HTML para incrustar el visor animado de SPHEREx:
            </p>

            <label style="font-size: 13px; font-weight: 600; color: var(--color-text-primary);">
              Enlace directo:
            </label>
            <div class="code-snippet-box" id="shareable-url-box"></div>
            <button type="button" class="btn-secondary" id="btn-copy-url">
              Copiar Enlace
            </button>

            <label style="font-size: 13px; font-weight: 600; color: var(--color-text-primary); margin-top: 6px;">
              Código para incrustar (&lt;iframe&gt;):
            </label>
            <div class="code-snippet-box" id="iframe-code-box"></div>
            <button type="button" class="btn-secondary" id="btn-copy-iframe">
              Copiar Código Iframe
            </button>
          </div>
        </div>
      </div>

      <div class="toast-container" id="toast-container"></div>
    `;
  }

  open() {
    const backdrop = this.container.querySelector('#embed-modal-backdrop');
    const urlBox = this.container.querySelector('#shareable-url-box');
    const iframeBox = this.container.querySelector('#iframe-code-box');

    const currentUrl = window.location.href;
    const embedUrl = new URL(currentUrl);
    embedUrl.searchParams.set('embed', '1');

    urlBox.textContent = currentUrl;
    iframeBox.textContent = `<iframe src="${embedUrl.toString()}" width="100%" height="600" frameborder="0" allowfullscreen title="GrajX SPHEREx Viewer"></iframe>`;

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
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, 2000);
  }

  attachEvents() {
    window.addEventListener('grajx:open-embed-modal', () => this.open());

    const btnClose = this.container.querySelector('#btn-close-modal');
    const backdrop = this.container.querySelector('#embed-modal-backdrop');
    const btnCopyUrl = this.container.querySelector('#btn-copy-url');
    const btnCopyIframe = this.container.querySelector('#btn-copy-iframe');

    btnClose.addEventListener('click', () => this.close());
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    btnCopyUrl.addEventListener('click', () => {
      const text = this.container.querySelector('#shareable-url-box').textContent;
      navigator.clipboard.writeText(text);
      this.showToast("Enlace copiado al portapapeles");
    });

    btnCopyIframe.addEventListener('click', () => {
      const text = this.container.querySelector('#iframe-code-box').textContent;
      navigator.clipboard.writeText(text);
      this.showToast("Código iframe copiado al portapapeles");
    });
  }
}
