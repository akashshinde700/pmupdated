# ========================================================================
# ENHANCED SNOMED CT IMPORT - ALL EXTENSIONS WITH PROPER MAPPING
# ========================================================================
Write-Host "=== Enhanced SNOMED CT Import ===" -ForegroundColor Green

# Configuration
$BaseDir = "C:\Users\ACER\Downloads\patient_management_jaju-master\snomedct"
$InternationalRF2 = "$BaseDir\SnomedCT_InternationalRF2_PRODUCTION_20260101T120000Z"
$IndiaDrug = "$BaseDir\SnomedCT_IndiaDrugExtensionRF2_PRODUCTION_IN1000189_20251219T120000Z"
$IndiaAYUSH = "$BaseDir\SnomedCT_IndiaAYUSHExtensionRF2_PRODUCTION_IN1000189_20250814T120000Z"
$IndiaCovid = "$BaseDir\SnomedCT_IndiaCovid-19ExtensionRF2_PRODUCTION_IN1000189_20210806T120000Z"
$IndiaGeo = "$BaseDir\SnomedCT_IndiaGeographicalLocationExtensionRF2_Production_IN1000189_20210806T120000Z"

# MySQL Configuration
$MySqlPath = "C:\xampp\mysql\bin\mysql.exe"
$Database = "patient_management"
$User = "root"

function Invoke-MySQLFile {
    param([string]$SqlFile)

    if (!(Test-Path $SqlFile)) {
        throw "SQL file not found: $SqlFile"
    }

    $mysqlArgs = @(
        "--local-infile=1",
        "--default-character-set=utf8mb4",
        "-u", $User,
        $Database
    )

    Write-Host "Running SQL: $SqlFile" -ForegroundColor Cyan
    Get-Content -Path $SqlFile -Encoding UTF8 | & $MySqlPath @mysqlArgs
    if ($LASTEXITCODE -ne 0) {
        throw "mysql failed for $SqlFile (exit code $LASTEXITCODE)"
    }
}

function ConvertTo-MySqlInfilePath {
    param([string]$Path)
    return ($Path -replace "\\", "/")
}

function Expand-SqlTemplate {
    param(
        [string]$TemplatePath,
        [hashtable]$Replacements
    )

    if (!(Test-Path $TemplatePath)) {
        throw "SQL template not found: $TemplatePath"
    }

    $sql = Get-Content -Path $TemplatePath -Raw -Encoding UTF8
    foreach ($k in $Replacements.Keys) {
        $sql = $sql.Replace($k, $Replacements[$k])
    }

    $outFile = "$env:TEMP\snomed_import_$([Guid]::NewGuid().ToString("N")).sql"
    $sql | Out-File -FilePath $outFile -Encoding UTF8 -Force
    return $outFile
}

Write-Host "Preparing SQL template..." -ForegroundColor Yellow

$template = Join-Path $PSScriptRoot "enhanced_snomed_import_template.sql"
$expanded = Expand-SqlTemplate -TemplatePath $template -Replacements @{
    "{{INT_CONCEPT}}" = (ConvertTo-MySqlInfilePath -Path "$InternationalRF2\Full\Terminology\sct2_Concept_Full_INT_20260101.txt")
    "{{INT_DESC_EN}}" = (ConvertTo-MySqlInfilePath -Path "$InternationalRF2\Full\Terminology\sct2_Description_Full-en_INT_20260101.txt")
    "{{INT_REL}}" = (ConvertTo-MySqlInfilePath -Path "$InternationalRF2\Full\Terminology\sct2_Relationship_Full_INT_20260101.txt")
    "{{DRUG_CONCEPT}}" = (ConvertTo-MySqlInfilePath -Path "$IndiaDrug\Full\Terminology\sct2_Concept_Full_IN1000189_20251219.txt")
    "{{DRUG_DESC}}" = (ConvertTo-MySqlInfilePath -Path "$IndiaDrug\Full\Terminology\sct2_Description_Full_IN1000189_20251219.txt")
    "{{DRUG_REL}}" = (ConvertTo-MySqlInfilePath -Path "$IndiaDrug\Full\Terminology\sct2_Relationship_Full_IN1000189_20251219.txt")
    "{{AYUSH_CONCEPT}}" = (ConvertTo-MySqlInfilePath -Path "$IndiaAYUSH\Full\Terminology\sct2_Concept_Full_IN1000189_20250814.txt")
    "{{AYUSH_DESC}}" = (ConvertTo-MySqlInfilePath -Path "$IndiaAYUSH\Full\Terminology\sct2_Description_Full-sa-ta-ur_IN1000189_20250814.txt")
    "{{AYUSH_REL}}" = (ConvertTo-MySqlInfilePath -Path "$IndiaAYUSH\Full\Terminology\sct2_Relationship_Full_IN1000189_20250814.txt")
    "{{COVID_CONCEPT}}" = (ConvertTo-MySqlInfilePath -Path "$IndiaCovid\Full\Terminology\sct2_Concept_Full_IN1000189_20210806.txt")
    "{{COVID_DESC}}" = (ConvertTo-MySqlInfilePath -Path "$IndiaCovid\Full\Terminology\sct2_Description_Full-en_IN1000189_20210806.txt")
    "{{COVID_REL}}" = (ConvertTo-MySqlInfilePath -Path "$IndiaCovid\Full\Terminology\sct2_Relationship_Full_IN1000189_20210806.txt")
    "{{GEO_CONCEPT}}" = (ConvertTo-MySqlInfilePath -Path "$IndiaGeo\Full\Terminology\sct2_Concept_Full_IN1000189_20210806.txt")
    "{{GEO_DESC}}" = (ConvertTo-MySqlInfilePath -Path "$IndiaGeo\Full\Terminology\sct2_Description_Full-en_IN1000189_20210806.txt")
    "{{GEO_REL}}" = (ConvertTo-MySqlInfilePath -Path "$IndiaGeo\Full\Terminology\sct2_Relationship_Full_IN1000189_20210806.txt")
}

Invoke-MySQLFile -SqlFile $expanded

# Summary
Write-Host ""
Write-Host "=== Enhanced SNOMED CT Import Summary ===" -ForegroundColor Green
Invoke-MySQLFile -SqlFile (Expand-SqlTemplate -TemplatePath (Join-Path $PSScriptRoot "enhanced_snomed_import_summary.sql") -Replacements @{})

Write-Host ""
Write-Host "=== Enhanced SNOMED CT Import Complete ===" -ForegroundColor Green
Write-Host "All SNOMED CT extensions imported successfully!" -ForegroundColor Yellow
