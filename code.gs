/*
 * This is a basic connector for Google Data Studio 
 * It is based on the official documentation at https://developers.google.com/datastudio/connector/build
 */

/*
 * Required config function that determines what is displayed on the configuration page for the connector
 * See https://developers.google.com/datastudio/connector/reference#getconfig for more detail
 */
function getConfig(request) {
  var config = {
    configParams: [
      {
        type: 'TEXTINPUT',
        name: 'SP_API_Key',
        displayName: 'Share Progress API Key',
        helpText: 'Enter the Share Progress API Key.'
      },
      {
        type: 'TEXTINPUT',
        name: 'campaign',
        displayName: 'Campaign Slug',
        helpText: 'Enter the campaign slug used to identify Share Progress buttons (using the page_url field)'
      }
    ]
  };
  return config;
}


/*
 * The definition of the data schema
 */
var fixedSchema = [
  {
    name: 'spId',
    label: 'Id',
    description:'Share Progress Id',
    dataType: 'STRING',
    semantics: {
      conceptType: 'DIMENSION'
    }
  },
  {
    name: 'campaignName',
    label: 'Campaign Name',
    description: 'Share Progress Campaign Name',   
    dataType: 'STRING',
    semantics: {
      conceptType: 'DIMENSION'
    }
  },
  {
    name:'channel',
    label: 'Channel',
    description:'Share Channel',
    dataType: 'STRING',
    semantics: {
      conceptType: 'DIMENSION'
    }
  },
  {
    name:'totalVisits',
    label: 'Total Visits',
    description:'Share Progress Total Visits',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC'
    }
  },
  {
    name:'shares',
    label: 'Shares',
    description:'Share Progress Shares',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC'
    }
  },
  {
    name:'viralVisits',
    label: 'Viral Visits',
    description:'Share Progress Total Viral Visits',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC'
    }
  }
];

/*
 * Required function to register the data schema defined above
 * See https://developers.google.com/datastudio/connector/reference#getschema for more detail
 */
function getSchema(request) {
  return {'schema': fixedSchema};
}


/*
 * Required function that retrieves and prepares data for the Data Studio dashboard
 * See https://developers.google.com/datastudio/connector/reference#getdata for more detail
 */
function getData(request) {

  // Using an external function here for better readability and cache handling
  var content = getSPData(request);

  // Prepare data schema for population
  var dataSchema = [];
  request.fields.forEach(function(field) {
    for (var i=0; i < fixedSchema.length; i++) {
      if (fixedSchema[i].name == field.name) {
        dataSchema.push(fixedSchema[i]);
        break;
      }
    }
  });
  
  var data = [];

  // Provide values in the order defined by the schema.
  content.forEach(function(row) {
    var values = [];
    dataSchema.forEach(function(field) {
      switch(field.name) {
        case 'spId':
          values.push(row.Id);
          break;
        case 'campaignName':
          values.push(row.page_title);
          break;
        case 'channel':
          values.push(row.share_type);
          break;
        case 'totalVisits':
          values.push(row.Total_visitors);
          break;
        case 'shares':
          values.push(row.shares);
          break;
        case 'viralVisits':
          values.push(row.viral_visitors);
          break;
        default:
          values.push('');
      }
    });
    data.push({
      values: values
    });
  });
  
  return {
      schema: dataSchema,
      rows: data
    }; 
  
}

/*
 * Function that retrieves data from Share Progress
 * Currently limited to share buttons
 */
function getSPData(request) {
  /*
   * To help circumvent API limits, caching is employed. 
   * The following checks if cached data exists and if so returns it. 
   * Otherwise data is retrieved from Share Progress.
   */ 
  var cache = CacheService.getScriptCache();
  var cached = cache.get(request.configParams.campaign);
  if (cached != null) {
    console.log("returned cached");
    return(JSON.parse(cached));
  } else {
    console.log("returned fresh");
    var apiKey = request.configParams.SP_API_Key;
    var slug = request.configParams.campaign;
    var url = 'https://run.shareprogress.org/api/v1/buttons/';
    var finalData = [];
    
    // Get IDs
    try {
      var response = UrlFetchApp.fetch(url+'?key='+apiKey);
      console.log(response);
    } catch (e) {
      throwError('Unable to retrieve data. Error message: '+e.message, true);
    }
    var ids = JSON.parse(response.getContentText());
    
    
    // Get Results for each ID
    ids.response.forEach(function(d) {
      if (d.page_url.indexOf(slug) > -1) {    
        try {
          var raw = UrlFetchApp.fetch(url+'analytics/'+'?key='+apiKey+'&id='+d.id);
        } catch (e) {
          throwError('Unable to retrieve data. Error message: '+e.message, true);
        }      
        var results = JSON.parse(raw.getContentText());
        var row = {
          Id:'"'+d.id+'"',
          page_title:d.page_title,
          Total_visitors:results.response[0].total.total_visitors,
          viral_visitors:results.response[0].total.total_viral_visitors
        }
        
        if (results.response[0].share_types.facebook.shares > 0) {
          row.share_type = "Facebook";
          row.shares = results.response[0].share_types.facebook.shares;
        } else if (results.response[0].share_types.email.shares > 0) {
          row.share_type = "Email";
          row.shares = results.response[0].share_types.email.shares;
        } else if (results.response[0].share_types.twitter.shares > 0) {
          row.share_type = "Twitter"
          row.shares = results.response[0].share_types.twitter.shares
        } 
        console.log(row);
        finalData.push(row);
      }
    });

    // Adding complete data to cache with an expiry of 500 seconds
    cache.put(request.configParams.campaign, JSON.stringify(finalData), 500);
    return finalData;  
  }
}

/*
 * Required function to indicate whether OAuth2 is used
 * See https://developers.google.com/datastudio/connector/reference#getAuthType for more detail
 */
function getAuthType() {
  var response = {
    "type": "NONE"
  };
  return response;
}

// Better, more verbose error handling
function throwError (message, userSafe) {
  if (userSafe) {
    message = 'DS_USER:' + message;
  }
  throw new Error(message);
}