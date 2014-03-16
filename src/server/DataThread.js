var util = require('util');
var fs = require('fs');
var crypto = require('crypto');
LOG.create("Data Thread Starting");

var DATA = (function(dataManager){    
    var DATA = {};
    var dataSourcesUpdatedE = F.receiverE();
    dataManager.httpMessageInE = F.receiverE();
    var clientDataRegE = dataManager.httpMessageInE.filterE(function(websocketPacket){
        return websocketPacket.data!=undefined && websocketPacket.data.command!==undefined;
    }).collectE({}, function(websocketPacket, dataReg){        
        var dataPacket = websocketPacket.data;
        var clientId = websocketPacket.clientId;
        var registered = dataReg[dataPacket.key]!=undefined && ARRAYS.arrayContains(dataReg[dataPacket.key], clientId);
        if(dataPacket.command && dataPacket.command === AURORA.COMMANDS.UPDATE_DATA && dataPacket.key && dataPacket.key!="AURORA_CONNECTIONS" && dataPacket.data && registered){
            dataManager.setValue(dataPacket.key, dataPacket.data);
        }
        else if(dataPacket.command!=undefined && dataPacket.command == AURORA.COMMANDS.REGISTER_DATA && dataPacket.key !=undefined){
            if(dataPacket.key!=undefined && !AUTHENTICATION.clientCanRead(clientId, dataPacket.key)){
                return dataReg;
            }
            var key = dataPacket.key;
            if(dataReg[key]==undefined){
                dataReg[key] = [];
            }
            if(!ARRAYS.arrayContains(dataReg[key], clientId)){
                dataReg[key].push(clientId);
            }
            if(DATA[key]!=undefined){
                if(DATA[key].valueNow!=undefined){
                    dataManager.sendData(key, DATA[key].valueNow(), AURORA.DATATYPE.UTF8, clientId);
                }
                else if(DATA[key].last!=undefined){
                    dataManager.sendData(key, DATA[key].last, AURORA.DATATYPE.UTF8, clientId);
                }
            }
            else{
                LOG.create("registerClientRequest: Cant find key!!!"+key);
            }
        }
        else if(dataPacket.command && dataPacket.command === AURORA.COMMANDS.DEREGISTER_DATA && dataPacket.key && registered){
            var key = dataPacket.key;
            if(dataReg[key]){
                ARRAYS.remove(dataReg[key], clientId, true);
            }
            if(dataReg[key]&&dataReg[key].length==0){
                OBJECT.delete(dataReg, key);
            }
        }
        else if(dataPacket.command && dataPacket.command === AURORA.COMMANDS.DEREGISTER_DATA && dataPacket.key==undefined){
            for(var key in dataReg){
                ARRAYS.remove(dataReg[key], clientId, true);
                if(dataReg[key]&&dataReg[key].length==0){
                    OBJECT.delete(dataReg, key);
                }
            }
        }
        return dataReg;
    });
  
    
    
    dataManager.register = function(key, data, type){                  
        DATA[key] = data;   

        if(data instanceof F.EventStream){
            data.mapE(function(value){
                dataManager.sendData(key, value, type);
            });
            dataManager.sendData(key, DATA[key].last, type);
        }
        else if(data instanceof F.Behavior){
            F.liftB(function(key, value, type){
                dataManager.sendData(key, value, type);
            }, F.constantB(key), data, F.constantB(type))
            dataManager.sendData(key, DATA[key].valueNow(), type);
        }
        dataSourcesUpdatedE.sendEvent(DATA);
    };
    dataManager.sendData = function(key, data, type, clientId){    //Client id is optional
        if(DATA[key]==undefined){
            LOG.create("setValue: Unable to find "+key);
            return;
        }
        process.send({command: AURORA.COMMANDS.UPDATE_DATA, key:key, data:data, type: type, clientIds: (clientId!=undefined?[clientId]:((clientDataRegB.valueNow())[key]))});
    };
    dataManager.setValue = function(key, value){ 
        if(DATA[key]==undefined){
            LOG.create("setValue: Unable to find "+key);
            return;
        }
        if(DATA[key].sendEvent!=undefined){
            DATA[key].sendEvent(value);
        }
        else{
            LOG.create("Attempt to set "+key+" no sendEvent function");
        }
    };
    
    dataManager.sendToClients = function(data){
        process.send(data);
    };
    
    process.on('message', function(websocketPacket) {
        dataManager.httpMessageInE.sendEvent(websocketPacket);
    });

    //Easy registration methods
    F.EventStream.prototype.sendToClients = function(key, type){
        dataManager.register(key, this, (type===undefined)?AURORA.DATATYPE.UTF8:type);
        return this;
    };
    F.Behavior.prototype.sendToClients = F.EventStream.prototype.sendToClients;
    
    
    
    
    
    
    
    
    //Authentication and Data Tables
    
    
        
    var clientDataRegB = clientDataRegE.startsWith(SIGNALS.NOT_READY);
    
    /*
    dataManager.auroraConnectionsTableE = dataManager.httpMessageInE.filterE(function(websocketPacket){
        return websocketPacket.data && websocketPacket.data.command && websocketPacket.data.command === AURORA.COMMANDS.UPDATE_DATA && websocketPacket.data.key && websocketPacket.data.key=="AURORA_CONNECTIONS" && websocketPacket.data.data;
    }).mapE(function(websocketPacket){
        LOG.create("Sending new Connections Table");
        LOG.create(websocketPacket.data.data);
        return TABLES.parseTable("aurora_connections", "clientId", websocketPacket.data.data, {clientId: {name:"Client Id", type: "number"}, token: {name:"Session Id", type: "string"}, seriesId: {name:"Series Id", type: "string"}});
    });
    dataManager.auroraConnectionsTableB = dataManager.auroraConnectionsTableE.startsWith(SIGNALS.NOT_READY);
    */
   
    var dataRegTableE = clientDataRegE.mapE(function(dataReg){
       var userSourcesData = [];
       var clients = {};
       var count = 0;
       for(var objectKey in dataReg){
           userSourcesData.push({index: ++count, key: objectKey, users: dataReg[objectKey]}); 
           for(var index in dataReg[objectKey]){
               var clientId = dataReg[objectKey][index];
               if(clients[clientId]==undefined){
                   clients[clientId] = [];
               }
               clients[clientId].push(objectKey);
           }
       }
       
       var clientsMapData = [];
       var count = 0;
       for(var clientId in clients){
           clientsMapData.push({index: ++count, clientId: clientId, dataSources: clients[clientId]});
       }
       return {sourcesAdminTable: TABLES.parseTable("dataSourcesAdmin", "index", userSourcesData, {
             index:{name: "Index", type: "number"},
             key:{name: "Key", type: "string"},
             users:{name:"users", type:"list"}
        }), usersDataSources: TABLES.parseTable("usersDataSources", "index", clientsMapData, {
             index:{name: "Index", type: "number"},
             clientId:{name: "Client", type: "string"},
             dataSources:{name:"Data Sources", type:"list"}
        })};
    });

    dataManager.clientDataSourceUsageTableB = dataRegTableE.mapE(function(tables){return tables.usersDataSources;}).startsWith(SIGNALS.NOT_READY);
    dataManager.dataSourceUserUsageTableB = dataRegTableE.mapE(function(tables){return tables.sourcesAdminTable;}).startsWith(SIGNALS.NOT_READY);
    dataManager.dataSourceUserUsageTableB.sendToClients("AURORA_DATASOURCESADMIN", AURORA.DATATYPE.UTF8);
    
    dataSourcesUpdatedE.mapE(function(dataSources){
        var newData = [];
        var count = 0;
        for(var key in dataSources){
            newData.push({index: ++count, key: key});
        }
        return TABLES.parseTable("dataSources", "key", newData, {index: {name: "Index", type: "number"}, key:{name: "Key", type: "string"}});
    }).startsWith(SIGNALS.NOT_READY).sendToClients("AURORA_DATASOURCES", AURORA.DATATYPE.UTF8);

    return dataManager;
})(DATA || {});





