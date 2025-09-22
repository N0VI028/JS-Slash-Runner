import { createApp } from 'vue';
import QuickButton from '@/panel/toolbox/prompt_viewer/QuickButton.vue';

function addQuickButton(): void {
  const container = document.getElementById('extensionsMenu');
  if (container) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'extension_container';
    container.appendChild(buttonContainer);

    const app = createApp(QuickButton);
    app.mount(buttonContainer);
  }
}

export { addQuickButton };
