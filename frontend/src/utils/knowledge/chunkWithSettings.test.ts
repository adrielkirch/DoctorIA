import type { KnowledgeChunkingSettings } from '@/types/knowledge'
import { createDefaultKnowledgeSettings, normalizeKnowledgeSettings } from '@/types/knowledge'
import { describe, expect, it } from 'vitest'
import {
    applyPreProcessing,
    buildChunkPreview,
    buildChunks,
    decodeSegmentIdentifier,
    htmlToPlainText,
    splitBySegment,
} from './chunkWithSettings'

function withSettings(patch: (settings: KnowledgeChunkingSettings) => void): KnowledgeChunkingSettings {
  const settings = createDefaultKnowledgeSettings()

  patch(settings)

  return settings
}

describe('decodeSegmentIdentifier', () => {
  it('decodifica os escapes digitados na UI', () => {
    expect(decodeSegmentIdentifier('\\n')).toBe('\n')
    expect(decodeSegmentIdentifier('\\n\\n')).toBe('\n\n')
    expect(decodeSegmentIdentifier('\\t')).toBe('\t')
    expect(decodeSegmentIdentifier('\\r\\n')).toBe('\r\n')
  })

  it('mantém texto sem escape intacto', () => {
    expect(decodeSegmentIdentifier('###')).toBe('###')
  })
})

describe('applyPreProcessing', () => {
  const rules = { replaceConsecutiveWhitespace: true, removeUrlsAndEmails: true }

  it('remove URLs e e-mails', () => {
    const output = applyPreProcessing('Veja https://dify.ai/docs e fale com support@dify.ai agora', rules)

    expect(output).toBe('Veja e fale com agora')
  })

  it('colapsa espaços/tabs consecutivos e preserva parágrafos', () => {
    const output = applyPreProcessing('linha   1\t\tfim\n\n\n\nlinha 2', rules)

    expect(output).toBe('linha 1 fim\n\nlinha 2')
  })

  it('é no-op quando as regras estão desligadas', () => {
    const text = 'a    b http://x.dev \n\n\n c'

    expect(applyPreProcessing(text, { replaceConsecutiveWhitespace: false, removeUrlsAndEmails: false })).toBe(text)
  })
})

describe('splitBySegment', () => {
  it('divide pelo identificador e descarta pedaços vazios', () => {
    expect(splitBySegment('a\n\nb\n\n', '\\n\\n')).toEqual(['a', 'b'])
  })

  it('sem identificador devolve o texto inteiro', () => {
    expect(splitBySegment('  a\nb  ', '')).toEqual(['a\nb'])
  })
})

describe('buildChunks — modo Geral', () => {
  it('usa o comprimento máximo e a sobreposição configurados', () => {
    const settings = withSettings(draft => {
      draft.general.segmentIdentifier = '\\n'
      draft.general.maxChunkLength = 10
      draft.general.chunkOverlap = 2
    })

    const chunks = buildChunks('abcdefghij\nklmnopqrst', settings)

    expect(chunks).toHaveLength(2)
    expect(chunks[0].text).toBe('abcdefghij')
    expect(chunks[1].text).toBe('klmnopqrst')
    expect(chunks.map(chunk => chunk.chunkIndex)).toEqual([0, 1])
    expect(chunks[0].tokenCount).toBe(3)
  })

  it('aplica a sobreposição em segmentos longos', () => {
    const settings = withSettings(draft => {
      draft.general.segmentIdentifier = '\\n'
      draft.general.maxChunkLength = 5
      draft.general.chunkOverlap = 2
    })

    const chunks = buildChunks('1234567890', settings)


    expect(chunks.map(chunk => chunk.text)).toEqual(['12345', '45678', '7890'])
  })

  it('respeita o formato Q&A (mantém o texto pré-processado)', () => {
    const settings = withSettings(draft => {
      draft.general.maxChunkLength = 2000
      draft.general.qaFormat = true
      draft.general.qaFormatLanguage = 'Português'
      draft.general.preProcessing.removeUrlsAndEmails = true
    })

    const chunks = buildChunks('Pergunta? https://x.dev Sim.', settings)

    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).not.toContain('https://x.dev')


    expect(chunks[0].text).toBe('Pergunta?   Sim.')
  })
})

