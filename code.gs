function main()
{
  //reset()
  //setHeapQueries()
  //routine()
  //ScriptApp.newTrigger('routine').timeBased().everyMinutes(1).create()
  //printRegAnnotations()
}

function printRegAnnotations(queryList)
{
  if(!queryList)queryList = loadQueries()
  for(var i in queryList)
  {
    var query = queryList[i]
    var anot = query.annotations
    if(anot != null && anot.length > 0)
    {
      Logger.log(query.sql)
      for(var j in anot)
      {
        Logger.log(anot[j].annotator_id)
        Logger.log(anot[j].annotation)
      }
      Logger.log(' ')
      Logger.log(' ')
    }
  }
}

function reset()
{
  PropertiesService.getScriptProperties().deleteAllProperties();
  setupQueries(['train_anno_123.json'])  
}

function timeMain()
{
  var date = new Date()
  var t0 = date.getSeconds()*1000 + date.getMilliseconds()
  main()
  var date = new Date()
  var t1 = date.getSeconds()*1000 + date.getMilliseconds()
  
  var rez
  if(t1 > t0) rez = t1 - t0
  else rez = 60000 + t1 - t0
  
  Logger.log('It took ' + String(rez) + ' ms to run main')
}
  

function routine()
{
  var props = PropertiesService.getScriptProperties().getProperties()
  var noq = 0, nor = 0
  for(key in props)
  {
    if((/^request:/).test(key))
      nor++
    else if((/^query:/).test(key))
      noq++
  }
  
  Logger.log('Number of requests (submissions) present in heap: ' + String(nor))
  Logger.log('Number of queries present in heap: ' + String(noq))
  
  var heapSize = getHeapSize()
  var hSLB = getHSLB()
  
  if(nor > heapSize - hSLB || noq < hSLB)
    var queryList = loadQueries()
  if(nor > heapSize - hSLB)
   queryList = parseSubmissions(queryList)
  if(noq < hSLB)
   setHeapQueries(queryList)
  if(nor > heapSize - hSLB || noq < hSLB)
    countAnnotations(queryList)
}

function doGet(e) 
{
  if(!e)
    return HtmlService.createTemplateFromFile('Submission page').evaluate()
  if(!e.parameter.page)
    return HtmlService.createTemplateFromFile('Submission page').evaluate()
  else
    return HtmlService.createHtmlOutputFromFile(e.parameter.page)
}

function getScriptUrl() {
 return ScriptApp.getService().getUrl();
}

function extend(a, b)
{
  for(i in b)
    a.push(b[i])
}

function deleteAllTriggers()
{
  var l = ScriptApp.getProjectTriggers()
  for(var i in l)
    ScriptApp.deleteTrigger(l[i])
}

function clearAllProperties()
{
  PropertiesService.getScriptProperties().deleteAllProperties()
}

function getHeapSize()//<=400, si 400 e putin la limita, max(size(query)) ~= 1,25 Kb, maximum storage pt PropertiesService = 500 Kb
{
  return 300
}

function getHSLB()//heap size lower bound (>0, <=heapSize), =heapSize inseamna actualizare odata ce se pierde macar un query, sau se gaseste macar un request (submission)
{
  return 150
}

function compareQueries(a, b)
{
  return a.sql.length - b.sql.length
}

function getNoQueries()
{
  var global = getScriptVars()
  return global.noQueries
}

function getScriptVars()
{
  var global = PropertiesService.getScriptProperties().getProperty('global')
  if(global == null)return {}
  else return JSON.parse(global)
}

function setScriptVars(global)
{
  PropertiesService.getScriptProperties().setProperty('global', JSON.stringify(global))
}

function setupQueries(jsonNames)
{
  setScriptVars({})
  var global = {}
  
  var queryList = []
  for(var i in jsonNames)
  {
    var qset = JSON.parse(DriveApp.getFilesByName(jsonNames[i]).next().getBlob().getDataAsString())
    extend(queryList, qset)
  }
  
  queryList.sort(compareQueries)
  
  for(var i in queryList)queryList[i].index = Number(i) + 1
  
  global.noQueries = queryList.length
  
  var folder = DriveApp.createFolder('DATA')
  global.folderId = folder.getId()
  setScriptVars(global)
  
  dumpQueries(queryList)
}
    
function submit(email, index, entries)
{
  var date = new Date()
  var global = getScriptVars()
  PropertiesService.getScriptProperties().setProperty('request:' + String(date.getMilliseconds()) + String(date.getSeconds()), JSON.stringify([email, index, entries]) )
  if(!global.nor)global.nor = 0
  global.nor++
  if( PropertiesService.getScriptProperties().getProperty('query:' + String(index)) )
  {
    global.noq--
    PropertiesService.getScriptProperties().deleteProperty('query:' + String(index))
  }
  setScriptVars(global)
}

