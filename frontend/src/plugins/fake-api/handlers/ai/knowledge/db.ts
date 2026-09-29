import type { KnowledgeEntry } from 'contracts/ai/knowledge/types'

import type { KnowledgeChunkingSettings } from '@/types/knowledge'
import { createDefaultKnowledgeSettings } from '@/types/knowledge'

interface DB {
  knowledge: KnowledgeEntry[]
  tags: string[]

  /** Configuração de fragmentação por entrada (`/ai/knowledge/:id/settings`). */
  settings: Record<number, KnowledgeChunkingSettings>
}

function seedSettings(entries: KnowledgeEntry[]): Record<number, KnowledgeChunkingSettings> {
  return Object.fromEntries(entries.map(entry => [entry.id, createDefaultKnowledgeSettings()]))
}

export const db: DB = {
  knowledge: [
    {
      id: 1,
      tenantId: 'workspace-alpha',
      title: 'Chest X-Ray Interpretation Guidelines',
      content: '<h1>Chest X-Ray Interpretation Guidelines</h1><p><strong>Standard projection order:</strong> PA (Posteroanterior) and lateral views. High-quality images essential for diagnosis.</p><h2>Normal Anatomy</h2><ul><li>Heart silhouette: <2/3 chest width</li><li>Hilum: characteristic vascular shadows</li><li>Lungs: bilateral symmetry with normal vasculature</li><li>Diaphragm: smooth, uninterrupted contours</li></ul><h2>Pathology Recognition</h2><ul><li>Infiltrates: consolidation, atelectasis, or opacities</li><li>Effusions: blunting of costophrenic angles</li><li>Pneumothorax: lung edge separation, absent vasculature</li><li>Cardiomegaly: cardiothoracic ratio >0.5</li></ul>',
      tags: ['radiology', 'chest', 'imaging', 'guidelines'],
      sourceType: 'MANUAL',
      sourceFilename: null,
      chunks: [
        {
          chunkIndex: 0,
          text: 'Chest X-Ray Interpretation. Standard PA and lateral projections. Key findings: heart silhouette <2/3 chest width, normal hilum vasculature, bilateral symmetry. Recognize infiltrates, effusions, pneumothorax, cardiomegaly.',
          tokenCount: 45,
        },
      ],
      linkedSecretName: null,
      createdAt: '2026-01-15T09:00:00.000Z',
      updatedAt: '2026-01-15T09:00:00.000Z',
    },
    {
      id: 2,
      tenantId: 'workspace-alpha',
      title: 'Histopathology Reporting Standards',
      content: '<h2>Specimen Handling and Processing</h2><p><strong>Critical steps:</strong> Fixation (10% neutral formalin), processing, embedding in paraffin, sectioning, and staining (H&E standard).</p><h3>Microscopic Examination</h3><p>Systematic review of architecture, cytology, and special features. Use magnifications: low (4x) for overview, medium (10x) for architecture, high (40x) for cellular detail.</p><h3>Diagnostic Categories</h3><ul><li>Benign (with specific diagnosis)</li><li>Atypical (may require additional studies)</li><li>Malignant (with histologic type and grade)</li><li>Cannot exclude malignancy (recommend correlation)</li></ul><p><strong>TNM staging:</strong> Apply appropriate staging for neoplasms. Document tumor size, invasion depth, lymph node status, and metastases.</p>',
      tags: ['pathology', 'histology', 'reporting', 'standards'],
      sourceType: 'MANUAL',
      sourceFilename: null,
      chunks: [
        {
          chunkIndex: 0,
          text: 'Histopathology Standards. Specimen fixation (10% formalin), processing, H&E staining. Systematic microscopy review. Diagnostic categories: benign, atypical, malignant. TNM staging for neoplasms.',
          tokenCount: 42,
        },
      ],
      linkedSecretName: null,
      createdAt: '2026-02-10T14:30:00.000Z',
      updatedAt: '2026-02-10T14:30:00.000Z',
    },
    {
      id: 3,
      tenantId: 'workspace-alpha',
      title: 'Oncology Protocol Library',
      content: '<p><strong>NCCN Guidelines Integration:</strong> Evidence-based treatment recommendations for common malignancies.</p><h2>Cancer Types</h2><ul><li><strong>Breast Cancer:</strong> Staging (TNM), receptor status (ER/PR/HER2), chemotherapy regimens, hormonal therapy</li><li><strong>Lung Cancer:</strong> Histology (NSCLC vs SCLC), staging, EGFR/ALK/PD-L1 testing, targeted vs immunotherapy</li><li><strong>Colorectal Cancer:</strong> Microsatellite instability, mismatch repair status, adjuvant therapy recommendations</li><li><strong>Lymphoma:</strong> Hodgkin vs Non-Hodgkin, B-cell vs T-cell, IPI scoring, treatment options</li></ul><h2>Treatment Modalities</h2><p><strong>Chemotherapy:</strong> Common regimens (AC, paclitaxel, 5-FU), dose calculations, toxicity management.<br/><strong>Immunotherapy:</strong> Checkpoint inhibitors (PD-1, PD-L1, CTLA-4), response criteria (RECIST 1.1), immune-related adverse events (irAEs).<br/><strong>Targeted Therapy:</strong> Tyrosine kinase inhibitors, monoclonal antibodies, molecular requirements.</p>',
      tags: ['oncology', 'protocols', 'nccn', 'guidelines'],
      sourceType: 'MANUAL',
      sourceFilename: null,
      chunks: [
        {
          chunkIndex: 0,
          text: 'Oncology Protocols: Breast cancer staging/receptor status, lung cancer histology/mutations, colorectal cancer MSI/MMR, lymphoma classification. Treatment: chemotherapy regimens, immunotherapy (PD-1/CTLA-4), targeted therapy with molecular requirements.',
          tokenCount: 48,
        },
      ],
      linkedSecretName: null,
      createdAt: '2026-03-01T08:00:00.000Z',
      updatedAt: '2026-03-01T08:00:00.000Z',
    },
    {
      id: 4,
      tenantId: 'workspace-alpha',
      title: 'Laboratory Reference Values',
      content: '<h2>Common Lab Tests</h2><table><tr><th>Test</th><th>Normal Range</th><th>Clinical Significance</th></tr><tr><td><strong>CBC</strong></td><td>WBC 4.5-11K, Hgb 12-16 (F), 14-18 (M), Plt 150-400K</td><td>Infection, anemia, clotting disorders</td></tr><tr><td><strong>CMP</strong></td><td>Glucose 70-100 fasting, Na 135-145, K 3.5-5.0, Cr 0.6-1.2</td><td>Metabolism, kidney, liver function</td></tr><tr><td><strong>LFTs</strong></td><td>AST 10-40, ALT 7-56, Bili <1.2, Albumin 3.5-5.0</td><td>Liver disease, synthetic function</td></tr><tr><td><strong>Tumor Markers</strong></td><td>PSA <4 ng/mL, CEA <5 ng/mL, CA-19-9 <37 U/mL</td><td>Cancer screening, monitoring response</td></tr></table><p><strong>Interpretation:</strong> Values vary by lab, specimen type, and patient factors. Always review trends, not isolated values.</p>',
      tags: ['laboratory', 'reference', 'values', 'guidelines'],
      sourceType: 'MANUAL',
      sourceFilename: null,
      chunks: [
        {
          chunkIndex: 0,
          text: 'Lab Reference Values: CBC (WBC 4.5-11K, Hgb 12-18), CMP (Glucose 70-100, Na 135-145, K 3.5-5, Cr 0.6-1.2), LFTs (AST 10-40, ALT 7-56), Tumor markers (PSA <4, CEA <5, CA-19-9 <37). Interpret trends, not isolated values.',
          tokenCount: 51,
        },
      ],
      linkedSecretName: null,
      createdAt: '2026-04-20T11:15:00.000Z',
      updatedAt: '2026-04-20T11:15:00.000Z',
    },
  ],
  tags: ['radiology', 'chest', 'imaging', 'guidelines', 'pathology', 'histology', 'reporting', 'standards', 'oncology', 'protocols', 'nccn', 'laboratory', 'reference', 'values'],
  settings: {},
}

db.settings = seedSettings(db.knowledge)
