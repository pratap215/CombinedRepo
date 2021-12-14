try   
   {  
      
        $srcUrl = 'https://8p5g5n.sharepoint.com/'   
        Connect-PnPOnline -Url $srcUrl  -UseWebLogin
        $page = Get-PnPClientSidePage -Identity home.aspx
        $page.SaveAsTemplate("home_page_Template.aspx")
        $page2 = Get-PnPClientSidePage –Identity "Templates/home_page_Template"
        $page2.Save("Home_de.aspx")
        Write-Host - ForegroundColor Green 'Done '0 
}   
catch {  
    Write-Host - ForegroundColor Red 'Error ', ':'  
    $Error[0].ToString();  

    }