/**
 * Contracts do Ditaxia — ponte frontend <-> backend.
 * Fonte de verdade: TypeScript. Spec OpenAPI (quando existir) é artefato GERADO, nunca manual.
 *
 * Este barrel re-exporta apenas os globais canônicos (sem colisões de nomes).
 * DTOs por feature: importar via subpath `contracts/<feature>/types`.
 */
export * from './types/accessControl'
export * from './types/discovery'
export * from './types/gateway'
export * from './types/tenant'
