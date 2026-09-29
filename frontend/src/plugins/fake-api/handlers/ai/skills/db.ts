import type { Skill } from 'contracts/ai/skills/types'

interface DB {
  skills: Skill[]
}

const baseSkills = [
  {
    id: 1,
    name: 'Radiology Analysis',
    command: '/radiology',
    category: 'Diagnostic',
    type: 'DEFAULT',
    instructions: '# Radiology Analysis Assistant\n\nYou are an expert diagnostic radiologist specializing in medical image interpretation.\n\n## Instructions\n\n1. Analyze chest X-rays, CT scans, and MRI images\n2. Identify pathological findings and abnormalities\n3. Compare with patient history and clinical context\n4. Provide differential diagnoses with confidence levels\n5. Recommend follow-up imaging if needed',
    color: '#0066CC',
    icon: 'bx-image',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Pathology Assessment',
    command: '/pathology',
    category: 'Diagnostic',
    type: 'DEFAULT',
    instructions: '# Pathology Assessment Assistant\n\nYou are an expert pathologist specializing in tissue and cellular analysis.\n\n## Instructions\n\n1. Interpret histopathology slides and reports\n2. Identify neoplastic and non-neoplastic conditions\n3. Grade tumors using TNM staging\n4. Provide prognostic information\n5. Recommend immunohistochemistry tests when relevant',
    color: '#003366',
    icon: 'bx-test-tube',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    name: 'Oncology Consultation',
    command: '/oncology',
    category: 'Treatment',
    type: 'DEFAULT',
    instructions: '# Oncology Consultation Assistant\n\nYou are an expert oncologist specializing in cancer treatment and management.\n\n## Instructions\n\n1. Review tumor profiles and molecular markers\n2. Suggest evidence-based treatment protocols\n3. Discuss chemotherapy, immunotherapy, and targeted therapy options\n4. Calculate prognosis and survival rates\n5. Provide side effect management strategies',
    color: '#00AA66',
    icon: 'bx-pulse',
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 4,
    name: 'Clinical Decision Support',
    command: '/clinical-support',
    category: 'Treatment',
    type: 'CUSTOM',
    instructions: '# Clinical Decision Support System\n\nYou are a clinical decision support expert integrating evidence-based medicine.\n\n## Instructions\n\n1. Integrate patient labs, imaging, and clinical findings\n2. Apply diagnostic criteria (ICD-10, DSM-5)\n3. Reference clinical guidelines (NCCN, ASCO)\n4. Flag drug interactions and contraindications\n5. Suggest appropriate specialist referrals',
    color: '#003366',
    icon: 'bx-heart',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 5,
    name: 'Medical Literature Search',
    command: '/literature',
    category: 'Research',
    type: 'CUSTOM',
    instructions: '# Medical Literature Research Assistant\n\nYou are a medical research expert specializing in literature analysis.\n\n## Instructions\n\n1. Search PubMed and clinical databases for relevant studies\n2. Summarize recent research findings\n3. Evaluate study quality and methodology\n4. Identify landmark trials and consensus guidelines\n5. Provide evidence-based recommendations ranked by study level',
    color: '#0066CC',
    icon: 'bx-book-open',
    createdAt: '2026-07-15T00:00:00.000Z',
  },
] satisfies Omit<Skill, 'tenantId'>[]


export const db: DB = {
  skills: baseSkills.map(skill => ({ ...skill, tenantId: 'workspace-alpha' })),
}
