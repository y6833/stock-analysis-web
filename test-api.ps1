Write-Host "测试 Tushare API 连接..."

$uri = "https://api.tushare.pro/"
$headers = @{
    "Content-Type" = "application/json"
    "Accept" = "application/json, text/plain, */*"
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    "Referer" = "http://localhost:5173/"
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

Write-Host "请求体: $body"

try {
    $response = Invoke-WebRequest -Uri $uri -Method Post -Headers $headers -Body $body -UseBasicParsing
    
    Write-Host "状态码: $($response.StatusCode)"
    
    $content = $response.Content | ConvertFrom-Json
    
    if ($content.code -eq 0) {
        Write-Host "API调用成功!"
        Write-Host "获取到 $($content.data.items.Count) 条数据"
        Write-Host "数据字段: $($content.data.fields -join ', ')"
        Write-Host "示例数据 (前3条):"
        $content.data.items | Select-Object -First 3 | ForEach-Object {
            Write-Host $_ -ForegroundColor Green
        }
    } else {
        Write-Host "API调用失败: $($content.msg)" -ForegroundColor Red
    }
} catch {
    Write-Host "请求失败: $_" -ForegroundColor Red
}
