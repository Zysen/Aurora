var net = require('net');

F.EventStream.prototype.InternalSocketE = function(socket){
    LOG.create("InternalSocketE");
    var messageIn = F.receiverE();
    var connected = false;
    this.mapE(function(command){
       //console.log("Sending "+command);
        if(connected){
            socket.write(command);
        }
    });
    
    socket.on('data', function(data) {
        //console.log('RESPONSE: ' + data);
        messageIn.sendEvent(data);
    });
    
    socket.on('connect', function() {
        LOG.create("Unix Domain Socket connected");
        connected = true;
    });
    
    socket.on('error', function(data) {
        LOG.create("Error on UDS "+data);
    });
    
    socket.on('close', function(data) {
        console.log('Socket Closed');
        connected = false;
        setTimeout(function(){
            socket.connect();
        }, 5000);
    });
    
    socket.on('end', function() {
        console.log('DONE');
        connected = false;
    });
    return messageIn;

};

F.EventStream.prototype.UnixDomainSocketE = function(path){
    return this.InternalSocketE(net.createConnection(path));
};

F.EventStream.prototype.SocketE = function(host, port){
    return this.InternalSocketE(net.createConnection(port, host));
};

if(false){
    var dataUpdateE = F.timerE(5000).mapE(function(time){
        return '{"$.name" : "entities", "entities":[]}';
    }).SocketE("192.168.2.5", 5000).filterUndefinedE().collectE({inString:false, bracketCount:0, objectName: undefined, clientIds: []}, function(chunk, state){

        var commands = [];
        var bracketCount = state.bracketCount;
        var inString = state.inString;
        for(var cIndex in chunk){
            if(chunk[cIndex]==='{' && !inString){
                if(bracketCount===0){
                    //Find Object Name By Reading Forward
                    state.objectName = "";
                    state.clientIds = [];
                }
                bracketCount++;
            }
            else if(chunk[cIndex]==='}' && !inString){
                bracketCount--;
                if(bracketCount===0){
                    //DATA.sendToClient(chunk, state.clientIds);
                }
            }
            else if(chunk[cIndex]==='"'){
                inString = !inString;
            }
        }        
        return {inString:inString, bracketCount:bracketCount};
        
    });
   
   /*
   var dataUpdateE = F.timerE(5000).mapE(function(time){
        return "{\"entities\":[]}";
    }).SocketE("192.168.2.5", 5000).filterUndefinedE().collectE({buff: "", commands: []}, function(update, state){
        var chunk = state.buff+update;
        var chunkcommands = [];
        var commands = [];
        var startPos = 0;
        var count = 0;
        var singleString = false;
        var doubleString = false;
        for(var cIndex in chunk){
            if(chunk[cIndex]==='{' && !singleString && !doubleString){
                if(count===0){
                    startPos = cIndex;
                }
                count++;
            }
            else if(chunk[cIndex]==='}' && !singleString && !doubleString){
                count--;
                if(count===0){
                    chunkcommands.push([startPos, cIndex-startPos+1]);
                }
            }
            else if(chunk[cIndex]==="'"){
                singleStringCounter = !singleStringCounter;
            }
            else if(chunk[cIndex]==='"'){
                doubleString = !doubleString;
            }
        }
        for(var index=chunkcommands.length-1;index>=0;index--){
            commands.push(F.oneE(chunk.substr(chunkcommands[index][0], chunkcommands[index][1])));
        }
        return {buff: chunk, commands: commands};
    }).filterE(function(packet){return packet.commands.length>0}).mapE(function(packet){
       return F.mergeE.apply({},packet.commands);
    }).switchE().mapE(function(command){
        try{
            var obj = JSON.parse(command)["$.get"];
            var objectName = Object.keys(obj)[0];
            return {name: objectName, data: obj[objectName]};
        }
        catch(e){
            LOG.create("Unable to parse, "+e);
            LOG.create(command);
            return {};
        }
    });

    dataUpdateE.filterE(function(dataUpdate){
        return dataUpdate.name==="entities";
    }).mapE(function(dataUpdate){
        return TABLES.parseTable(dataUpdate.name, "index", dataUpdate.data, {index: {name: "Index", type: "number"}, containedIn: {name: "Contained In", type: "number"}, name: {name: "Name", type: "string"}, description: {name: "Description", type: "string"}, classNumber: {name: "Name", type: "string"}, relpos: {name: "RelPos", type: "number"}});
    }).startsWith(SIGNALS.NOT_READY).sendToClients("CSR_ENTITY_TABLE", AURORA.DATATYPE.UTF8);
 */   
    
}
/*

.mapE(function(data){
    
    
    var data = data.toString('utf-8');
    
    //var data = JSON.parse();
    LOG.create(data);
    //LOG.create(typeof(data));
    //LOG.create(Object.keys(data));
   //LOG.create(data);
    
    data = [{index: 10, description: "Desc", containedIn: 11}];
    return TABLES.parseTable("CSR_ENTITY_TABLE", "index", data, {index: {name: "Index",type:"number"}, description: {name: "Description",type:"string"}, containedIn: {name: "Parent Entity",type:"number"}});
}).startsWith(SIGNALS.NOT_READY).sendToClients("CSR_ENTITY_TABLE", AURORA.DATATYPE.UTF8);
}

*/