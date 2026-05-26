"use client"

function escapeCsvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    const blob = new Blob([""], { type: "text/csv;charset=utf-8;" })
    triggerDownload(filename, blob)
    return
  }

  const headers = Object.keys(rows[0])
  const csv = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ].join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  triggerDownload(filename, blob)
}

type ExcelCellValue = string | number | boolean | null | undefined
type ExcelCell = ExcelCellValue | {
  value: ExcelCellValue
  styleId?: string
  mergeAcross?: number
}

type ExcelSheet = {
  name: string
  rows: ExcelCell[][]
  columns?: number[]
}

const excelStyleIds = {
  Header: 1,
  Vertical: 2,
  TitleCenter: 3,
  SectionTitle: 4,
  GreenHeader: 5,
  GreenHeaderCenter: 6,
  Bordered: 7,
} as const

function escapeXml(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value)
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function sanitizeSheetName(name: string) {
  return name.replace(/[:\\/?*\[\]]/g, " ").trim().slice(0, 31) || "Hoja"
}

export function downloadExcel(filename: string, sheets: ExcelSheet[]) {
  const getCellValue = (cell: ExcelCell) =>
    typeof cell === "object" && cell !== null && "value" in cell ? cell.value : cell
  const getCellStyle = (cell: ExcelCell, rowIndex: number) => {
    if (typeof cell === "object" && cell !== null && "value" in cell && cell.styleId) {
      return ` ss:StyleID="${escapeXml(cell.styleId)}"`
    }
    return rowIndex === 0 ? ' ss:StyleID="Header"' : String(getCellValue(cell)).startsWith("Vertical:") ? ' ss:StyleID="Vertical"' : ""
  }
  const getCellMerge = (cell: ExcelCell) =>
    typeof cell === "object" && cell !== null && "value" in cell && cell.mergeAcross ? ` ss:MergeAcross="${cell.mergeAcross}"` : ""

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#EAF2FF" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
    <Style ss:ID="Vertical"><Font ss:Bold="1"/><Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/></Style>
    <Style ss:ID="TitleCenter"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="14"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
    <Style ss:ID="SectionTitle"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1"/><Interior ss:Color="#F2F2F2" ss:Pattern="Solid"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
    <Style ss:ID="GreenHeader"><Font ss:Bold="1"/><Interior ss:Color="#93C47D" ss:Pattern="Solid"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
    <Style ss:ID="GreenHeaderCenter"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1"/><Interior ss:Color="#93C47D" ss:Pattern="Solid"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
    <Style ss:ID="Bordered"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
  </Styles>
  ${sheets.map((sheet) => `
  <Worksheet ss:Name="${escapeXml(sanitizeSheetName(sheet.name))}">
    <Table>
      ${(sheet.columns ?? []).map((width) => `<Column ss:Width="${width}"/>`).join("")}
      ${sheet.rows.map((row, rowIndex) => `
      <Row>${row.map((cell) => {
        const value = getCellValue(cell)
        const style = getCellStyle(cell, rowIndex)
        const merge = getCellMerge(cell)
        const isNumber = typeof value === "number" && Number.isFinite(value)
        const type = isNumber ? "Number" : "String"
        return `<Cell${style}${merge}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`
      }).join("")}</Row>`).join("")}
    </Table>
  </Worksheet>`).join("")}
</Workbook>`

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8;" })
  triggerDownload(filename, blob)
}

export function downloadXlsx(filename: string, sheets: ExcelSheet[]) {
  const workbookSheets = sheets.map((sheet, index) =>
    `<sheet name="${escapeXml(sanitizeSheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
  ).join("")
  const workbookRels = sheets.map((_, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  ).join("")
  const sheetOverrides = sheets.map((_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join("")

  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${workbookSheets}</sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${workbookRels}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    "xl/styles.xml": getXlsxStylesXml(),
    ...Object.fromEntries(sheets.map((sheet, index) => [`xl/worksheets/sheet${index + 1}.xml`, getXlsxSheetXml(sheet)])),
  }

  const blob = new Blob([createZip(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  triggerDownload(filename, blob)
}

function getCellValue(cell: ExcelCell) {
  return typeof cell === "object" && cell !== null && "value" in cell ? cell.value : cell
}

function getStyleId(cell: ExcelCell, rowIndex: number) {
  if (typeof cell === "object" && cell !== null && "value" in cell && cell.styleId) {
    return excelStyleIds[cell.styleId as keyof typeof excelStyleIds] ?? 0
  }
  if (rowIndex === 0) return excelStyleIds.Header
  return String(getCellValue(cell)).startsWith("Vertical:") ? excelStyleIds.Vertical : 0
}

function getMergeAcross(cell: ExcelCell) {
  return typeof cell === "object" && cell !== null && "value" in cell && cell.mergeAcross ? cell.mergeAcross : 0
}

function getColumnName(index: number) {
  let name = ""
  let current = index
  while (current > 0) {
    const remainder = (current - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    current = Math.floor((current - 1) / 26)
  }
  return name
}

function getXlsxSheetXml(sheet: ExcelSheet) {
  const mergeRefs: string[] = []
  const cols = sheet.columns?.length
    ? `<cols>${sheet.columns.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.max(8, Math.round(width / 7))}" customWidth="1"/>`).join("")}</cols>`
    : ""
  const rows = sheet.rows.map((row, rowIndex) => {
    let columnIndex = 1
    const cells = row.map((cell) => {
      const value = getCellValue(cell)
      const styleId = getStyleId(cell, rowIndex)
      const mergeAcross = getMergeAcross(cell)
      const cellRef = `${getColumnName(columnIndex)}${rowIndex + 1}`
      if (mergeAcross) {
        mergeRefs.push(`${cellRef}:${getColumnName(columnIndex + mergeAcross)}${rowIndex + 1}`)
      }
      columnIndex += mergeAcross + 1

      if (typeof value === "number" && Number.isFinite(value)) {
        return `<c r="${cellRef}" s="${styleId}"><v>${value}</v></c>`
      }

      return `<c r="${cellRef}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
    }).join("")
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join("")
  const merges = mergeRefs.length
    ? `<mergeCells count="${mergeRefs.length}">${mergeRefs.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`
    : ""

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${cols}
  <sheetData>${rows}</sheetData>
  ${merges}
</worksheet>`
}

function getXlsxStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF2FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF93C47D"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="8">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
}

function createZip(files: Record<string, string>) {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(content)
    const crc = crc32(data)
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, 0, true)
    localView.setUint16(12, 0, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, data.length, true)
    localView.setUint32(22, data.length, true)
    localView.setUint16(26, nameBytes.length, true)
    localHeader.set(nameBytes, 30)
    localParts.push(localHeader, data)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, 0, true)
    centralView.setUint16(14, 0, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, data.length, true)
    centralView.setUint32(24, data.length, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint32(42, offset, true)
    centralHeader.set(nameBytes, 46)
    centralParts.push(centralHeader)

    offset += localHeader.length + data.length
  })

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, Object.keys(files).length, true)
  endView.setUint16(10, Object.keys(files).length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)

  return new Blob([...localParts, ...centralParts, end])
}

function crc32(data: Uint8Array) {
  let crc = -1
  for (const byte of data) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff]
  }
  return (crc ^ -1) >>> 0
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
