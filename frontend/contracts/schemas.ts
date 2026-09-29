/**
 * Barrel de schemas zod — a ponte RUNTIME dos contracts.
 *
 * - Globais canônicos: `contracts/schemas` (aqui).
 * - Por feature: `contracts/<feature>/schemas`.
 *
 * Notas de colisão (deliberado):
 * - `permissionSchema` do catálogo (com `assignedTo`/`features`) vive em
 *   `contracts/access-control/permissions/schemas` — aqui fica o canônico.
 * - `roles` e `integrations/gateway` apenas re-exportam globais; nada a adicionar.
 */
export * from './types/schemas'

export {
    createUserPayloadSchema,
    userPropertiesSchema
} from './access-control/users/schemas'

export { createTenantPayloadSchema } from './tenant/schemas'

export {
    actionsSchema,
    forgotPasswordPayloadSchema,
    forgotPasswordResponseSchema,
    loginResponseSchema,
    registerResponseSchema,
    resetPasswordPayloadSchema,
    resetPasswordResponseSchema,
    subjectsSchema,
    twoStepVerificationPayloadSchema,
    twoStepVerificationResponseSchema,
    userAbilityRuleSchema,
    userOutSchema,
    userSchema
} from './auth/schemas'

export {
    aiChatHistoryListResponseSchema,
    aiChatMessageAttachmentSchema,
    aiChatMessageItemSchema,
    aiChatMessageRoleSchema,
    aiChatMessagesListResponseSchema,
    aiChatSummarySchema,
    aiCreateChatResponseSchema,
    aiRenameChatRequestSchema,
    aiRenameChatResponseSchema,
    aiSendMessageRequestSchema,
    aiSendMessageResponseSchema,
    aiShareChatResponseSchema
} from './ai/chat-history/schemas'

export {
    aiModelSchema,
    aiModelTierSchema
} from './ai/models/schemas'

export {
    knowledgeChunkSchema,
    knowledgeCreatePayloadSchema,
    knowledgeEntrySchema,
    knowledgeListResponseSchema,
    knowledgeSourceTypeSchema,
    knowledgeUpdatePayloadSchema
} from './ai/knowledge/schemas'

export {
    skillCreatePayloadSchema,
    skillListResponseSchema,
    skillSchema,
    skillTypeSchema,
    skillUpdatePayloadSchema
} from './ai/skills/schemas'

export {
    conversationContactSchema,
    conversationContactWithConversationSchema,
    conversationMessageFeedbackSchema,
    conversationMessageSchema,
    conversationOutSchema,
    conversationSchema,
    conversationStatusSchema
} from './conversation/schemas'

export { searchItemSchema, searchResultsSchema } from './app-bar-search/schemas'
export { projectAnalyticsSchema } from './dashboard/schemas'

export {
    createApiKeyPayloadSchema,
    createNamespacePayloadSchema,
    createRoutePayloadSchema,
    createWebhookPayloadSchema,
    gatewayWebhookCreateResponseSchema,
    gatewayWebhookUpdateResponseSchema,
    quickSetupConfirmPayloadSchema,
    quickSetupPayloadSchema,
    updateNamespacePayloadSchema,
    updateRoutePayloadSchema,
    updateWebhookPayloadSchema
} from './integrations/gateway/schemas'

export {
    capabilityGrantRequestPayloadSchema,
    connectRequestPayloadSchema,
    mcpActivationSourceSchema,
    mcpAuditEventSchema,
    mcpAuditEventsResponseSchema,
    mcpCapabilityGrantSchema,
    mcpConnectedResponseSchema,
    mcpConnectionSchema,
    mcpConnectionStatusSchema,
    mcpHealthStatusSchema,
    mcpPrincipalTypeSchema,
    mcpProviderDefinitionSchema,
    mcpProviderStatusSchema,
    mcpStoreResponseSchema,
    mcpTrustTierSchema,
    mcpValidationRunSchema,
    mcpValidationStatusSchema,
    publishProviderRequestPayloadSchema,
    revalidateRequestPayloadSchema,
    validationCheckSchema
} from './integrations/mcp/schemas'

export {
    notificationEntrySchema,
    notificationEventSchema,
    notificationKindSchema,
    notificationOutSchema,
    notificationsResponseSchema
} from './notifications/schemas'

export {
    profileAvatarGroupSchema,
    profileChipSchema,
    profileHeaderSchema,
    profileTabCommonSchema,
    profileTabSchema,
    profileTeamsSchema,
    profileTeamsTechSchema,
    teamsTabSchema
} from './pages/profile/schemas'

export {
    baseCredentialSchema,
    createSecretPayloadSchema,
    createVariablePayloadSchema,
    credentialEntrySchema,
    credentialListResponseSchema,
    credentialTypeSchema,
    paginationMetaSchema,
    secretCredentialSchema,
    updateVariablePayloadSchema,
    variableCredentialSchema
} from './security/credentials/schemas'

export {
    searchResultSchema,
    searchSuggestionCategorySchema,
    searchSuggestionSchema,
    workspaceSearchResponseSchema
} from './workspace/search/schemas'

