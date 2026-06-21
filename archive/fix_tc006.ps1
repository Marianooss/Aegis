$path = 'C:\Users\Marianooss\Desktop\mi-proyecto\Aegis\test-scenarios\TC-006-ContradictoryNote.json'
$content = Get-Content -Path $path -Raw -Encoding UTF8
$old = '"evidence": "Nota de enfermeria documenta alergia a ibuprofeno con reaccion cutanea documentada en guardia hace 6 meses. Pendiente actualizacion."'
$new = '"evidence": "Nursing note documents ibuprofen allergy with documented skin rash in emergency department 6 months ago. Pending update."'
$content = $content.Replace($old, $new)
Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host 'Done'
