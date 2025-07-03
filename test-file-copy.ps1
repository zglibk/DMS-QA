$filePath = "\\tj_server\工作\品质部\生产异常周报考核统计\2025年异常汇总\不良图片&资料\A125-1\A125-1 GD25030624 4吋尿片桶80呎膜内标-折痕（退货）25040801.jpg"

$body = @{
    filePath = $filePath
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/import/test-file-copy' -Method POST -Body $body -ContentType 'application/json'
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
