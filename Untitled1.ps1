$Global:PsRedisCacheConnection = $null
$Global:PsRedisServerConnection = $null
$Global:PsRedisDatabaseIndex = 0
#Connect-Redis -ConnectionString "pratap.redis.cache.windows.net:6380,password=r0OeQeLO6WNohRRRtxZJdJqbqJ6iJe4ouAzCaMdTjRg=,ssl=True,abortConnect=False"


$value = Get-RedisKey -Key "string" -ConnectionString "pratap.redis.cache.windows.net:6380,password=r0OeQeLO6WNohRRRtxZJdJqbqJ6iJe4ouAzCaMdTjRg=,ssl=True,abortConnect=False"
$value