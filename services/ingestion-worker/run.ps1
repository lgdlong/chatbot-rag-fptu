# Tự động nạp các biến môi trường từ file .env ở gốc dự án và khởi chạy Go Ingestion Worker
Get-Content ../../.env | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        if ($line -match "^([^=]+)=(.*)$") {
            $name = $Matches[1].Trim()
            $val = $Matches[2].Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($name, $val, 'Process')
        }
    }
}
Write-Host "[Powershell] Đã nạp thành công biến môi trường từ file .env gốc."
go run main.go
