try   
   {  
      
        $srcUrl = 'https://8p5g5n.sharepoint.com/'   
        Connect-PnPOnline -Url $srcUrl  -UseWebLogin
        $pageName  = [System.Web.HttpUtility]::UrlDecode("Home")  
        write-host $pageName  
        #$tempFile = 'C:\LP\TemplateFiles\'+ $pageName +'.xml'  
        $tempFile = $srcUrl+ $pageName +'.xml'  
        $targetpage=$pageName +"_de.aspx"  
        $tempFile
        #Export-PnPClientSidePage -Force -Identity $pageName -Out $tempFile  
        $page = Get-PnPClientSidePage -Identity home.aspx
        
  
        #$con = Get-Content $tempFile  
        $sourcepage=$pageName +".aspx"  
        
       
       # $con | % { $_.Replace($sourcepage, $targetpage) } | Set-Content $tempFile  
       # Apply-PnPProvisioningTemplate -Path  $tempFile  
       # write-host -ForegroundColor Magenta "Page Created with name of  " $targetpage    


       #$page = Get-PnPClientSidePage –Identity "IT.aspx"

# Save the page as template to be reused later-on
$page.SaveAsTemplate("home_Template.aspx")

$page2 = Get-PnPClientSidePage –Identity "Templates/home_Template"
$page2.Save("de/Home.aspx")
     Write-Host - ForegroundColor Green 'Done '0 
}   
catch {  
    Write-Host - ForegroundColor Red 'Error ', ':'  
    $Error[0].ToString();  

    }