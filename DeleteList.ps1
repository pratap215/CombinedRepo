Add-PSSnapin Microsoft.SharePoint.PowerShell -ErrorAction SilentlyContinue
#Add-PSSnapin Microsoft.Sharepoint.Powershell
 
$WebURL = "https://8p5g5n.sharepoint.com"
#$ListName="Translator Data List"
$ListName="CacheList"
#$Cred = Get-Credential
 
Try {
    #Connect to PNP Online
    Connect-PnPOnline -Url $WebURL -UseWebLogin 
    #Connect-PnPOnline -Url $WebURL -Credentials $Cred
     
    #Get All List Items in Batch
    $ListItems = Get-PnPListItem -List $ListName -PageSize 1000 | Sort-Object ID -Descending
 
    #sharepoint online powershell delete all items in a list
    ForEach ($Item in $ListItems)
    {
        Remove-PnPListItem -List $ListName -Identity $Item.Id -Force
    }
}
catch {
    write-host "Error: $($_.Exception.Message)" -foregroundcolor Red
}


#Read more: https://www.sharepointdiary.com/2015/10/delete-all-list-items-in-sharepoint-online-using-powershell.html#ixzz7B82CWZ1h