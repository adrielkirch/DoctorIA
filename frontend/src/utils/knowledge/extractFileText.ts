const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.docx', '.csv']

export type FileExtractionErrorCode = 'UNSUPPORTED_TYPE' | 'TOO_LARGE' | 'EMPTY_CONTENT'

export class FileExtractionError extends Error {
  constructor(
    public readonly code: FileExtractionErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'FileExtractionError'
  }
}

function getExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase()
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

async function extractPdf(file: File): Promise<string> {
  const arrayBuffer = await readAsArrayBuffer(file)
  const pdfjs = await import('pdfjs-dist')


  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString()

  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    const pageText = content.items
      .map(item => ('str' in item ? item.str : ''))
      .filter(Boolean)
      .join(' ')

    pages.push(pageText)
  }

  return pages.join('\n\n').trim()
}

async function extractDocx(file: File): Promise<string> {
  const arrayBuffer = await readAsArrayBuffer(file)
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer })

  return result.value.trim()
}

async function extractCsv(file: File): Promise<string> {
  const text = await readAsText(file)
  const Papa = await import('papaparse')
  const result = Papa.default.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })

  return result.data
    .map(row => Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(', '))
    .join('\n')
}

export async function extractFileText(file: File): Promise<string> {
  const ext = getExtension(file.name)

  if (!SUPPORTED_EXTENSIONS.includes(ext))
    throw new FileExtractionError('UNSUPPORTED_TYPE', 'Unsupported file type. Accepted: .pdf, .txt, .docx, .csv')

  if (file.size > MAX_FILE_SIZE)
    throw new FileExtractionError('TOO_LARGE', 'File too large. Maximum size is 5 MB.')

  let text = ''

  if (ext === '.txt')
    text = await readAsText(file)
  else if (ext === '.pdf')
    text = await extractPdf(file)
  else if (ext === '.docx')
    text = await extractDocx(file)
  else if (ext === '.csv')
    text = await extractCsv(file)

  if (!text.trim())
    throw new FileExtractionError('EMPTY_CONTENT', 'Could not extract text from this file. It may be empty or image-only.')

  return text
}
