/**
 * Client-side XLSX export for FieldLedger reconciliation.
 * TODO: Migrate to server-side using the pure-JS XLSX builder pattern
 * from the Gantt tool before production launch. Client-side is fine for v1.
 */

function esc(val) {
  if (val === null || val === undefined) return ''
  return String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function numCell(val, bold = false, color = null) {
  const style = bold ? (color === 'red' ? 's5' : color === 'green' ? 's6' : 's2') : (color === 'red' ? 's7' : color === 'green' ? 's8' : 's3')
  const v = parseFloat(val) || 0
  return `<Cell ss:StyleID="${style}"><Data ss:Type="Number">${v}</Data></Cell>`
}

function strCell(val, bold = false, indent = false) {
  const style = bold ? 's2' : indent ? 's4' : 's1'
  return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${esc(val)}</Data></Cell>`
}

function emptyCell(n = 1) {
  return `<Cell ss:StyleID="s1" ss:MergeAcross="${n - 1}"><Data ss:Type="String"></Data></Cell>`
}

export function exportReconciliationXlsx({ job, entries, payments, budgetOn, budgets }) {
  const fmt2 = n => (parseFloat(n) || 0).toFixed(2)

  const ohpRate = (job.ohp || 28) / 100

  const byCode = {}
  entries.forEach(e => { byCode[e.cost_code] = (byCode[e.cost_code] || 0) + parseFloat(e.amount || 0) })
  const allCodes = Object.keys(byCode).sort()
  const totalCost = allCodes.reduce((s, c) => s + byCode[c], 0)
  const ohpAmt = totalCost * ohpRate
  const projectTotal = totalCost + ohpAmt
  const totalBudget = budgetOn ? allCodes.reduce((s, c) => s + (budgets[c] || 0), 0) : 0
  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  const balanceDue = projectTotal - totalPaid

  const headerCols = budgetOn
    ? ['Cost Code', 'Budget', 'Actuals', 'Over / Under', 'Notes']
    : ['Cost Code', 'Actuals', 'Over / Under', 'Notes']

  let rows = []

  // Title row
  rows.push(`<Row><Cell ss:StyleID="s2" ss:MergeAcross="${headerCols.length - 1}"><Data ss:Type="String">${esc(job.name)}${job.client ? ' — ' + esc(job.client) : ''}</Data></Cell></Row>`)
  rows.push(`<Row ss:Height="6"/>`)

  // Header row
  const hCells = headerCols.map(h => `<Cell ss:StyleID="s9"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join('')
  rows.push(`<Row>${hCells}</Row>`)

  // Cost code rows
  allCodes.forEach(code => {
    const actual = byCode[code] || 0
    const budget = budgetOn ? (budgets[code] || 0) : 0
    const ou = budgetOn && budget ? actual - budget : null
    const ouColor = ou === null ? null : ou > 0 ? 'red' : 'green'

    if (budgetOn) {
      rows.push(`<Row>${strCell(code, true)}${numCell(budget, true)}${numCell(actual, true)}${numCell(ou, true, ouColor)}${strCell('', false)}</Row>`)
    } else {
      rows.push(`<Row>${strCell(code, true)}${numCell(actual, true)}${numCell(ou, true, ouColor)}${strCell('', false)}</Row>`)
    }

    entries.filter(e => e.cost_code === code).forEach(e => {
      const label = [e.payee, e.payment_type].filter(Boolean).join(' — ')
      if (budgetOn) {
        rows.push(`<Row>${strCell(label, false, true)}${emptyCell(1)}${numCell(e.amount)}${emptyCell(1)}${strCell(e.description || '')}</Row>`)
      } else {
        rows.push(`<Row>${strCell(label, false, true)}${numCell(e.amount)}${emptyCell(1)}${strCell(e.description || '')}</Row>`)
      }
    })
  })

  rows.push(`<Row ss:Height="6"/>`)

  // Subtotals
  const ouTotal = budgetOn && totalBudget ? totalCost - totalBudget : null
  const ouTotalColor = ouTotal === null ? null : ouTotal > 0 ? 'red' : 'green'

  if (budgetOn) {
    rows.push(`<Row>${strCell('Cost subtotal', true)}${numCell(totalBudget, true)}${numCell(totalCost, true)}${numCell(ouTotal, true, ouTotalColor)}${emptyCell(1)}</Row>`)
    rows.push(`<Row>${strCell(`OH & profit (${job.ohp || 28}%)`, true)}${numCell(totalBudget * ohpRate, true)}${numCell(ohpAmt, true)}${emptyCell(1)}${emptyCell(1)}</Row>`)
    rows.push(`<Row>${strCell('Project total', true)}${numCell(totalBudget * (1 + ohpRate), true)}${numCell(projectTotal, true)}${emptyCell(1)}${emptyCell(1)}</Row>`)
  } else {
    rows.push(`<Row>${strCell('Cost subtotal', true)}${numCell(totalCost, true)}${emptyCell(1)}${emptyCell(1)}</Row>`)
    rows.push(`<Row>${strCell(`OH & profit (${job.ohp || 28}%)`, true)}${numCell(ohpAmt, true)}${emptyCell(1)}${emptyCell(1)}</Row>`)
    rows.push(`<Row>${strCell('Project total', true)}${numCell(projectTotal, true)}${emptyCell(1)}${emptyCell(1)}</Row>`)
  }

  rows.push(`<Row ss:Height="12"/>`)

  // Payments section
  rows.push(`<Row><Cell ss:StyleID="s2"><Data ss:Type="String">Payments received</Data></Cell></Row>`)
  payments.forEach(p => {
    rows.push(`<Row>${strCell(p.label)}${numCell(p.amount)}${emptyCell(budgetOn ? 3 : 2)}</Row>`)
  })
  rows.push(`<Row>${strCell('Total paid', true)}${numCell(totalPaid, true)}${emptyCell(budgetOn ? 3 : 2)}</Row>`)
  rows.push(`<Row>${strCell('Balance due', true)}${numCell(balanceDue, true, balanceDue > 0 ? 'red' : 'green')}${emptyCell(budgetOn ? 3 : 2)}</Row>`)

  const colWidths = budgetOn
    ? [280, 90, 90, 90, 200]
    : [280, 90, 90, 200]

  const colDefs = colWidths.map(w => `<Column ss:Width="${w}"/>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="s1"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/></Style>
    <Style ss:ID="s2"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/></Style>
    <Style ss:ID="s3"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/><NumberFormat ss:Format='$#,##0.00'/></Style>
    <Style ss:ID="s4"><Alignment ss:Vertical="Center" ss:Indent="1"/><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#6B6860"/></Style>
    <Style ss:ID="s5"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><NumberFormat ss:Format='$#,##0.00'/></Style>
    <Style ss:ID="s6"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#1A6640"/><NumberFormat ss:Format='$#,##0.00'/></Style>
    <Style ss:ID="s7"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#B91C1C"/><NumberFormat ss:Format='$#,##0.00'/></Style>
    <Style ss:ID="s8"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1A6640"/><NumberFormat ss:Format='$#,##0.00'/></Style>
    <Style ss:ID="s9"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#6B6860"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E0D8"/></Borders></Style>
  </Styles>
  <Worksheet ss:Name="Reconciliation">
    <Table>${colDefs}${rows.join('')}</Table>
  </Worksheet>
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${job.name.replace(/[^a-z0-9]/gi, '_')}_reconciliation.xls`
  a.click()
  URL.revokeObjectURL(url)
}