var STORAGE = (function(storage, aurora){
	
	storage.createJSONTableBI = function(objectName, primaryKey, columns, inputE){
		var path = "data/"+objectName+".json";
		inputE = inputE || F.zeroE();
		if(!fs.existsSync(path)){
			fs.writeFileSync(path, "[]", 'utf8');
		}
		
		var pushBackE = F.receiverE();
		var initialTable = TABLES.parseTable(objectName, primaryKey, JSON.parse(fs.readFileSync(path, 'utf8')), columns);
		var tableUpdateE = F.mergeE(pushBackE, inputE).collectE(initialTable, function(update, table){
		    if(!TABLES.UTIL.isTable(update)){
		        update = (update instanceof Array)?update:[update];
		        for(var index in update){
    		        if(update[index].command==="add"){
    		            TABLES.UTIL.addRow(table, update[index].data.rowPk, update[index].data.row);
    		        }
    		        else if(update[index].command==="remove"){
    		            TABLES.UTIL.removeRow(table, update[index].data.rowPk);
    		        }
    		        else if(update[index].command==="exec"){  //Run a callback over each row, update or remove row.
    		            var removeSet = [];
    		            for(var rowIndex in table.data){
    		                var row = update[index].callback(table.data[rowIndex]);
    		                if(row===undefined){
    		                    removeSet.push(table.data[rowIndex][table.tableMetaData.primaryKey]);
    		                }
    		                else{
    		                    TABLES.UTIL.updateRow(table, table.data[rowIndex][table.tableMetaData.primaryKey], row);
    		                }
    		            }
    		            for(var index in removeSet){
    		                TABLES.UTIL.removeRow(table, removeSet[index]);
    		            }
    		        }
		        }
		        fs.writeFileSync(path, JSON.stringify(table.data), 'utf8');
		        return table;
		    }
		    fs.writeFileSync(path, JSON.stringify(update.data), 'utf8');
            return update;
		});		
		
		var tableBI = F.liftBI(function(table){
			return table;
		}, function(newData){
			var existingTable = TABLES.UTIL.isTable(newData)?newData:tableBI.valueNow();
			var maxId = 0;
			for(var index in existingTable.data){
				var rowPk = TABLES.UTIL.findRowPk(existingTable, index);
				if(typeof(rowPk)=="string" && (rowPk+"").contains("temp")){}
				else{
					maxId = Math.max(maxId, typeof(rowPk)!="string"?rowPk:parseInt(rowPk));
				}
			}
			var rows = [];
			var newRows = [];
			for(var index in newData.data){
				var rowPk = TABLES.UTIL.findRowPk(newData, index);
				if(newData.rowMetaData[rowPk] && newData.rowMetaData[rowPk]["deleted"]){
					continue;
				}
				if(typeof(rowPk)=="string" && (rowPk+"").contains("temp")){
					newData.data[index][newData.tableMetaData.primaryKey] = ++maxId;
				}
				rows.push(newData.data[index]);	
			}
			
			
			var newTable = TABLES.parseTable(objectName, primaryKey, rows, columns);
			newTable.tableMetaData.applyId = newData.tableMetaData.applyId;

			pushBackE.sendEvent(newTable);
			return [newTable];
		}, tableUpdateE.startsWith(initialTable));
		return tableBI;
	};
	
	
	storage.createTableBI = function(objectName, primaryKey, columns, inputE){
		if(aurora.SETTINGS.STORAGE_ENGINE===aurora.STORAGE_ENGINES.JSON){
			return storage.createJSONTableBI(objectName, primaryKey, columns, inputE);
		}
	};
	
	return storage;
})(STORAGE || {}, AURORA);
