// fix-test-panel.js - Corrección temporal para mostrar el panel de pruebas correctamente

(function() {
  console.log('Aplicando correcciones al panel de pruebas...');
  
  // Función para corregir el panel de pruebas
  function fixTestPanel() {
    // 1. Hacer visible el switch de modo pruebas
    const switchContainer = document.querySelector('.form-check.form-switch');
    if (switchContainer && switchContainer.querySelector('#modo-pruebas-activo')) {
      switchContainer.style.display = 'block';
    }
    
    // 2. Hacer visibles todos los botones de prueba
    const testButtons = document.querySelectorAll('.test-btn-write, .test-btn-toggle, .test-btn-read');
    testButtons.forEach(btn => {
      btn.style.display = 'inline-block';
    });
    
    // 3. Asegurar que la tabla de pruebas tenga el formato correcto
    const testTable = document.querySelector('#panel-pruebas-coils table');
    if (testTable) {
      // Actualizar encabezados si es necesario
      const headers = testTable.querySelector('thead tr');
      if (headers && headers.children.length < 4) {
        headers.innerHTML = `
          <th>Función</th>
          <th>Dirección</th>
          <th>Estado Actual</th>
          <th>Acciones</th>
        `;
      }
    }
    
    // 4. Corregir el botón de probar conexión
    const btnProbar = document.getElementById('btn-probar-conexion');
    if (btnProbar) {
      btnProbar.disabled = false; // Habilitarlo siempre
      
      // Si no tiene el evento click correcto, agregarlo
      if (!btnProbar.hasAttribute('data-fixed')) {
        btnProbar.setAttribute('data-fixed', 'true');
        btnProbar.addEventListener('click', function(e) {
          e.preventDefault();
          if (window.pilonaTestPanel && window.pilonaTestPanel.probarConexion) {
            window.pilonaTestPanel.probarConexion();
          } else if (window.probarConexion) {
            window.probarConexion();
          } else {
            console.error('No se encontró la función probarConexion');
          }
        });
      }
    }
    
    // 5. Agregar botones faltantes si no existen
    const rows = document.querySelectorAll('#panel-pruebas-coils tbody tr');
    rows.forEach(row => {
      const coilType = row.querySelector('.test-btn-write, .test-btn-toggle')?.getAttribute('data-coil');
      if (coilType) {
        const actionCell = row.cells[3];
        if (actionCell) {
          // Verificar si faltan botones
          let hasWriteBtn = actionCell.querySelector('.test-btn-write');
          let hasToggleBtn = actionCell.querySelector('.test-btn-toggle');
          
          // Para estado y bloqueo, usar toggle
          if (['estado', 'bloqueo'].includes(coilType) && !hasToggleBtn) {
            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = `btn btn-sm btn-outline-${coilType === 'estado' ? 'info' : 'warning'} test-btn-toggle`;
            toggleBtn.setAttribute('data-coil', coilType);
            toggleBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Toggle';
            toggleBtn.disabled = true;
            actionCell.appendChild(toggleBtn);
          }
          
          // Para otros, usar write
          if (!['estado', 'bloqueo'].includes(coilType) && !hasWriteBtn) {
            const writeBtn = document.createElement('button');
            writeBtn.type = 'button';
            const colorClass = {
              'subir': 'danger',
              'bajar': 'success',
              'puntual': 'primary'
            }[coilType] || 'secondary';
            writeBtn.className = `btn btn-sm btn-outline-${colorClass} test-btn-write`;
            writeBtn.setAttribute('data-coil', coilType);
            writeBtn.innerHTML = '<i class="fas fa-pen-square"></i> Escribir 1';
            writeBtn.disabled = true;
            actionCell.appendChild(writeBtn);
          }
        }
      }
    });
    
    // 6. Agregar el botón "Leer Todos" si no existe
    if (!document.getElementById('test-btn-read-all')) {
      const container = document.querySelector('#panel-pruebas-coils .row.mt-3 .col-md-6');
      if (container) {
        const btnReadAll = document.createElement('button');
        btnReadAll.type = 'button';
        btnReadAll.className = 'btn btn-sm btn-outline-secondary';
        btnReadAll.id = 'test-btn-read-all';
        btnReadAll.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Leer Todos los Estados';
        btnReadAll.disabled = true;
        
        const divGrid = document.createElement('div');
        divGrid.className = 'd-grid';
        divGrid.appendChild(btnReadAll);
        
        container.innerHTML = '';
        container.appendChild(divGrid);
      }
    }
    
    // 7. Asegurar que todos los elementos necesarios estén visibles
    const elementsToShow = [
      '#panel-pruebas-coils',
      '.test-btn-write',
      '.test-btn-toggle',
      '.test-btn-read',
      '#test-btn-read-all',
      '.form-check.form-switch'
    ];
    
    elementsToShow.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.style.display === 'none') {
          el.style.display = '';
        }
      });
    });
  }
  
  // Aplicar correcciones cuando se abre el modal
  document.addEventListener('shown.bs.modal', function(e) {
    if (e.target.id === 'modal-pilona') {
      console.log('Modal de pilona abierto, aplicando correcciones...');
      setTimeout(fixTestPanel, 100); // Pequeño delay para asegurar que todo esté cargado
    }
  });
  
  // También aplicar correcciones si el modal ya está abierto
  if (document.querySelector('#modal-pilona.show')) {
    fixTestPanel();
  }
  
  // Exponer la función globalmente por si se necesita
  window.fixTestPanel = fixTestPanel;
  
  console.log('Correcciones del panel de pruebas cargadas');
})();
