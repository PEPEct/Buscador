const state = {
  data: [],
  legends: {},
  filtered: [],
  sortBy: 'ubicacion',
};

const els = {
  codigoInput: document.getElementById('codigoInput'),
  descripcionInput: document.getElementById('descripcionInput'),
  ubicacionInput: document.getElementById('ubicacionInput'),

  coincidenciaExacta: document.getElementById('coincidenciaExacta'),
  buscarBtn: document.getElementById('buscarBtn'),
  limpiarBtn: document.getElementById('limpiarBtn'),


  ordenCodigoBtn: document.getElementById('ordenCodigoBtn'),
  ordenUbicacionBtn: document.getElementById('ordenUbicacionBtn'),
  resultsBody: document.getElementById('resultsBody'),
  statusMessage: document.getElementById('statusMessage'),


  statCodigos: document.getElementById('statCodigos'),


  rowTemplate: document.getElementById('rowTemplate'),
};

const normalizar = (texto = '') => texto.toString().trim().toLowerCase();
const escaparHtml = (texto = '') => texto
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const tokenizar = (valor) => normalizar(valor)
  .replace(/[._-]+/g, ' ')
  .split(/\s+/)
  .filter(Boolean);

const escapeRegex = (valor = '') => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function extraerCarro(ubicacion = '') {
  return ubicacion.split('-')[0] || '—';
}

function compararUbicacion(a, b) {
  return a.ubicacion.localeCompare(b.ubicacion, 'es', { numeric: true, sensitivity: 'base' });
}

function compararCodigo(a, b) {
  return a.codigo.localeCompare(b.codigo, 'es', { numeric: true, sensitivity: 'base' });
}

function setStatus(message = '', type = 'success') {
  els.statusMessage.textContent = message;
  els.statusMessage.className = `status show ${type}`;
}

function clearStatus() {
  els.statusMessage.textContent = '';
  els.statusMessage.className = 'status';
}

function actualizarStats() {

  els.statCodigos.textContent = new Set(state.data.map(item => item.codigo)).size;


}

function pintarLeyendas() {


  Object.entries(state.legends)
    .sort(([a], [b]) => a.localeCompare(b, 'es', { numeric: true }))
    .forEach(([codigo, texto]) => {
      const item = document.createElement('article');
      item.className = 'legend-item';
      item.innerHTML = `<strong>${escaparHtml(codigo)}</strong><span>${escaparHtml(texto)}</span>`;


      const option = document.createElement('option');
      option.value = codigo;
      option.textContent = `${codigo} · ${texto}`;

    });
}

function highlight(text, rawQuery) {
  const query = normalizar(rawQuery);
  if (!query) return escaparHtml(text);

  const escapedText = escaparHtml(text);
  const terms = [...new Set(tokenizar(query))].sort((a, b) => b.length - a.length);
  if (!terms.length) return escapedText;

  let result = escapedText;
  terms.forEach(term => {
    const pattern = new RegExp(`(${escapeRegex(term)})`, 'ig');
    result = result.replace(pattern, '<mark>$1</mark>');
  });
  return result;
}

function renderRows(rows) {
  els.resultsBody.innerHTML = '';

  if (!rows.length) {

    actualizarStats();
    return;
  }

  const fragment = document.createDocumentFragment();
  const queryForHighlight = [
    els.codigoInput.value,
    els.descripcionInput.value,
    els.ubicacionInput.value,

  ].filter(Boolean).join(' ');

  rows.forEach(item => {
    const clone = els.rowTemplate.content.cloneNode(true);
    clone.querySelector('.td-code').innerHTML = `<span class="code-badge">${highlight(item.codigo, queryForHighlight)}</span>`;
    clone.querySelector('.td-description').innerHTML = highlight(item.Descripcion || '', queryForHighlight);
    clone.querySelector('.td-location').innerHTML = `<span class="location-badge">${highlight(item.ubicacion, queryForHighlight)}</span>`;
    clone.querySelector('.td-car').innerHTML = `<span class="car-badge">${escaparHtml(extraerCarro(item.ubicacion))}</span>`;
    fragment.appendChild(clone);
  });

  els.resultsBody.appendChild(fragment);
  actualizarStats();
}

function aplicarOrden(rows) {



}