describe('buildChunks — modo Pai-filho', () => {
  const source = 'Titulo A\n\nParagrafo 1 linha 1\nParagrafo 1 linha 2\n\nTitulo B\n\nParagrafo 2'

  it('usa o filho como chunk de recuperação', () => {
    const settings = withSettings(draft => {
      draft.mode = 'PARENT_CHILD'
    })

    const chunks = buildChunks(source, settings)

    expect(chunks).toHaveLength(5)
    expect(chunks.map(chunk => chunk.text)).toEqual([
      'Titulo A',
      'Paragrafo 1 linha 1',
      'Paragrafo 1 linha 2',
      'Titulo B',
      'Paragrafo 2',
    ])
  })

  it('expõe pai e filho no preview (pai para contexto/recall)', () => {
    const preview = buildChunkPreview(source, withSettings(draft => {
      draft.mode = 'PARENT_CHILD'
    }))

    const parents = preview.filter(chunk => chunk.kind === 'PARENT')
    const children = preview.filter(chunk => chunk.kind === 'CHILD')

    expect(parents).toHaveLength(4)
    expect(parents[0].text).toBe('Titulo A')
    expect(children).toHaveLength(5)
    expect(preview.map(chunk => chunk.chunkIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('Doc completo usa o documento inteiro como pai', () => {
    const preview = buildChunkPreview(source, withSettings(draft => {
      draft.mode = 'PARENT_CHILD'
      draft.parentChild.parentMode = 'FULL_DOC'
    }))

    const parents = preview.filter(chunk => chunk.kind === 'PARENT')

    expect(parents).toHaveLength(1)
    expect(parents[0].text).toBe(source)
  })

  it('corta o filho pelo comprimento máximo configurado', () => {
    const chunks = buildChunks('aaaaaaaaaa\nbbbbbbbbbb', withSettings(draft => {
      draft.mode = 'PARENT_CHILD'
      draft.parentChild.childMaxChunkLength = 10
    }))

    expect(chunks.map(chunk => chunk.text)).toEqual(['aaaaaaaaaa', 'bbbbbbbbbb'])
  })
})

describe('buildChunkPreview — modo Geral', () => {
  it('devolve vazio quando não há texto', () => {
    expect(buildChunkPreview('   ', createDefaultKnowledgeSettings())).toEqual([])
  })

  it('marca os pedaços como CHUNK', () => {
    const preview = buildChunkPreview('linha um\nlinha dois', createDefaultKnowledgeSettings())

    expect(preview).toHaveLength(2)
    expect(preview.every(chunk => chunk.kind === 'CHUNK')).toBe(true)
  })
})

describe('htmlToPlainText', () => {
  it('converte o HTML do editor rico em texto plano com quebras', () => {
    expect(htmlToPlainText('<h1>Titulo</h1><p>a<br>b</p><p>c</p>')).toBe('Titulo\na\nb\nc')
  })

  it('decodifica entidades básicas', () => {
    expect(htmlToPlainText('<p>a &amp; b&nbsp;c</p>')).toBe('a & b c')
  })
})

describe('normalizeKnowledgeSettings', () => {
  it('preenche defaults quando o payload vem vazio', () => {
    const settings = normalizeKnowledgeSettings(null)

    expect(settings.mode).toBe('GENERAL')
    expect(settings.general.maxChunkLength).toBe(1024)
    expect(settings.general.chunkOverlap).toBe(50)
    expect(settings.parentChild.childMaxChunkLength).toBe(512)
    expect(settings.index.mode).toBe('HIGH_QUALITY')
    expect(settings.retrieval.topK).toBe(3)
    expect(settings.retrieval.scoreThreshold).toBe(0.5)
    expect(settings.retrieval.semanticWeight + settings.retrieval.keywordWeight).toBeCloseTo(1)
  })

  it('trava os valores nos limites conhecidos', () => {
    const settings = normalizeKnowledgeSettings({
      general: { maxChunkLength: 99999, chunkOverlap: -10 } as never,
      retrieval: { topK: 99, scoreThreshold: 3 } as never,
    })

    expect(settings.general.maxChunkLength).toBe(4000)
    expect(settings.general.chunkOverlap).toBe(0)
    expect(settings.retrieval.topK).toBe(10)
    expect(settings.retrieval.scoreThreshold).toBe(1)
  })

  it('força índice de alta qualidade no modo pai-filho', () => {
    const settings = normalizeKnowledgeSettings({
      mode: 'PARENT_CHILD',
      index: { mode: 'ECONOMICAL', embeddingModel: '' },
    })

    expect(settings.index.mode).toBe('HIGH_QUALITY')
  })
})
