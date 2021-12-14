$CacheModel = @{
    'cacheKey'='joe'
    'cachevalue'='doe'
}
$json = $CacheModel | ConvertTo-Json
$response = Invoke-RestMethod 'https://localhost:44352/api/RedisCache/SetCacheData' -Method Post -Body $json -ContentType 'application/json'





