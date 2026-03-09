# Git Workflow

## Branch policy
- `main`: produccion Firebase online. No desarrollo directo.
- `dev/axiom-local`: rama de integracion de producto.
- `feat/*`: una rama por funcionalidad.

## Current feature branches
- `feat/analytics-clinical`
- `feat/finanzas-inteligentes`
- `feat/notificaciones-inteligentes`

## Merge strategy
- Merge con `--no-ff` para conservar historial por modulo.
- Commits semanticos: `feat(...)`, `fix(...)`, `chore(...)`, `docs(...)`.

## Release flow
1. Desarrollar en `feat/*`.
2. Merge a `dev/axiom-local`.
3. Validar en emuladores/staging.
4. Cherry-pick o merge controlado a `main` solo de lo que vaya online.

## Safety
- No subir secretos, logs o exports locales.
- Mantener `.gitignore` actualizado.