function dumpQueries(queryList)
{
  var s40mb = 40*1024*1024
  
  var global = getScriptVars()
  var folder = DriveApp.getFolderById(global.folderId)
  if(global.batchIds === undefined)global.batchIds = []
  var batchIds = global.batchIds
  
  for(var i=0, qset = [], expSize = 0, batchNo = 1; i < queryList.length; i++)
  {
    if(expSize + JSON.stringify(queryList[i]).length > s40mb)
    {
      if(batchNo > batchIds.length)
      {
       //create new batch
       var file = DriveApp.createFile('Batch ' + String(batchNo) + '.json', JSON.stringify(qset))
       DriveApp.getRootFolder().removeFile(file)
       folder.addFile(file)
      
       batchIds.push(file.getId())
      }
      else
      {
        //set content of existing batch
        var file = DriveApp.getFileById(batchIds[batchNo - 1])
        file.setContent(JSON.stringify(qset))
      }
      
      qset = [queryList[i]]
      expSize = JSON.stringify(queryList[i]).length
      batchNo++
    }
    else
    {
      qset.push(queryList[i])
      expSize += JSON.stringify(queryList[i]).length
    }
  }
  
  if(batchNo > batchIds.length)
      {
       var file = DriveApp.createFile('Batch ' + String(batchNo) + '.json', JSON.stringify(qset))
       DriveApp.getRootFolder().removeFile(file)
       folder.addFile(file)
      
       global.batchIds.push(file.getId())
      }
  else
      {
        var file = DriveApp.getFileById(batchIds[batchNo - 1])
        file.setContent(JSON.stringify(qset))
      }
  
  setScriptVars(global)
}

function parseSubmissions(queryList)
{
  var date = new Date()
  t0 = date.getSeconds()*1000 + date.getMilliseconds()
  
  var props = PropertiesService.getScriptProperties().getProperties()
  var reqs = []
  for(var key in props)
    if((/^request:/).test(key))
    {
      reqs.push(JSON.parse(props[key]))
      delete props[key]
    }
  PropertiesService.getScriptProperties().setProperties(props, true)
  
  var date = new Date()
  var t1 = date.getSeconds()*1000 + date.getMilliseconds()
  //Logger.log(String(t1 - t0) + ' ms elapsed during parseSubmissions() window')
  
  
  if(queryList == null)
   queryList = loadQueries()
  for(var i in reqs)
    {
      var req = reqs[i]
      var email = req[0]
      var index = req[1]
      var entries = req[2]
      var query = queryList[Number(index)-1]
      if(query.annotations == null)query.annotations = []
      var anot = query.annotations
      for(var i=0; i < anot.length; i++)
        if(anot[i].annotator_id == email)
        {
          anot.splice(i,1)
          i--
        }
      for(var i in entries)anot.push({annotator_id: email, annotation: entries[i]})
    }
  dumpQueries(queryList)
  
  
  var date = new Date()
  var t2 = date.getSeconds()*1000 + date.getMilliseconds()
  Logger.log(String(t2 - t0) + ' ms elapsed during the entire parseSubmissions() function')
  
   var global = getScriptVars()
  global.nor = 0
  setScriptVars(global)
  
  return queryList
 }

function loadQueries()
{
  var global = getScriptVars()
  var batchIds = global.batchIds
  queryList = []
  for(var i in batchIds)extend(queryList, JSON.parse(DriveApp.getFileById(batchIds[i]).getBlob().getDataAsString()))
  return queryList
}

function getRandEl(v)
{
  return v[Math.floor(Math.random()*v.length)]
}

function getQuery(index)
{
  queryList = loadQueries()
  return queryList[index - 1]
}

function setHeapQueries(queryList)
{
  var date = new Date()
  var t0 = date.getSeconds()*1000 + date.getMilliseconds()
  
  var props = PropertiesService.getScriptProperties().getProperties()
  for(var key in props)
    if((/^query:/).test(key))
     delete props[key]
  PropertiesService.getScriptProperties().setProperties(props, true)
  
  var date = new Date()
  var t1 = date.getSeconds()*1000 + date.getMilliseconds()
  //Logger.log(String(t1 - t0) + ' ms elapsed during setHeapQueries() window')
  
  var heapSize = getHeapSize()
  
  if(queryList == null)
   queryList = loadQueries()
  for(var i = 0,noq = 0; i < queryList.length && noq < heapSize; i++)
    if(queryList[i].annotations === undefined || queryList[i].annotations.length == 0)
    {
      var query = queryList[i]
      props['query:' + String(i+1)] = JSON.stringify({index: query.index, sql: query.sql, url: query.url})
      noq++
    }
  PropertiesService.getScriptProperties().setProperties(props)
  
  var date = new Date()
  var t2 = date.getSeconds()*1000 + date.getMilliseconds()
  Logger.log(String(t2 - t0) + ' ms elapsed during the entire setHeapQueries() function')
  
  var global = getScriptVars()
  global.noq = noq
  setScriptVars(global)
}

function getQueueQuery()
{
  var props = PropertiesService.getScriptProperties().getProperties()
  var queryList = []
  for(var key in props)
    if((/^query:/).test(key))
    queryList.push(JSON.parse(props[key]))
  if(queryList.length > 0) return getRandEl(queryList)
  else return null
}

function getUsersList()
{
  var queryList = loadQueries()
  queryList = parseSubmissions(queryList)
  setHeapQueries(queryList)
  countAnnotations(queryList)
  
  var users = {}
  for(var i in queryList)
    for(j in queryList[i].annotations)
    {
      if(!users[queryList[i].annotations[j].annotator_id])
        users[queryList[i].annotations[j].annotator_id] = 1
      else users[queryList[i].annotations[j].annotator_id]++
     }
  
  var s = ''
  for(var i in users)s += i + ': ' + String(users[i]) + '\n'
  return s
}

function countAnnotations(queryList)
{
  var global = getScriptVars()
  
  var noAnot = 0
  
  var noDescQ = 0
  
  for(var i in queryList)
  {
    var query = queryList[i]
    if(query.annotations)if(query.annotations.length > 0)
    {
      noAnot += query.annotations.length
      noDescQ++
    }
  }
  
  global.noAnot = noAnot
  global.noDescQ = noDescQ
  
  setScriptVars(global)
}
