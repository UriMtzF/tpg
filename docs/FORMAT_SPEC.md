# Especificación formal del formato

Versión inicial: 1.

## obra.txt

Cada escena comienza con `# ESCENA <identificador> [| <título>]`. Los identificadores se conservan internamente como cadenas. Los números producen IDs `E01`, `E02`, etc.; los IDs textuales se normalizan a variantes seguras. Cada aparición de `[IDENTIFICADOR]` crea un cue. El contenido hasta el siguiente personaje, `@BLACK`, escena o fin de archivo pertenece al cue. Las líneas vacías interiores se conservan y las exteriores se eliminan. Las líneas que comienzan por `//` son comentarios.

`@BLACK` crea una cue negra sin texto. El texto fuera de un personaje o fuera de una escena es un error.

## config.yaml

La configuración usa la versión 1, metadatos, presentación, texto, personaje, cues, ajuste y un mapa de personajes. Los colores deben usar `#RRGGBB`. Solo se admiten relaciones `16:9` y `4:3`. Los tamaños deben ser finitos y positivos; el tamaño mínimo no puede superar el máximo y el decremento debe ser positivo.
