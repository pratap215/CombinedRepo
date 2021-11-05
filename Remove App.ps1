#Parameters
$AppCatalogSiteURL = "https://8p5g5n.sharepoint.com/sites/appcatalog"
# get the app name from package-solution.json 'name'
$AppName = "machine-translation-extension-client-side-solution"
  
#Connect to SharePoint Online App Catalog site
Connect-PnPOnline -Url $AppCatalogSiteURL -UseWebLogin
 
#Get the from tenant App catalog
$App = Get-PnPApp -Scope Tenant | Where {$_.Title -eq $AppName}

$App
 
#Remove an App from App Catalog Site
Remove-PnPApp -Identity $App.Id

#https://8p5g5n.sharepoint.com/:u:/r/sites/appcatalog/AppCatalog/machine-translation-extension.sppkg?csf=1&web=1


