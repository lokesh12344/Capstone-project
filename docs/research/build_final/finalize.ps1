# Opens the docx in Word, updates all fields (SEQ caption numbers, TOC, lists of
# figures/tables, page numbers) twice so page numbers settle, saves the docx and
# exports the PDF.
$docx = "C:\Users\Shubhan\OneDrive\Desktop\capstone\docs\research\final\Voice_Khata_Proposal.docx"
$pdf  = "C:\Users\Shubhan\OneDrive\Desktop\capstone\docs\research\final\Voice_Khata_Proposal.pdf"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($docx, $false, $false)
  for ($pass = 1; $pass -le 2; $pass++) {
    $doc.Fields.Update() | Out-Null
    foreach ($t in $doc.TablesOfContents) { $t.Update() | Out-Null }
    foreach ($t in $doc.TablesOfFigures) { $t.Update() | Out-Null }
    $doc.Repaginate()
  }
  "TOCs: " + $doc.TablesOfContents.Count + "  lists of figures/tables: " + $doc.TablesOfFigures.Count
  $doc.Save()
  $doc.ExportAsFixedFormat($pdf, 17, $false, 0, 0, 0, 0, 0, $true, $true, 1)
  $doc.Close($false)
} finally { $word.Quit() }
