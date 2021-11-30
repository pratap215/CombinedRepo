
 
# Interact with body of the request
$siteURL = 'https://8p5g5n.sharepoint.com/'
$targetLanguage = 'de'
$pageTitle = 'Home'
 
# Translate function
function Start-Translation{
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

   

# Convert
$results = Invoke-RestMethod -Method POST -Uri $convertURI -Headers $headers -Body $body
write-host -ForegroundColor 'yellow' "'$($textToConvert)' converted to '$($results.translations[0].text)'"

    #Write-Host $results
 
    # Send request for translation and extract translated text
    #$results = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body
    $translatedText = $results[0].translations[0].text
    return $translatedText

   # return 'dummy'
}
 
#---START SCRIPT---#
Connect-PnPOnline $siteURL -UseWebLogin
 
$newPage = Get-PnPClientSidePage "$pageTitle.aspx"
$textControls = $newPage.Controls | Where-Object {$_.Type.Name -eq "ClientSideText"}

#Add-PnPClientSidePage -Name "Testnew.aspx" -LayoutType Home -PromoteAs HomePage
#$newPage1 = Set-PnPClientSidePage -Identity "Testnew" -LayoutType Home -Title "Testnew"

$html = $newPage.ToHtml()

#Write-Host $html
 
Write-Host "Translating content..." -Newline
 
    foreach ($textControl in $textControls){
        $translatedControlText = Start-Translation -text $textControl.Text -language $targetLanguage
        Set-PnPClientSideText -Page $newPage -InstanceId $textControl.InstanceId -Text $translatedControlText
    }

Write-Host "Done!" -ForegroundColor Green
 
$SourcePageName = "home"  
         $TargetPageName = $pageTitle+$toLang  
      
         $tempFile = $SourcePageName +'.xml'  
         Export-PnPClientSidePage -Force -Identity $SourcePageName -Out $tempFile  
  
         $con = Get-Content $tempFile  
         $sourcepage=$SourcePageName +".aspx"  
         $targetpage=$TargetPageName +".aspx"  
       
         $con | % { $_.Replace($sourcepage,$targetpage) } | Set-Content $tempFile  
         Apply-PnPProvisioningTemplate -Path  $tempFile  
         write-host -ForegroundColor Magenta "Page reverted with name of  " $targetpage 