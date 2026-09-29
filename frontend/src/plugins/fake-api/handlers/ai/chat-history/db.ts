import type { AiChatMessageItem, AiChatSummary } from 'contracts/ai/chat-history/types'

const TITLES = [
  'Differential diagnosis for chest infiltrates',
  'CT staging protocol for lung cancer',
  'Pathology report interpretation: adenocarcinoma',
  'MRI vs CT for brain lesion evaluation',
  'HER2 testing results and treatment implications',
  'Grade 3 glioma prognosis and survival',
  'Immunotherapy response assessment RECIST 1.1',
  'PET-CT findings correlation with labs',
  'Tumor molecular profiling NGS results',
  'Radiation therapy planning target volume',
]

/**
 * Resposta completa de formatação Markdown (Fase 3) — cobre TODOS os elementos
 * (H1-H3, negrito/itálico/tachado, código inline, citação, listas, tabela,
 * blocos de código python/js, LaTeX e links). Espelho de uma "resposta
 * notebook" real de LLM (ex.: Gemini) — dá ao chat sessões formatadas.
 */
const RICH_MARKDOWN_REPLY = `# Differential Diagnosis Analysis: Chest Infiltrate

## Clinical Presentation

**Patient: 68M with 3-day fever and dyspnea. CXR shows left lower lobe infiltrate.**

---

## Key Clinical Features

- **Symptomatology:** fever (38.5°C), productive cough with purulent sputum, dyspnea
- **Risk factors:** smoking history, COPD, recent hospitalization
- **Vital signs:** RR 22, O2 sat 91% on room air
- *Physical exam:* left basilar crackles, bronchial breath sounds

---

## Differential Diagnoses

| Diagnosis | Likelihood | Key Distinguishing Features | Imaging |
| --- | --- | --- | --- |
| **Bacterial Pneumonia** | 70% | Acute fever, productive cough, lobar consolidation | Lobar consolidation, air bronchogram |
| *Viral Pneumonia* | 15% | Bilateral interstitial pattern, recent URI | Bilateral interstitial infiltrates |
| \`Aspiration Pneumonia\` | 10% | Altered mental status, dysphagia, RLL/LLL | Dependent lobes involvement |
| Fungal (PCP) | 5% | Immunocompromised, gradual onset, bilateral | Bilateral ground-glass opacities |

---

## Diagnostic Workup

**Immediate Laboratory Studies:**

\`\`\`
1. CBC with differential (elevated WBC, left shift)
2. BMP (renal function, electrolytes)
3. Blood cultures × 2 before antibiotics
4. Sputum culture and Gram stain
5. Chest X-ray (PA and lateral)
6. Pulse oximetry or ABG
\`\`\`

**Risk Stratification (CURB-65 Score):**

| Variable | Points |
| --- | --- |
| **C**onfusion | 1 |
| **U**rea >7 mmol/L | 1 |
| **R**espiratory rate ≥30 | 1 |
| **B**lood pressure (SBP <90 or DBP ≤60) | 1 |
| **65** years and older | 1 |

*Score 2-3 = moderate risk, consider hospitalization*

---

## Treatment Recommendations

**Empiric Antibiotic Coverage:**

- **CAP outpatient:** Amoxicillin-clavulanate 875/125 mg PO BID × 5 days
- **CAP inpatient:** Ceftriaxone 1g IV Q12H + Azithromycin 500 mg IV Q24H

> ⚠️ **Warning:** Adjust for renal function (eGFR <30) and allergy history. De-escalate after culture results.

**Supportive Care:**

1. Oxygen supplementation to maintain SpO2 >94%
2. Fluids (IV if unable to tolerate PO)
3. Antipyretics and analgesics
4. Monitor for complications (sepsis, respiratory failure)

---

## Follow-up

- Repeat CXR in 4-6 weeks to confirm radiographic clearance
- Clinical reassessment at 48-72 hours
- Culture and sensitivity results guide antibiotic de-escalation

**JAMA guidelines reference:** 2019 Infectious Diseases Society of America CAP guidelines`

/** Pathology case review response */
const CODE_GENERATION_REPLY = `# Histopathology Case Review

**Case:** 45F with breast lesion — core biopsy submitted

\`\`\`
SPECIMEN: Left Breast, 10 o'clock, 2cm lesion
SITE: Fibrocystic changes, left breast
\`\`\`

## Microscopic Findings

**Architecture:** Invasive carcinoma with desmoplastic stromal response

| Feature | Finding | Significance |
| --- | --- | --- |
| **Histologic Type** | Invasive ductal carcinoma (IDC), NST | Standard type |
| *Nottingham Grade* | Grade 2/3 (Intermediate) | Moderate mitotic activity |
| \`Tumor Size\` | ~1.8 cm (measuring largest focus) | Stage IB depends on margins |

## Immunohistochemical Results

- **ER:** Positive (90% nuclei)
- **PR:** Positive (75% nuclei)
- **HER2:** Negative by IHC (1+), FISH pending
- **Ki-67:** 25% (moderate proliferation)

> This is an **HR+ (hormone receptor positive), HER2- triple negative** profile suggesting endocrine sensitivity and potential for targeted therapy.

## Recommendations

1. Conduct full staging workup (CT chest/abdomen/pelvis, bone scan)
2. Genetic counseling (BRCA1/2) given age and grade
3. Oncology consult for adjuvant therapy discussion
4. Surgical margins assessment critical for therapy planning`

