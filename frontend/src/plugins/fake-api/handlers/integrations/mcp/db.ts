import type { McpAuditEvent, McpCapabilityGrant, McpConnection, McpProviderDefinition, McpValidationRun } from 'contracts/integrations/mcp/types'

interface DB {
  providers: McpProviderDefinition[]
  connections: McpConnection[]
  grants: McpCapabilityGrant[]
  validationRuns: McpValidationRun[]
  auditEvents: McpAuditEvent[]
}

const now = '2026-08-02T10:00:00.000Z'

export const db: DB = {
  providers: [
    { id: 'provider-stripe', slug: 'stripe', displayName: 'Stripe', category: 'payments', capabilities: ['payments.read', 'payments.write', 'customers.read'], requiredSecrets: ['STRIPE_API_KEY'], trustTier: 'verified', status: 'published', maintainer: 'platform-integrations', docsUrl: 'https://docs.stripe.com', createdAt: now, updatedAt: now },
    { id: 'provider-figma', slug: 'figma', displayName: 'Figma', category: 'design', capabilities: ['files.read', 'comments.read'], requiredSecrets: ['FIGMA_ACCESS_TOKEN'], trustTier: 'verified', status: 'published', maintainer: 'platform-integrations', docsUrl: 'https://www.figma.com/developers/api', createdAt: now, updatedAt: now },
    { id: 'provider-jira', slug: 'jira', displayName: 'Jira', category: 'project-management', capabilities: ['issues.read', 'issues.write', 'projects.read'], requiredSecrets: ['JIRA_API_TOKEN', 'JIRA_BASE_URL'], trustTier: 'verified', status: 'published', maintainer: 'platform-integrations', docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/', createdAt: now, updatedAt: now },
    { id: 'provider-git', slug: 'git', displayName: 'Git', category: 'devtools', capabilities: ['repos.read', 'pullrequests.read'], requiredSecrets: ['GIT_ACCESS_TOKEN'], trustTier: 'community', status: 'published', maintainer: 'platform-integrations', createdAt: now, updatedAt: now },
    { id: 'provider-context7', slug: 'context7', displayName: 'Context7', category: 'context', capabilities: ['context.search', 'context.retrieve'], requiredSecrets: ['CONTEXT7_API_KEY'], trustTier: 'community', status: 'published', maintainer: 'platform-integrations', createdAt: now, updatedAt: now },
    { id: 'provider-supabase', slug: 'supabase', displayName: 'Supabase', category: 'data', capabilities: ['db.read', 'db.write', 'storage.read'], requiredSecrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE'], trustTier: 'verified', status: 'published', maintainer: 'platform-integrations', docsUrl: 'https://supabase.com/docs', createdAt: now, updatedAt: now },
    { id: 'provider-notion', slug: 'notion', displayName: 'Notion', category: 'docs', capabilities: ['pages.read', 'databases.read'], requiredSecrets: ['NOTION_API_KEY'], trustTier: 'verified', status: 'published', maintainer: 'platform-integrations', createdAt: now, updatedAt: now },
    { id: 'provider-shadcn', slug: 'shadcn', displayName: 'ShadCn', category: 'ui', capabilities: ['components.search', 'components.generate'], requiredSecrets: ['SHADCN_API_KEY'], trustTier: 'internal', status: 'published', maintainer: 'platform-integrations', createdAt: now, updatedAt: now },
  ],
  connections: [
    { id: 'connection-supabase-alpha', tenantId: 'workspace-alpha', providerSlug: 'supabase', displayName: 'Supabase Workspace Alpha', status: 'active', lastValidationStatus: 'pass', lastValidationAt: now, healthStatus: 'healthy', connectedAt: now, activationSource: 'auto_validation', updatedAt: now, createdBy: 'user-admin', autoActivated: true },
    { id: 'connection-jira-alpha', tenantId: 'workspace-alpha', providerSlug: 'jira', displayName: 'Jira Workspace Alpha', status: 'failed', lastValidationStatus: 'fail', lastValidationAt: now, healthStatus: 'unreachable', activationSource: 'auto_validation', updatedAt: now, createdBy: 'user-admin', autoActivated: false },
    { id: 'connection-git-alpha', tenantId: 'workspace-alpha', providerSlug: 'git', displayName: 'Git Workspace Alpha', status: 'active', lastValidationStatus: 'pass', lastValidationAt: now, healthStatus: 'degraded', connectedAt: now, activationSource: 'auto_validation', updatedAt: now, createdBy: 'user-admin', autoActivated: true },
  ],
  grants: [
    { id: 'grant-role-ops-agent-supabase', tenantId: 'workspace-alpha', connectionId: 'connection-supabase-alpha', principalType: 'role', principalId: 'ops-agent', allowedCapabilities: ['db.read', 'storage.read'], createdAt: now, updatedAt: now, createdBy: 'user-admin' },
    { id: 'grant-agent-copilot-git', tenantId: 'workspace-alpha', connectionId: 'connection-git-alpha', principalType: 'agent', principalId: 'copilot', allowedCapabilities: ['repos.read'], createdAt: now, updatedAt: now, createdBy: 'user-admin' },
  ],
  validationRuns: [
    { id: 'validation-supabase-1', tenantId: 'workspace-alpha', connectionId: 'connection-supabase-alpha', result: 'pass', checks: [{ name: 'required-secrets', status: 'pass', detail: 'All required secrets provided' }, { name: 'provider-reachability', status: 'pass', detail: 'Provider reachable' }], startedAt: now, finishedAt: now, summaryMessage: 'Validation passed' },
    { id: 'validation-jira-1', tenantId: 'workspace-alpha', connectionId: 'connection-jira-alpha', result: 'fail', checks: [{ name: 'required-secrets', status: 'fail', detail: 'Missing JIRA_API_TOKEN' }], startedAt: now, finishedAt: now, summaryMessage: 'Validation failed' },
  ],
  auditEvents: [
    { id: 'audit-connection-created', tenantId: 'workspace-alpha', eventType: 'connection.created', actorId: 'user-admin', connectionId: 'connection-supabase-alpha', providerSlug: 'supabase', payload: { status: 'active' }, createdAt: now },
    { id: 'audit-validation-failed', tenantId: 'workspace-alpha', eventType: 'validation.failed', actorId: 'user-admin', connectionId: 'connection-jira-alpha', providerSlug: 'jira', payload: { reason: 'Missing JIRA_API_TOKEN' }, createdAt: now },
    { id: 'audit-grant-updated', tenantId: 'workspace-alpha', eventType: 'grant.updated', actorId: 'user-admin', connectionId: 'connection-supabase-alpha', providerSlug: 'supabase', payload: { principalId: 'ops-agent' }, createdAt: now },
  ],
}
