Add-Type -Path "C:\Users\adminpen.arpula\spfxclientsideprojects\react-application-machine-translations\lib\Redis\net45\StackExchange.Redis.dll"

function Test-RedisIsConnected
{
    [CmdletBinding()]
    param (
        [Parameter()]
        $Connection
    )

    return (($null -ne $Connection) -and ($Connection.IsConnected))
}
function Connect-Redis
{
    [CmdletBinding()]
    param (
        [Parameter(Mandatory=$true)]
        [string]
        $ConnectionString
    )

    $ConnectionString
    # first, disconnect any existing connection
    Disconnect-Redis

    # open a new connection
    if (!(Test-RedisIsConnected $Global:PsRedisCacheConnection))
    {
        if ([string]::IsNullOrWhiteSpace($ConnectionString)) {
            throw 'No connection string supplied when creating connection to Redis'
        }

        $Global:PsRedisServerConnection = $null
        $Global:PsRedisCacheConnection = [StackExchange.Redis.ConnectionMultiplexer]::Connect($ConnectionString, $null)
        if (!$?) {
            throw 'Failed to create connection to Redis'
        }
        else
        {
            'Connected1'
            $Global:PsRedisCacheConnection
        }
    }
    else
    {
    'not Connected1'
    }

    # set the redis server
    $server = $Global:PsRedisCacheConnection.GetEndPoints()[0]

    if (!(Test-RedisIsConnected $Global:PsRedisServerConnection))
    {
        $Global:PsRedisServerConnection = $Global:PsRedisCacheConnection.GetServer($server)
        if (!$?) {
            throw "Failed to open connection to server"
        }
        else
        {
            'Connected2'
            $server
        }
    }
     else
    {
    'not Connected2'
    }

    return $Global:PsRedisCacheConnection.GetDatabase($Global:PsRedisDatabaseIndex)
}

function Add-RedisKey
{
    [CmdletBinding()]
    param (
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]
        $Key,

        [Parameter()]
        [string]
        $Value,

        [Parameter()]
        [timespan]
        $TTL
    )

    $db = Get-RedisDatabase
    $value = $db.StringSet($Key, $Value, $TTL)

    return $value
}

function Get-RedisKey
{
    [CmdletBinding()]
    param (
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]
        $Key
       

       
    )
    #Connect-Redis -ConnectionString $ConnectionString
    $cs="pratap.redis.cache.windows.net:6380,password=r0OeQeLO6WNohRRRtxZJdJqbqJ6iJe4ouAzCaMdTjRg=,ssl=True,abortConnect=False"

     $Global:PsRedisServerConnection = $null
     $Global:PsRedisCacheConnection = [StackExchange.Redis.ConnectionMultiplexer]::Connect($cs, $null)

    $db = $Global:PsRedisCacheConnection.GetDatabase($Global:PsRedisDatabaseIndex)
    $db
    $str=$db.StringGet($Key)
    $value = ($db.StringGet($Key)).ToString()

    return $value
}
"pratap.redis.cache.windows.net:6380,password=r0OeQeLO6WNohRRRtxZJdJqbqJ6iJe4ouAzCaMdTjRg=,ssl=True,abortConnect=False"
function Disconnect-Redis
{
    [CmdletBinding()]
    param()

    if (Test-RedisIsConnected $Global:PsRedisCacheConnection)
    {
        $Global:PsRedisCacheConnection.Dispose()
        if (!$?) {
            throw "Failed to dispose Redis connection"
        }

        $Global:PsRedisCacheConnection = $null
    }
}

function Get-RedisDatabase
{
    [CmdletBinding()]
    param()


    write-host 'Get-RedisDatabase'
    write-host $Global:PsRedisCacheConnection
    if (!(Test-RedisIsConnected $Global:PsRedisCacheConnection)) {
        throw "No Redis connection has been initialized"
    }

    return $Global:PsRedisCacheConnection.GetDatabase($Global:PsRedisDatabaseIndex)
}

function Get-RedisConnection
{
    [CmdletBinding()]
    param()

    if ($null -eq $Global:PsRedisServerConnection) {
        throw "No Redis connection has been initialized"
    }

    return $Global:PsRedisServerConnection
}

