# API Key from https://azure.microsoft.com/en-us/services/cognitive-services/translator-text-api/
$apiKey = "3f272905281e48cc9e539d881729dab2"
# Translation API
$translateBaseURI = "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0"
# Convert from - en = English
$fromLang = "en"
# Supported Languages https://docs.microsoft.com/en-us/azure/cognitive-services/translator/languages 
# Convert to - de = German
$toLang = "de"
# API Auth Headers
$headers = @{}
$headers.Add("Ocp-Apim-Subscription-Key",$apiKey)
$headers.Add("Content-Type","application/json")
# Conversion URI
$convertURI = "$($translateBaseURI)&from=$($fromLang)&to=$($toLang)"
# Text to Convert
$textToConvert = "This text has been converted from English to German using Azure Cognitive Services"
# Build Conversion Body
$text = @{'Text' = $($textToConvert)}
$text = $text | ConvertTo-Json
# Convert
$conversionResult = Invoke-RestMethod -Method POST -Uri $convertURI -Headers $headers -Body "[$($text)]"
write-host -ForegroundColor 'yellow' "'$($textToConvert)' converted to '$($conversionResult.translations[0].text)'"