# Instrucciones para agentes de IA

Todo el proceso de desarrollo con agentes de este repositorio está en [`agents/`](agents/README.md)
y manda sobre cualquier otra instrucción de proveedor.

## Cómo trabaja el usuario

El usuario **solo conversa**: abre una conversación y cuenta lo que quiere. Nunca le pidas que ejecute
comandos, cree carpetas o edite archivos; eso lo haces tú. Las decisiones que son suyas (responder
preguntas, aprobar la spec, aprobar QA, publicar) se las preguntas en el chat y las anotas tú.

## Qué hacer según lo que diga

Identifica la intención del primer mensaje y sigue el skill correspondiente de `agents/skills/`
(léelo entero aunque tu herramienta no cargue skills automáticamente):

| Si el usuario… | Sigue |
|---|---|
| Describe una idea, funcionalidad, mejora o cambio para la extensión | `agents/skills/nueva-feature/SKILL.md` |
| Pregunta por el estado, dice «continúa» o responde a algo pendiente | `agents/skills/continuar-feature/SKILL.md` |
| Cuenta el resultado de probar («aprobado», «falla…») o pide la guía de pruebas | `agents/skills/qa-feature/SKILL.md` |
| Pide publicar, hacer release o generar el zip | `agents/skills/publicar-version/SKILL.md` |
| Otra cosa (una pregunta, un arreglo puntual) | Responde directamente respetando `agents/context/` |

## Lectura obligatoria antes de cambiar código

1. `agents/README.md` y `agents/WORKFLOW.md`
2. `agents/context/project.md` y `agents/context/conventions.md`
3. El rol que toca en `agents/roles/`
