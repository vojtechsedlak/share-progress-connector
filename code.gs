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


function getSchema(request) {
  return {'schema': fixedSchema};
}


function getData(request) {
  var content = getSPData(request);
//  var content = [];
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

function getSPData(request) {
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
    
    
    // Get Results for IDs
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
    cache.put(request.configParams.campaign, JSON.stringify(finalData), 500);
    return finalData;  
  }
}

function getAuthType() {
  var response = {
    "type": "NONE"
  };
  return response;
}

function throwError (message, userSafe) {
  if (userSafe) {
    message = 'DS_USER:' + message;
  }
  throw new Error(message);
}