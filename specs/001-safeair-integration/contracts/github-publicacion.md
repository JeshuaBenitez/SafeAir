# Publicacion a GitHub - Pasos y justificacion

## Objetivo
Subir el proyecto completo a GitHub para facilitar colaboracion y pruebas en red.

## Paso 1: Revisar estado de git
- Accion: revisar cambios locales con git status.
- Por que: identificar archivos nuevos y cambios antes de subir.
- Optimo: evita subir archivos innecesarios o incompletos.
- Objetivo de red: indirecto (base para compartir configuracion y docker).

## Paso 2: Definir estructura de repositorio
- Accion: decidir si Api_Emuladores y Frontend_SafeAir se suben como submodules o como carpeta normal.
- Por que: ambas carpetas tienen su propio .git.
- Optimo: submodules si se quiere versionar por separado; carpeta normal si se quiere un solo repo.
- Objetivo de red: SI, permite que todos usen la misma configuracion de red.

## Paso 3: Agregar remote
- Accion: configurar origin con el repo https://github.com/JeshuaBenitez/SafeAir.git
- Por que: habilita push al repositorio oficial.
- Optimo: un solo remoto central.
- Objetivo de red: indirecto (distribuye la configuracion de red).

## Paso 4: Commit inicial
- Accion: agregar archivos y crear commit.
- Por que: versionar estado estable.
- Optimo: punto de referencia reproducible.
- Objetivo de red: SI, congela configuracion para pruebas en red.

## Paso 5: Push
- Accion: subir cambios con git push -u origin <branch>.
- Por que: publicar para el equipo.
- Optimo: mantiene historial en GitHub.
- Objetivo de red: SI, todos obtienen el mismo setup.

## Estado
- README creado en la raiz.
- Falta decidir estrategia para repos internos (submodule vs carpeta normal) antes de hacer push.
