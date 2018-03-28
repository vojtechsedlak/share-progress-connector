# Share Progress Connector for Data Studio

Display Share Progress data in your Google Data Studio dashboards. 

You can add this connector to your dashboard [here](https://datastudio.google.com/datasources/create?connectorId=AKfycbzUQ8VMtw1zAwO7cijRx8SIEbqTpACokYBEDcGshQMB_ag2YaFMdpX0Ot_A0Dhcb91U).

To configure the connector, add your Share Progress API key and the campaign slug to check for in the page_url field of the Share Progress button.

This is an early prototype of the connector, you can find more details about it in this [blog](https://vojtechsedlak.com). Only the following functionality is currently available:

 - Get total number of visits, shares and viral visitors for Facebook, Twitter and Email share buttons
 - You can identify, which buttons to query by specifying a string that is included in the page_url field of the share button
 - You can only query buttons and not pages at this point