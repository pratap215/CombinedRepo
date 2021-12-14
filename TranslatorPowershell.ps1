using namespace System.Net
try   
   { 
# Input bindings are passed in via param block.
#param($Request, $TriggerMetadata)

function Start-Translation
{
    param(
    [Parameter(Mandatory=$true)]
    [string]$text,
    [Parameter(Mandatory=$true)]
    [string]$language
    )

    $apiKey = "3f272905281e48cc9e539d881729dab2"
    $translateBaseURI = "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0"
    $fromLang = "en"
    $toLang = "de"
    $headers = @{}
    $headers.Add("Ocp-Apim-Subscription-Key",$apiKey)
    $headers.Add("Content-Type","application/json")
    $convertURI = "$($translateBaseURI)&from=$($fromLang)&to=$($toLang)"

    $textJson = @{
        "Text" = $text
        } | ConvertTo-Json
 
    $body = "[$textJson]"

    # Send request for translation and extract translated text
    $results = Invoke-RestMethod -Method POST -Uri $convertURI -Headers $headers -Body $body
    $translatedText = $results[0].translations[0].text
    return $translatedText

}

$clientId = $env:clientId
$clientSecret = $env:clientSecret
 
# Interact with body of the request
$siteURL = 'https://8p5g5n.sharepoint.com/'
$targetLanguage = 'de'
$pageTitle = "Home"

#$siteURL = "https://8p5g5n.sharepoint.com/sites/CommSite"
$userId =  "pratap@8p5g5n.onmicrosoft.com"    
$plainText= "Pratty@215"  

$pwd = ConvertTo-SecureString $plainText -AsPlainText -Force    
$creds = New-Object System.Management.Automation.PSCredential($userId,$pwd)  

Connect-PnPOnline -Url $siteURL -UseWebLogin

$newPage = Get-PnPClientSidePage "$targetLanguage/$pageTitle.aspx"
$textControls = $newPage.Controls | Where-Object {$_.Type.Name -eq "ClientSideText"}
$webpartControls = $newPage.Controls | Where-Object {$_.Type.Name -eq "ClientSideWebPart"}

#$textControls = $newPage.Controls | ? {$_.Type.name -eq "PageText"}
#$webpartControls = $newPage.Controls | ? {$_.Type.Name -eq "PageWebPart"}

foreach($ct in $newPage.Controls)
{
#$ct
}

foreach ($WebComponent in $webpartControls) {
    $properties = $WebComponent.PropertiesJson | ConvertFrom-Json
    Write-Host "inside  PageText loop2222..." 
    foreach ($content in $properties.content) {
    
        #$content.description 
        $content.
       
    }
    if (($properties.altText -ne $null) -and ($properties.altText.getType().name -eq "String") -and ($properties.altText -ne "")) {
        $properties.altText 
    }
    if (($properties.overlayText -ne $null) -and ($properties.overlayText.getType().name -eq "String") -and ($properties.overlayText -ne "")) {
        $properties.overlayText 
    }
    #Set-PnPPageWebPart -Page "$targetlanguage/$pageTitle" -Identity $WebComponent.InstanceId -PropertiesJson ($properties | ConvertTo-Json -Depth 90)
}
        
        


     foreach ($wp in $webpartControls)
     {
      Write-Host "Translating content2..." -NoNewline
            $spcd= $wp.ServerProcessedContent
            $obg = ([Newtonsoft.Json.Linq.JObject] $spcd.searchablePlainTexts)
            foreach($prop in $obg.Properties())
            {
                $d= [Newtonsoft.Json.Linq.JProperty] $prop
                $dv= ([Newtonsoft.Json.Linq.JValue]$d.Value).Value

                if (-not ([string]::IsNullOrEmpty($dv)))
                {
                    #$translatedValue = Start-Translation -text $dv -language $targetLanguage
                    #([Newtonsoft.Json.Linq.JValue]$d.Value).Value = $translatedValue
                }
               
            }
        write-host ""
          
     }

Write-Host "Done!" -ForegroundColor Green
 


}   
catch 
{  
    Write-Host - ForegroundColor Red 'Error ', ':'  
    $Error[0].ToString();  

}