function buscar() {
  const codigo = normalizar(els.codigoInput.value);
  const descripcion = normalizar(els.descripcionInput.value);
  const ubicacion = normalizar(els.ubicacionInput.value);

  const exacta = els.coincidenciaExacta.checked;

  const hayFiltros = Boolean(codigo || descripcion || ubicacion || carro);
  let rows = state.data;

  if (codigo) {
    rows = rows.filter(item => {
      const actual = normalizar(item.codigo);
      const comparable = actual.replace(/[-\s]/g, '');
      const requested = codigo.replace(/[-\s]/g, '');
      return exacta ? comparable === requested : comparable.includes(requested);
    });
  }

  if (descripcion) {
    const tokens = tokenizar(descripcion);
    rows = rows.filter(item => {
      const blob = [item.codigo, item.Descripcion, item.ubicacion].map(normalizar).join(' | ');
      return tokens.every(token => blob.includes(token));
    });
  }

  if (ubicacion) {
    rows = rows.filter(item => normalizar(item.ubicacion).includes(ubicacion));
  }

  if (carro) {
    rows = rows.filter(item => normalizar(extraerCarro(item.ubicacion)) === carro);
  }

  state.filtered = aplicarOrden(rows);
  renderRows(state.filtered);

  if (!hayFiltros) {

  } else if (state.filtered.length) {
    setStatus(`Se han encontrado ${state.filtered.length} resultado(s).`, 'success');
  } else {
    setStatus('No se han encontrado coincidencias con esos filtros.', 'error');
  }

  syncUrl();
}

function limpiar() {
  els.codigoInput.value = '';
  els.descripcionInput.value = '';
  els.ubicacionInput.value = '';

  els.coincidenciaExacta.checked = false;
  state.sortBy = 'ubicacion';
  clearStatus();
  state.filtered = aplicarOrden(state.data);
  renderRows(state.filtered);

  syncUrl();
}

function toClipboard(text) {

  return navigator.clipboard.writeText(text);
}

function getResultsText() {
  if (!state.filtered.length) return '';
  return state.filtered
    .map(item => `${item.codigo} | ${item.Descripcion} | ${item.ubicacion} | ${extraerCarro(item.ubicacion)}`)
    .join('\n');
}

function syncUrl() {
  const params = new URLSearchParams();
  if (els.codigoInput.value.trim()) params.set('codigo', els.codigoInput.value.trim());
  if (els.descripcionInput.value.trim()) params.set('descripcion', els.descripcionInput.value.trim());
  if (els.ubicacionInput.value.trim()) params.set('ubicacion', els.ubicacionInput.value.trim());

  if (els.coincidenciaExacta.checked) params.set('exacta', '1');
  if (state.sortBy !== 'ubicacion') params.set('orden', state.sortBy);

  const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
  window.history.replaceState({}, '', newUrl);
}

function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  els.codigoInput.value = params.get('codigo') || '';
  els.descripcionInput.value = params.get('descripcion') || '';
  els.ubicacionInput.value = params.get('ubicacion') || '';

  els.coincidenciaExacta.checked = params.get('exacta') === '1';
  state.sortBy = params.get('orden') === 'codigo' ? 'codigo' : 'ubicacion';
}

async function cargarDatos() {
  try {
    const response = await fetch(`datos.json?v=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`No se pudo cargar datos.json (${response.status}).`);
    }

    const payload = await response.json();
    state.data = Array.isArray(payload.baseDeDatos) ? payload.baseDeDatos : [];


    pintarLeyendas();
    hydrateFromUrl();
    state.filtered = aplicarOrden(state.data);
    renderRows(state.filtered);
    setStatus('Datos cargados correctamente.', 'success');
  } catch (error) {
    console.error(error);
    state.data = [];
    state.filtered = [];
    renderRows([]);
    setStatus('Error al cargar los datos. Revisa que datos.json esté en el repositorio y bien formado.', 'error');
  }
}

function bindEvents() {
  [els.codigoInput, els.descripcionInput, els.ubicacionInput].forEach(input => {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') buscar();
    });
  });

  els.buscarBtn.addEventListener('click', buscar);
  els.limpiarBtn.addEventListener('click', limpiar);

  els.coincidenciaExacta.addEventListener('change', buscar);

  els.ordenCodigoBtn.addEventListener('click', () => {
    state.sortBy = 'codigo';
    buscar();
  });

  els.ordenUbicacionBtn.addEventListener('click', () => {
    state.sortBy = 'ubicacion';
    buscar();
  });


    try {
      await toClipboard(getResultsText());

    } catch (error) {

    }
  });


    try {
      await toClipboard(window.location.href);
      setStatus('Enlace copiado al portapapeles.', 'success');
    } catch (error) {

    }
  });
}

bindEvents();
cargarDatos();
