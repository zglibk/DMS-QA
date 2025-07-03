$body = @{
    username = "admin"
    password = "123456"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
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
