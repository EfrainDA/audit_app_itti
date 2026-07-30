type AppDataScope = {
  lotId?: string
  controlId?: string
}

export function getAppDataScopeKey(scope?: AppDataScope) {
  if (scope?.controlId) return `control:${scope.controlId}`
  if (scope?.lotId) return `lot:${scope.lotId}`
  return "all"
}
