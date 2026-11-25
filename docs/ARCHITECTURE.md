# Arquitectura

La aplicación es una SPA React/TypeScript que funciona completamente en el navegador.

- `lib/parser`: lectura de estructura y generación del documento intermedio.
- `schemas`: validación Zod de YAML.
- `lib/layout`: composición visual compartida y cálculo de desbordamiento.
- `lib/exporters`: exportadores independientes PDF y PPTX basados en `SlideModel`.
- `stores`: estado Zustand de archivos, configuración y navegación.
- `components/features`: interfaz por zonas y controles de operador.
- `public/examples`: ejemplos locales sin contenido de obras reales.

No se usa ningún backend ni almacenamiento persistente de libreto o diálogos.
