import { i18n } from './i18n.js';

class DialogModule {
    constructor() {
        this.resolveCallback = null;
    }

    show({ titleKey, messageKey, contentHtml = null, confirmKey = 'dialog.ok', cancelKey = null }) {
        return new Promise((resolve) => {
            this.resolveCallback = resolve;

            const overlay = document.getElementById('dialog-overlay');
            const title = document.getElementById('dialog-title');
            const message = document.getElementById('dialog-message');
            const content = document.getElementById('dialog-custom-content');
            const confirmBtn = document.getElementById('dialog-confirm');
            const cancelBtn = document.getElementById('dialog-cancel');

            title.textContent = i18n.t(titleKey);
            message.textContent = i18n.t(messageKey);

            if (contentHtml) {
                content.innerHTML = contentHtml;
                content.style.display = 'block';
                content.querySelectorAll('[data-i18n]').forEach((el) => {
                    el.textContent = i18n.t(el.getAttribute('data-i18n'));
                });
            } else {
                content.innerHTML = '';
                content.style.display = 'none';
            }

            confirmBtn.querySelector('span').textContent = i18n.t(confirmKey);

            if (cancelKey) {
                cancelBtn.style.display = 'flex';
                cancelBtn.querySelector('span').textContent = i18n.t(cancelKey);
            } else {
                cancelBtn.style.display = 'none';
            }

            overlay.style.display = 'flex';
        });
    }

    confirm(titleKey, messageKey) {
        return this.show({
            titleKey,
            messageKey,
            confirmKey: 'dialog.confirm',
            cancelKey: 'dialog.cancel',
        });
    }

    alert(titleKey, messageKey, contentHtml = null) {
        return this.show({
            titleKey,
            messageKey,
            contentHtml,
            confirmKey: 'dialog.ok',
        });
    }

    handleConfirm() {
        this.close();
        if (this.resolveCallback) {
            this.resolveCallback(true);
            this.resolveCallback = null;
        }
    }

    handleCancel() {
        this.close();
        if (this.resolveCallback) {
            this.resolveCallback(false);
            this.resolveCallback = null;
        }
    }

    close() {
        const overlay = document.getElementById('dialog-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

export const dialogModule = new DialogModule();
