import { useEffect, useMemo, useRef, useState } from 'react';
import { stringify } from 'yaml';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FolderOpen,
  Grid3X3,
  Info,
  LoaderCircle,
  Upload,
} from 'lucide-react';
import { useProjectStore } from './stores/projectStore';
import { FILE_LIMITS, SAFE_FONTS } from './lib/constants';
import { contrastRatio } from './lib/layout/composeSlides';
import { downloadBlob, downloadText } from './lib/utils/files';
import { exportPdf } from './lib/exporters/pdfExporter';
import { exportPptx } from './lib/exporters/pptxExporter';
import type { ProjectConfig } from './types';

function readFile(file: File, kind: 'script' | 'config') {
  const limit = kind === 'script' ? FILE_LIMITS.obraBytes : FILE_LIMITS.configBytes;
  if (file.size > limit) throw new Error(`El archivo supera el límite de ${kind === 'script' ? '5 MB' : '1 MB'}.`);
  if (kind === 'script' && !/\.(txt)$/i.test(file.name)) throw new Error('La obra debe tener extensión .txt.');
  if (kind === 'config' && !/\.(ya?ml)$/i.test(file.name)) throw new Error('La configuración debe tener extensión .yaml o .yml.');
  return file.text();
}

function App() {
  const store = useProjectStore();
  const [activeTab, setActiveTab] = useState<'archivos' | 'config' | 'validacion'>('archivos');
  const [exportOpen, setExportOpen] = useState(false);
  const [progress, setProgress] = useState('');
  const scriptInput = useRef<HTMLInputElement>(null);
  const configInput = useRef<HTMLInputElement>(null);
  const currentSlide = store.slides[store.currentIndex];
  const errors = store.messages.filter((message) => message.severity === 'error');
  const warnings = store.messages.filter((message) => message.severity === 'warning');
  const adjusted = store.slides.filter((slide) => slide.layout.adjustedToMinimum).length;
  const overflow = store.slides.filter((slide) => slide.layout.overflow).length;
  const dialogCount = store.slides.filter((slide) => slide.cue.kind === 'dialogue').length;
  const blackCount = store.slides.filter((slide) => slide.cue.kind === 'black').length;
  const safeFont = SAFE_FONTS.find((font) => font === store.config.texto.fuente);

  const characterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const slide of store.slides) {
      if (slide.cue.kind === 'dialogue') counts[slide.cue.characterId] = (counts[slide.cue.characterId] || 0) + 1;
    }
    return counts;
  }, [store.slides]);

  const navigate = (index: number) => {
    if (!store.slides.length) return;
    store.setCurrentIndex(Math.max(0, Math.min(store.slides.length - 1, index)));
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editable = target.matches('input, textarea, select, [contenteditable="true"]');
      if (!editable && event.key === 'ArrowRight') navigate(store.currentIndex + 1);
      if (!editable && event.key === 'ArrowLeft') navigate(store.currentIndex - 1);
      if (!editable && event.key === 'Home') navigate(0);
      if (!editable && event.key === 'End') navigate(store.slides.length - 1);
      if (!editable && event.key.toLowerCase() === 'b') {
        const next = store.slides.findIndex((slide, index) => index > store.currentIndex && slide.cue.kind === 'black');
        if (next >= 0) navigate(next);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') setExportOpen(true);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const upload = async (file: File, kind: 'script' | 'config') => {
    try {
      const text = await readFile(file, kind);
      if (kind === 'script') store.setScriptText(text, file.name);
      else store.setConfigText(text, file.name);
    } catch (error) {
      useProjectStore.setState((state) => ({
        messages: [...state.messages, {
          severity: 'error',
          code: 'FILE_READ',
          message: error instanceof Error ? error.message : 'No se pudo leer el archivo.',
        }],
      }));
    }
  };

  const updateConfig = (next: ProjectConfig) => store.updateConfig(next);
  const setAspectRatio = (value: '16:9' | '4:3') => updateConfig({
    ...store.config,
    presentacion: { ...store.config.presentacion, relacion_aspecto: value },
  });
  const setBackground = (value: string) => updateConfig({
    ...store.config,
    presentacion: { ...store.config.presentacion, fondo: value },
  });

  const normalizedYaml = stringify(store.config, { indent: 2 });

  const exportFile = async (kind: 'pdf' | 'pptx') => {
    if (errors.length || !store.slides.length) return;
    setExportOpen(true);
    setProgress(kind === 'pdf' ? 'Generando PDF localmente...' : 'Generando PPTX localmente...');
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 20));
      const result = kind === 'pdf'
        ? await exportPdf(store.slides, store.config)
        : await exportPptx(store.slides, store.config);
      downloadBlob(result.blob, result.filename);
      setProgress('Archivo generado correctamente.');
    } catch (error) {
      setProgress(error instanceof Error ? error.message : 'Error al generar el archivo.');
    }
  };

  const slideStyle = currentSlide ? {
    backgroundColor: currentSlide.background,
  } : { backgroundColor: '#111827' };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><Grid3X3 size={18} /> TPG <span>Generador local</span></div>
        <div className="privacy"><span className="privacy-dot" /> Procesamiento local en tu navegador</div>
      </header>

      <div className="mobile-tabs" role="tablist">
        {(['archivos', 'config', 'validacion'] as const).map((tab) => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>
            {tab === 'archivos' ? 'Archivos' : tab === 'config' ? 'Configuración' : 'Validación'}
          </button>
        ))}
      </div>

      <div className="workspace">
        <aside className={`left-panel panel ${activeTab === 'archivos' ? 'mobile-active' : ''}`}>
          <section>
            <h2>Archivos</h2>
            <div className="drop-grid">
              {(['script', 'config'] as const).map((kind) => (
                <button
                  key={kind}
                  className="dropzone"
                  onClick={() => kind === 'script' ? scriptInput.current?.click() : configInput.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files[0];
                    if (file) void upload(file, kind);
                  }}
                >
                  {kind === 'script' ? <FileText size={20} /> : <Upload size={20} />}
                  <span>{kind === 'script' ? 'obra.txt' : 'config.yaml'}</span>
                  <small>{kind === 'script' ? store.scriptName || 'Arrastra o selecciona' : store.configName || 'Arrastra o selecciona'}</small>
                </button>
              ))}
            </div>
            <input ref={scriptInput} type="file" accept=".txt,text/plain" hidden onChange={(event) => {
              const file = event.target.files?.[0]; if (file) void upload(file, 'script');
            }} />
            <input ref={configInput} type="file" accept=".yaml,.yml,text/yaml" hidden onChange={(event) => {
              const file = event.target.files?.[0]; if (file) void upload(file, 'config');
            }} />
            <div className="example-row">
              <button className="secondary" onClick={() => void store.loadExample()}><FolderOpen size={16} /> Cargar ejemplos</button>
              <button className="icon-button" title="Descargar plantilla obra.txt" aria-label="Descargar plantilla obra.txt" onClick={() =>
                downloadText(`# ESCENA 1 | TÍTULO DE EJEMPLO\n\n[PERSONAJE_A]\nPrimera línea de ejemplo.\n\n@BLACK\n`, 'obra.txt')
              }><Download size={16} /></button>
            </div>
          </section>

          <section className="scene-list">
            <h2>Escenas y cues</h2>
            {store.parsed.scenes.length ? store.parsed.scenes.map((scene) => (
              <div className="scene-item" key={scene.id}>
                <strong>{scene.id}</strong>{scene.title && <span>{scene.title}</span>}
                {scene.cues.map((cue) => (
                  <button
                    key={cue.id}
                    className={store.slides[store.currentIndex]?.cue.id === cue.id ? 'cue active' : 'cue'}
                    onClick={() => navigate(store.slides.findIndex((slide) => slide.cue.id === cue.id))}
                  >
                    {cue.kind === 'black' ? 'Negro' : `${cue.characterId} · ${cue.lines.join(' ')}`}
                  </button>
                ))}
              </div>
            )) : <p className="muted">Carga una obra para ver su estructura.</p>}
          </section>
        </aside>

        <section className="preview-panel">
          <div className="preview-toolbar">
            <div>
              <button className="icon-button" aria-label="Cue anterior" onClick={() => navigate(store.currentIndex - 1)} disabled={store.currentIndex <= 0}><ChevronLeft /></button>
              <button className="icon-button" aria-label="Cue siguiente" onClick={() => navigate(store.currentIndex + 1)} disabled={store.currentIndex >= store.slides.length - 1}><ChevronRight /></button>
            </div>
            <span>Cuadro {store.slides.length ? store.currentIndex + 1 : 0} / {store.slides.length}</span>
            <div className="preview-controls">
              <label>Zoom
                <select value={store.zoom} onChange={(event) => store.setZoom(Number(event.target.value))}>
                  {[50, 70, 85, 100].map((zoom) => <option key={zoom} value={zoom}>{zoom}%</option>)}
                </select>
              </label>
              <button className={store.showGuides ? 'icon-button active' : 'icon-button'} aria-label="Mostrar guías" title="Mostrar guías" onClick={() => store.setShowGuides(!store.showGuides)}><Grid3X3 /></button>
            </div>
          </div>
          <div className="canvas-stage" aria-label="Previsualización de diapositiva">
            {currentSlide ? (
              <div
                className="slide-preview"
                style={{
                  ...slideStyle,
                  width: `${store.zoom * (currentSlide.width / 100)}px`,
                  aspectRatio: `${currentSlide.width}/${currentSlide.height}`,
                  fontFamily: store.config.texto.fuente,
                }}
              >
                {store.showGuides && <div className="margin-guide" />}
                {currentSlide.cue.kind !== 'black' && (
                  <div className="slide-content">
                    {store.config.personaje.mostrar_nombre && currentSlide.name && (
                      <div className="character-name" style={{
                        position: 'absolute',
                        top: `${currentSlide.layout.namePosition.y / currentSlide.height * 100}%`,
                        left: `${store.config.texto.margen_horizontal}%`,
                        width: `${100 - store.config.texto.margen_horizontal * 2}%`,
                        color: currentSlide.textColor,
                        fontSize: `${store.config.personaje.tamano / currentSlide.width * 100}cqw`,
                        lineHeight: 1.2,
                        textAlign: store.config.texto.alineacion_horizontal === 'centro' ? 'center' : store.config.texto.alineacion_horizontal === 'derecha' ? 'right' : 'left',
                        fontWeight: store.config.personaje.negrita ? 700 : 400,
                      }}>
                        {currentSlide.name}
                      </div>
                    )}
                    <div style={{
                      position: 'absolute',
                      top: `${currentSlide.layout.dialoguePosition.y / currentSlide.height * 100}%`,
                      left: `${store.config.texto.margen_horizontal}%`,
                      width: `${100 - store.config.texto.margen_horizontal * 2}%`,
                      color: currentSlide.textColor,
                      fontSize: `${currentSlide.layout.fontSize / currentSlide.width * 100}cqw`,
                      fontWeight: store.config.texto.negrita ? 700 : 400,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.18,
                      textAlign: store.config.texto.alineacion_horizontal === 'centro' ? 'center' : store.config.texto.alineacion_horizontal === 'derecha' ? 'right' : 'left',
                    }}>
                      {currentSlide.layout.lines.join('\n')}
                    </div>
                  </div>
                )}
                {currentSlide.layout.overflow && <span className="overflow-badge">Texto desbordado</span>}
              </div>
            ) : (
              <div className="empty-preview"><Grid3X3 size={40} /><p>Carga archivos para comenzar</p></div>
            )}
          </div>
        </section>

        <aside className={`right-panel panel ${activeTab === 'config' || activeTab === 'validacion' ? 'mobile-active' : ''}`}>
          {activeTab !== 'validacion' ? (
            <section>
              <h2>Configuración visual</h2>
              <label>Título
                <input value={store.config.metadata.titulo} onChange={(event) => updateConfig({ ...store.config, metadata: { ...store.config.metadata, titulo: event.target.value } })} />
              </label>
              <div className="field-grid">
                <label>Relación
                  <select value={store.config.presentacion.relacion_aspecto} onChange={(event) => setAspectRatio(event.target.value === '4:3' ? '4:3' : '16:9')}>
                    <option>16:9</option><option>4:3</option>
                  </select>
                </label>
                <label>Fondo
                  <input type="color" value={store.config.presentacion.fondo} onChange={(event) => setBackground(event.target.value)} />
                </label>
              </div>
              <label>Fuente
                <select value={safeFont || 'personalizada'} onChange={(event) => {
                  if (event.target.value !== 'personalizada') updateConfig({ ...store.config, texto: { ...store.config.texto, fuente: event.target.value } });
                }}>
                  {SAFE_FONTS.map((font) => <option key={font}>{font}</option>)}
                  <option value="personalizada">Personalizada...</option>
                </select>
                {!safeFont && <input value={store.config.texto.fuente} onChange={(event) => updateConfig({ ...store.config, texto: { ...store.config.texto, fuente: event.target.value } })} />}
              </label>
              {!safeFont && <p className="warning-text">La apariencia puede variar si la fuente no está instalada.</p>}
              <label>Color del texto
                <input
                  type="color"
                  value={store.config.texto.color_predeterminado}
                  onChange={(event) => updateConfig({
                    ...store.config,
                    texto: { ...store.config.texto, color_predeterminado: event.target.value },
                  })}
                />
              </label>
              <div className="field-grid">
                <label>Tamaño máximo
                  <input type="number" min="40" value={store.config.texto.tamano_maximo} onChange={(event) => updateConfig({ ...store.config, texto: { ...store.config.texto, tamano_maximo: Number(event.target.value) } })} />
                </label>
                <label>Tamaño mínimo
                  <input type="number" min="8" value={store.config.texto.tamano_minimo} onChange={(event) => updateConfig({ ...store.config, texto: { ...store.config.texto, tamano_minimo: Number(event.target.value) } })} />
                </label>
              </div>
              <h3>Personajes</h3>
              {Object.entries(store.config.personajes).map(([id, character]) => (
                <div className="character-row" key={id}>
                  <span>{id}</span>
                  <input aria-label={`Nombre de ${id}`} value={character.nombre} onChange={(event) => {
                    updateConfig({ ...store.config, personajes: { ...store.config.personajes, [id]: { ...character, nombre: event.target.value } } });
                  }} />
                  <input aria-label={`Color de ${id}`} type="color" value={character.color} onChange={(event) => {
                    updateConfig({ ...store.config, personajes: { ...store.config.personajes, [id]: { ...character, color: event.target.value } } });
                  }} />
                  <button className="icon-button" aria-label={`Eliminar ${id}`} onClick={() => {
                    if (!window.confirm(`¿Eliminar el personaje ${id}?`)) return;
                    const personajes = { ...store.config.personajes }; delete personajes[id];
                    updateConfig({ ...store.config, personajes });
                  }}>×</button>
                </div>
              ))}
              <button className="secondary" onClick={() => {
                let index = 1;
                let id = 'PERSONAJE_C';
                while (store.config.personajes[id]) { index += 1; id = `PERSONAJE_${String.fromCharCode(66 + index)}`; }
                updateConfig({ ...store.config, personajes: { ...store.config.personajes, [id]: { nombre: id, color: '#FFFFFF' } } });
              }}>+ Agregar personaje</button>
              {contrastRatio(store.config.texto.color_predeterminado, store.config.presentacion.fondo) < 4.5 && (
                <p className="warning-text"><AlertTriangle size={14} /> El contraste del texto puede ser insuficiente.</p>
              )}
            </section>
          ) : null}

          <section className="validation-section">
            <h2>Validaciones</h2>
            {store.messages.length ? store.messages.map((message, index) => (
              <button
                key={`${message.code}-${index}`}
                className={`validation-message ${message.severity}`}
                onClick={() => message.cueId && navigate(store.slides.findIndex((slide) => slide.cue.id === message.cueId))}
              >
                {message.severity === 'error' ? <AlertTriangle size={15} /> : message.severity === 'warning' ? <AlertTriangle size={15} /> : <Info size={15} />}
                <span><strong>{message.code}</strong> {message.message}{message.line ? ` (línea ${message.line})` : ''}</span>
              </button>
            )) : <p className="success-text">No hay errores ni advertencias.</p>}
          </section>

          <section className="summary">
            <h2>Resumen</h2>
            <dl>
              <div><dt>Escenas</dt><dd>{store.parsed.scenes.length}</dd></div>
              <div><dt>Cues de diálogo</dt><dd>{dialogCount}</dd></div>
              <div><dt>Pantallas negras</dt><dd>{blackCount}</dd></div>
              <div><dt>Total</dt><dd>{store.slides.length}</dd></div>
              <div><dt>Errores</dt><dd>{errors.length}</dd></div>
              <div><dt>Advertencias</dt><dd>{warnings.length}</dd></div>
              <div><dt>Ajustados al mínimo</dt><dd>{adjusted}</dd></div>
              <div><dt>Desbordados</dt><dd>{overflow}</dd></div>
            </dl>
            {Object.entries(characterCounts).map(([id, count]) => <p className="character-count" key={id}><span>{id}</span><b>{count}</b></p>)}
          </section>

          <section className="export-section">
            <h2>Exportación</h2>
            {progress && <p className="progress" role="status">{progress}</p>}
            <button className="primary" disabled={Boolean(errors.length) || !store.slides.length} onClick={() => void exportFile('pdf')}>
              <Download size={16} /> Exportar PDF
            </button>
            <button className="primary" disabled={Boolean(errors.length) || !store.slides.length} onClick={() => void exportFile('pptx')}>
              <Download size={16} /> Exportar PPTX
            </button>
            <button className="secondary" onClick={() => downloadText(normalizedYaml, 'config.yaml')}>
              <Download size={16} /> Descargar YAML
            </button>
          </section>
        </aside>
      </div>

      {exportOpen && (
        <div className="export-popover" role="dialog" aria-label="Panel de exportación">
          <button className="icon-button close-export" aria-label="Cerrar panel" onClick={() => setExportOpen(false)}>×</button>
          <h2>Exportación</h2>
          {progress ? <p><LoaderCircle size={16} className="spin" /> {progress}</p> : <p>PDF y PPTX se generan localmente.</p>}
        </div>
      )}
    </main>
  );
}

export default App;
