import type { CredentialEntry } from 'contracts/security/credentials/types'

interface DB {
  credentials: CredentialEntry[]
}





const secretValues = new Map<number, string>()

export function setSecretValue(id: number, value: string): void {
  secretValues.set(id, value)
}

export function getSecretValue(id: number): string | undefined {
  return secretValues.get(id)
}

export function deleteSecretValue(id: number): void {
  secretValues.delete(id)
}

export function clearSecretValues(): void {
  secretValues.clear()
}

export function getCredentialEntry(id: number | string, tenantId: string): CredentialEntry | null {
  const numericId = typeof id === 'string' ? Number(id) : id

  return db.credentials.find(cred => cred.id === numericId && cred.tenantId === tenantId) ?? null
}

export const db: DB = {
  credentials: [
    {
      id: 1,
      tenantId: 'workspace-alpha',
      key: 'APP_REGION',
      type: 'VARIABLE',
      value: 'us-east-1',
      description: 'Default deployment region',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },
    {
      id: 2,
      tenantId: 'workspace-alpha',
      key: 'APP_THEME',
      type: 'VARIABLE',
      value: 'app-light',
      description: 'UI theme variant',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },
    {
      id: 11,
      tenantId: 'workspace-alpha',
      key: 'OPENAI_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'Primary LLM provider key',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },
    {
      id: 12,
      tenantId: 'workspace-alpha',
      key: 'SUPABASE_SERVICE_ROLE',
      type: 'SECRET',
      maskedValue: '********',
      description: 'Backend service role token',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },
    {
      id: 20,
      tenantId: 'workspace-alpha',
      key: 'CRM_SANDBOX_TOKEN',
      type: 'SECRET',
      maskedValue: '********',
      description: 'Sandbox upstream token used by the API Gateway CRM Sandbox demo',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },





    {
      id: 30,
      tenantId: 'workspace-alpha',
      key: 'GOOGLE_HEALTHCARE_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'Google Cloud Healthcare API - Medical imaging & NLP',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
    {
      id: 31,
      tenantId: 'workspace-alpha',
      key: 'AWS_HEALTHLAKE_ENDPOINT',
      type: 'VARIABLE',
      value: 'https://healthlake.us-east-1.amazonaws.com',
      description: 'AWS HealthLake - EHR data normalization',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
    {
      id: 32,
      tenantId: 'workspace-alpha',
      key: 'AWS_HEALTHLAKE_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'AWS HealthLake API credentials',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
    {
      id: 33,
      tenantId: 'workspace-alpha',
      key: 'IBM_WATSON_HEALTH_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'IBM Watson Health - Medical NLP & analytics',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
    {
      id: 34,
      tenantId: 'workspace-alpha',
      key: 'MICROSOFT_AZURE_HEALTH_ENDPOINT',
      type: 'VARIABLE',
      value: 'https://health.azure.microsoft.com',
      description: 'Microsoft Azure Health Data Services - FHIR API',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
    {
      id: 35,
      tenantId: 'workspace-alpha',
      key: 'MICROSOFT_AZURE_HEALTH_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'Azure Health Data Services credentials',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
    {
      id: 36,
      tenantId: 'workspace-alpha',
      key: 'ANTHROPIC_CLAUDE_MEDICAL_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'Anthropic Claude - Medical text analysis & reasoning',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
    {
      id: 37,
      tenantId: 'workspace-alpha',
      key: 'NVIDIA_CLARA_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'NVIDIA Clara - Medical imaging AI & genomics',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },


    {
      id: 40,
      tenantId: 'workspace-alpha',
      key: 'ALIBABA_HEALTH_API_ENDPOINT',
      type: 'VARIABLE',
      value: 'https://health-api.aliyun.com',
      description: 'Alibaba Health AI - Medical diagnosis & drug discovery',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
    {
      id: 41,
      tenantId: 'workspace-alpha',
      key: 'ALIBABA_HEALTH_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'Alibaba Health API credentials',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
    {
      id: 42,
      tenantId: 'workspace-alpha',
      key: 'TENCENT_MEDICAL_AI_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'Tencent Medical AI - Radiology & pathology analysis',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
    {
      id: 43,
      tenantId: 'workspace-alpha',
      key: 'BAIDU_MEDAI_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'Baidu MedAI - Medical NLP & knowledge graph',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
    {
      id: 44,
      tenantId: 'workspace-alpha',
      key: 'HUAWEI_CLOUD_HEALTH_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'Huawei Cloud Health - EHR analytics & predictions',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
    {
      id: 45,
      tenantId: 'workspace-alpha',
      key: 'IFLYTEK_MEDICAL_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'iFlyTek Medical - Speech recognition & transcription for medical',
      updatedAt: '2026-08-02T09:00:00.000Z',
    },
  ],
}


setSecretValue(20, 'sk-sandbox-123456')




setSecretValue(40, 'demo-meta-app-secret')
setSecretValue(41, 'demo-meta-verify-token')
setSecretValue(42, 'demo-whatsapp-verify-token')
setSecretValue(43, 'demo-instagram-verify-token')
setSecretValue(44, 'demo-pixel-access-token')
