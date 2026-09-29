/**
 * Tenant — contratos da tríade fake-api (db / index / types).
 * Os tipos de domínio (Tenant, Membership) vivem em `types/tenant.ts` (globais do
 * contrato — consumidos pelo auth store); este arquivo re-exporta e adiciona os
 * payloads do handler (`CreateTenantPayload`).
 */
export type { Membership, Tenant } from '../types/tenant'

export interface CreateTenantPayload {
  name?: string
  slug?: string
}
