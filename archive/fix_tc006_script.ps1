$path = 'C:\Users\Marianooss\Desktop\mi-proyecto\Aegis\test-scenarios\TC-006-ContradictoryNote.json'
$bytes = [System.IO.File]::ReadAllBytes($path)
$utf8 = [System.Text.Encoding]::UTF8
$content = $utf8.GetString($bytes)
$old = '"evidence": "Nota de enfermer\u00eda documenta alergia a ibuprofeno con reacci\u00f3n cut\u00e1nea documentada en guardia hace 6 meses. Pendiente actualizaci\u00f3n."'
$new = '"evidence": "Nursing note documents ibuprofen allergy with documented skin rash in emergency department 6 months ago. Pending update."'
$content = $content.Replace($old, $new)
[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Host 'Done'
