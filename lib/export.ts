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

type ExcelCell = string | number | boolean | null | undefined

type ExcelSheet = {
  name: string
  rows: ExcelCell[][]
}

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
  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#EAF2FF" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Vertical"><Font ss:Bold="1"/><Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/></Style>
  </Styles>
  ${sheets.map((sheet) => `
  <Worksheet ss:Name="${escapeXml(sanitizeSheetName(sheet.name))}">
    <Table>
      ${sheet.rows.map((row, rowIndex) => `
      <Row>${row.map((cell) => {
        const style = rowIndex === 0 ? ' ss:StyleID="Header"' : String(cell).startsWith("Vertical:") ? ' ss:StyleID="Vertical"' : ""
        const isNumber = typeof cell === "number" && Number.isFinite(cell)
        const type = isNumber ? "Number" : "String"
        return `<Cell${style}><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`
      }).join("")}</Row>`).join("")}
    </Table>
  </Worksheet>`).join("")}
</Workbook>`

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8;" })
  triggerDownload(filename, blob)
}

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
