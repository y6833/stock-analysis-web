Write-Host "Testing Tushare API connection..."

$uri = "https://api.tushare.pro/"
$headers = @{
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$body = @{
    api_name = "stock_basic"
    token = "983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61"
    params = @{
        exchange = ""
        list_status = "L"
        fields = "ts_code,name,industry,market,list_date"
    }
} | ConvertTo-Json

Write-Host "Request body: $body"

try {
    $response = Invoke-WebRequest -Uri $uri -Method Post -Headers $headers -Body $body
    
    Write-Host "Status code: $($response.StatusCode)"
    
    $content = $response.Content | ConvertFrom-Json
    
    if ($content.code -eq 0) {
        Write-Host "API call successful!"
        Write-Host "Retrieved $($content.data.items.Count) records"
    } else {
        Write-Host "API call failed: $($content.msg)"
    }
} catch {
    Write-Host "Request failed: $_"
}