/** Clinical guidelines comparison response */
const COMPARISON_REPLY = `## Treatment Protocol Comparison

**Two approaches for Stage IIA breast cancer:**

| Criterion | Lumpectomy + Rad | Modified Radical |
| --- | --- | --- |
| **Survival** | Equivalent at 10 years | Equivalent at 10 years |
| *Cosmesis* | Better | Acceptable |
| \`Recurrence Rate\` | 5-10% if compliant with radiation | 3-5% |

### Clinical Recommendation

**Breast-conserving therapy (lumpectomy + radiation)** is preferred because:

1. **Equivalent oncologic outcomes** (NSABP B-06, EORTC trials)
2. Preserves breast tissue and body image
3. Requires compliance with 6 weeks radiation
4. Less morbidity than mastectomy

> **Key requirement:** Negative surgical margins and ability to tolerate whole-breast irradiation. If margins positive, re-excision or conversion to mastectomy required.`

export const ASSISTANT_REPLIES = [

  RICH_MARKDOWN_REPLY,
  CODE_GENERATION_REPLY,
  COMPARISON_REPLY,
  'Ótima pergunta! Aqui está o resumo:\n\n- **Ponto 1**: relevante para o seu cenário\n- **Ponto 2**: precisa de atenção especial\n- **Ponto 3**: impacto direto na solução\n\nQuer que eu aprofunde em algum desses?',
  'Analisei as opções e recomendo:\n\n1. Começar pela abordagem mais simples\n2. Validar com testes antes de escalar\n3. Revisar a documentação oficial\n\nPosso montar um passo a passo se quiser.',
  'Perfeito! Vou organizar assim:\n\n```\nEtapa 1: Preparação\nEtapa 2: Execução\nEtapa 3: Validação\n```\n\nPrecisa de ajustes no plano?',
  'Entendi o contexto. Os principais pontos são:\n\n- **Custo**: otimizado para o volume atual\n- **Escala**: preparado para crescimento\n- **Manutenção**: simples e documentada\n\nAlguma preferência de abordagem?',
]

/**
 * ℹ️ UUID v4 determinístico (padrão ChatGPT): o mesmo input sempre gera o mesmo
 * id, mantendo os testes de contrato estáveis entre execuções. A seed usa o
 * tenant + índice — nunca colide dentro do mesmo tenant.
 */
function uuidFromSeed(seed: string): string {
  let state = 0

  for (let i = 0; i < seed.length; i++)
    state = (Math.imul(31, state) + seed.charCodeAt(i)) | 0


  const rand = () => {
    state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const bytes = Array.from({ length: 16 }, () => Math.floor(rand() * 256))

  bytes[6] = (bytes[6]! & 0x0F) | 0x40 // versão 4
  bytes[8] = (bytes[8]! & 0x3F) | 0x80 // variante RFC 4122

  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0'))

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10).join(''),
  ].join('-')
}

function makeChats(count: number, tenantId: string, startId: number, offsetMinutes: number): AiChatSummary[] {
  return Array.from({ length: count }, (_, index) => {
    const id = uuidFromSeed(`${tenantId}-${startId + index}`)
    const ageMinutes = offsetMinutes + index * 17
    const updatedAt = new Date(Date.now() - ageMinutes * 60_000).toISOString()

    return {
      id,
      tenantId,
      title: `${TITLES[index % TITLES.length]} #${startId + index + 1}`,
      createdAt: new Date(Date.now() - (ageMinutes + 60) * 60_000).toISOString(),
      updatedAt,
      messageCount: 5 + ((index * 7) % 45),
      lastMessage: 'Obrigado pela ajuda!',
      isShared: index % 7 === 0,
      shareUrl: index % 7 === 0 ? `https://app.example.com/share/${id}` : undefined,
    }
  })
}

function hashCode(value: string): number {
  let hash = 0

  for (let i = 0; i < value.length; i++)
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0

  return hash
}

/**
 * ℹ️ Conversa seedada determinística por chat (mesmo id → mesmas mensagens),
 * o que mantém os testes de contrato estáveis entre execuções.
 */
function makeMessages(chat: AiChatSummary): AiChatMessageItem[] {
  const count = Math.min(Math.max(chat.messageCount, 4), 24)
  const seed = hashCode(chat.id)
  const createdAt = +new Date(chat.createdAt)
  const messages: AiChatMessageItem[] = []

  for (let i = 0; i < count; i++) {
    const isUser = i % 2 === 0
    const part = Math.floor(i / 2)

    messages.push({
      id: `${chat.id}-m${i}`,
      chatId: chat.id,
      role: isUser ? 'user' : 'assistant',
      content: isUser
        ? part === 0
          ? chat.title
          : `${chat.title} — acompanhamento #${part + 1}`
        : ASSISTANT_REPLIES[(seed + part) % ASSISTANT_REPLIES.length],
      createdAt: new Date(createdAt + i * 2 * 60_000).toISOString(),
    })
  }

  return messages
}

const chats = [
  ...makeChats(40, 'workspace-alpha', 0, 30),
  ...makeChats(8, 'workspace-beta', 100, 60),
]

export const db: {
  chats: AiChatSummary[]
  messages: Record<string, AiChatMessageItem[]>
} = {
  chats,
  messages: Object.fromEntries(chats.map(chat => [chat.id, makeMessages(chat)])),
}
