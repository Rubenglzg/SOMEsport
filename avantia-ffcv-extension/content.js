// Script de contenido para FFCV / Novanet / RFEF

const FIELDS_MAP = {
  nombre: 'input[name*="nombre"], input[id*="nombre"], input[placeholder*="Nombre"]',
  apellidos: 'input[name*="apellido"], input[id*="apellido"], input[placeholder*="Apellido"]',
  dni: 'input[name*="dni"], input[id*="nif"], input[id*="documento"], input[placeholder*="DNI"]',
  email: 'input[type="email"], input[name*="email"], input[id*="correo"]',
  telefono: 'input[type="tel"], input[name*="tfno"], input[id*="telefono"]',
  nacimiento: 'input[type="date"], input[name*="nacimiento"], input[id*="fecha"]'
};

function injectAutofillButton() {
  // Solo inyectar si estamos en un formulario y no se ha inyectado aún
  if (document.getElementById('avantia-copilot-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'avantia-copilot-btn';
  btn.type = 'button';
  btn.innerHTML = `
    <span style="font-size: 14px; margin-right: 6px;">⚡</span>
    <span>Autocompletar con Avantia</span>
  `;
  
  // Estilo flotante premium
  btn.style.position = 'fixed';
  btn.style.bottom = '20px';
  btn.style.right = '20px';
  btn.style.zIndex = '99999';
  btn.style.backgroundColor = '#4f46e5';
  btn.style.color = '#ffffff';
  btn.style.border = '1px solid rgba(255,255,255,0.2)';
  btn.style.padding = '12px 18px';
  btn.style.borderRadius = '14px';
  btn.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  btn.style.fontSize = '13px';
  btn.style.fontWeight = '700';
  btn.style.cursor = 'pointer';
  btn.style.boxShadow = '0 10px 25px rgba(79,70,229,0.4)';
  btn.style.transition = 'all 0.2s ease-in-out';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';

  btn.onmouseover = () => {
    btn.style.transform = 'translateY(-2px)';
    btn.style.backgroundColor = '#4338ca';
  };
  btn.onmouseout = () => {
    btn.style.transform = 'translateY(0)';
    btn.style.backgroundColor = '#4f46e5';
  };

  btn.addEventListener('click', async () => {
    try {
      // 1. Intentar leer de Chrome Local Storage primero (flujo integrado)
      chrome.storage.local.get('selectedPlayer', async (result) => {
        let data = result.selectedPlayer;
        
        // 2. Si no hay jugador seleccionado en la extensión, intentar leer del portapapeles (flujo manual)
        if (!data) {
          try {
            const text = await navigator.clipboard.readText();
            data = JSON.parse(text);
          } catch (clipErr) {
            console.warn("No active player in storage and failed to read from clipboard:", clipErr);
          }
        }

        if (data && data._isAvantiaExport) {
          let filledCount = 0;
          
          // Rellenar campos del formulario
          Object.keys(FIELDS_MAP).forEach(key => {
            const selector = FIELDS_MAP[key];
            const input = document.querySelector(selector);
            if (input && data[key]) {
              input.value = data[key];
              // Disparar eventos para que el framework de Novanet (Angular/React) valide el input
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              filledCount++;
            }
          });

          if (filledCount > 0) {
            showNotification(`¡Ficha de ${data.nombre} inyectada correctamente! (${filledCount} campos rellenados)`, 'success');
          } else {
            showNotification('No se encontraron los campos del formulario en esta página.', 'warning');
          }
        } else {
          showNotification('Ningún jugador seleccionado en la extensión ni en el portapapeles.', 'error');
        }
      });
    } catch (err) {
      console.error(err);
      showNotification('Error al autocompletar la ficha del jugador.', 'error');
    }
  });

  document.body.appendChild(btn);
}

function showNotification(msg, type = 'success') {
  const oldNotification = document.getElementById('avantia-notif');
  if (oldNotification) oldNotification.remove();

  const notif = document.createElement('div');
  notif.id = 'avantia-notif';
  notif.innerText = msg;
  notif.style.position = 'fixed';
  notif.style.bottom = '85px';
  notif.style.right = '20px';
  notif.style.zIndex = '99999';
  notif.style.padding = '10px 16px';
  notif.style.borderRadius = '10px';
  notif.style.fontSize = '12px';
  notif.style.fontWeight = '600';
  notif.style.color = '#ffffff';
  notif.style.fontFamily = 'system-ui, sans-serif';
  notif.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  
  if (type === 'success') notif.style.backgroundColor = '#10b981';
  else if (type === 'warning') notif.style.backgroundColor = '#f59e0b';
  else notif.style.backgroundColor = '#ef4444';

  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 4000);
}

// Ejecutar inyección al cargar la página
window.addEventListener('load', injectAutofillButton);
// O si es una SPA, comprobar periódicamente
setInterval(injectAutofillButton, 2000);
