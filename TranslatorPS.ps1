try   
   {  
        # Translate function
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

$targetLanguage = 'de'
$srcUrl = 'https://8p5g5n.sharepoint.com/'   
Connect-PnPOnline -Url $srcUrl  -UseWebLogin

#$page = Get-PnPClientSidePage -Identity home.aspx
#$page.SaveAsTemplate("home_page_Template.aspx")
#$page2 = Get-PnPClientSidePage –Identity "Templates/home_page_Template"
#$page2.Save("Home_de.aspx")

$targetpage="Home_de.aspx" 
write-host -ForegroundColor Magenta "Page Created with name of  " $targetpage

$newPage = Get-PnPClientSidePage $targetpage
$textControls = $newPage.Controls | Where-Object {$_.Type.Name -eq "ClientSideText"}
$webpartControls = $newPage.Controls | Where-Object {$_.Type.Name -eq "ClientSideWebPart"}
 
Write-Host "Translating content..." -Newline


    foreach ($textControl in $textControls){
    
        #$translatedControlText = Start-Translation -text $textControl.Text -language $targetLanguage
        #Set-PnPClientSideText -Page $newPage -InstanceId $textControl.InstanceId -Text $translatedControlText
    }

     foreach ($wp in $webpartControls)
     {
     
            $spcd= $wp.ServerProcessedContent
            
            #$obg = [Newtonsoft.Json.Linq.JObject] $spcd["searchablePlainTexts"]
            $obg = ([Newtonsoft.Json.Linq.JObject] $spcd.searchablePlainTexts)
            
            
            foreach($prop in $obg.Properties())
            {
            
                $d= [Newtonsoft.Json.Linq.JProperty] $prop

                $dv= ([Newtonsoft.Json.Linq.JValue]$d.Value).Value
                $dv
                if (-not ([string]::IsNullOrEmpty($dv)))
                {
                    $propertyvalue = $dv -replace '[\W]', ''
                    $cacheKey = $wp.InstanceId.ToString() + $propertyvalue
                    $urlget = 'https://localhost:44352/api/RedisCache/GetCacheData?cacheKey=' + $cacheKey
                    $cacheValue = Invoke-RestMethod -Method Get $urlget
                    if ($cacheValue -eq "novalue")
                    {
                     
                            Write-Host "no cacheValue"
                            #$cacheValue = Start-Translation -text $dv -language $targetLanguage
                            Write-Host $cacheValue
                            $TranslatorServiceModel = @{
                                    "elementtextcontent" = $cacheKey
                                    "sourceText" = $dv
                                    "languageCode" = $targetLanguage
                                    "asHtml" = "true"
                            }
                            $json = $TranslatorServiceModel | ConvertTo-Json
                            
                            $cacheValue = Invoke-RestMethod 'https://localhost:44352/api/TranslatorService/TranslateData' -Method Post -Body $json -ContentType 'application/json'
                            ([Newtonsoft.Json.Linq.JValue]$d.Value).Value = $cacheValue

                    }
                    else
                    {
                         Write-Host "with cacheValue"
                        #$translatedControlTextwp = Start-Translation -text $wp.Title -language $targetLanguage
                        ([Newtonsoft.Json.Linq.JValue]$d.Value).Value = $cacheValue
                    }
                
              }
                #$d.Path
                #write-host ($d | Select -ExpandProperty "Value")
                #write-host $prop.value
                #$dv= ([Newtonsoft.Json.Linq.JValue]$d.Value).Value
                #$dv
            }
           
        #}

        write-host ""
        
        #$translatedControlTextwp = Start-Translation -text $wp.Title -language $targetLanguage
        #Set-PnPClientSideWebPart -Page $newPage -Identity $wp.InstanceId -Title $translatedControlTextwp

        
    }
Write-Host "Done!" -ForegroundColor Green

$newPage.Save();
     
}   
catch 
{  
    Write-Host - ForegroundColor Red 'Error ', ':'  
    $Error[0].ToString();  

}