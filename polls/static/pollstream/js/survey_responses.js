document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const root = document.getElementById('survey-responses-root');
  if (!root) return;

  const surveyUrl = root.getAttribute('data-survey-url') || '';

  // QR code (QRCode global from CDN)
  const qrcodeContainer = document.getElementById('qrcode');
  if (qrcodeContainer && typeof QRCode !== 'undefined' && surveyUrl) {
    try {
      new QRCode(qrcodeContainer, {
        text: surveyUrl,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
    } catch (e) {
      // ignore
    }
  }

  async function copyLink() {
    const linkInput = document.getElementById('surveyLinkInput');
    const val = linkInput ? linkInput.value : surveyUrl;
    if (!val) return;

    try {
      await navigator.clipboard.writeText(val);
      return true;
    } catch (e) {
      try {
        if (linkInput) {
          linkInput.focus();
          linkInput.select();
        }
        const ok = document.execCommand('copy');
        return ok;
      } catch (e2) {
        return false;
      }
    }
  }

  function wireCopyButton(btnId, textId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    const textEl = textId ? document.getElementById(textId) : null;
    const fallbackTextEl = textEl || btn.querySelector('span');
    const originalText = fallbackTextEl ? fallbackTextEl.textContent : '';

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const ok = await copyLink();
      if (!fallbackTextEl) return;

      if (ok) {
        fallbackTextEl.textContent = 'Скопировано!';
        setTimeout(() => {
          fallbackTextEl.textContent = originalText;
        }, 1200);
      } else {
        alert('Не удалось скопировать ссылку');
      }
    });
  }

  wireCopyButton('copyLinkBtnTop', 'copyBtnTextTop');
  wireCopyButton('copyLinkBtn', 'copyBtnText');

  // Download QR Code
  const downloadQRBtn = document.getElementById('downloadQRBtn');
  if (downloadQRBtn && qrcodeContainer) {
    downloadQRBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const canvas = qrcodeContainer.querySelector('canvas');
      if (!canvas) return;
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = root.getAttribute('data-qr-filename') || 'survey-qrcode.png';
      link.click();
    });
  }
});

