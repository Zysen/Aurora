//This file will maintain a web socket connection with the server and will run most of the flapjax data tree. WIdget behaviours will be passed out to the GUI thread.


/*
var DATA = (function(dataManager, aurora){
	
	dataManager.connect = function(ws){
		if(ws!=undefined){
			ws.close();
			ws = undefined;
		}
		if(typeof(WebSocket)!="undefined"){
			var webSocket = new WebSocket("ws://localhost:8000", 'aurora_channel');
		    webSocket.onopen = function () {
		    	LOG.create("Websocket connection established");
		    	postMessage({command: aurora.COMMANDS.CONNECTION_STATUS, data: aurora.STATUS.CONNECTED});
		    };
		    webSocket.onclose = function () { 
		    	LOG.create("Websocket connection closed");
		    	postMessage({command: aurora.COMMANDS.CONNECTION_STATUS, data: aurora.STATUS.DISCONNECTED});
		    	
		    	setTimeout(function(){
		    		dataManager.connect(webSocket);
		    	}, 4000);
		    	
		    }
		    webSocket.onerror = function (error) {
		        LOG.create(SIGNALS.newError("WebSocket Error: "+error));
		        postMessage({command: aurora.COMMANDS.CONNECTION_STATUS, data: aurora.STATUS.ERRORED});
		    };            
		    
		    //Messages from server to GUI
		    webSocket.onmessage = function (packet) {
		    	try{
					postMessage(JSON.parse(packet.data));
				}
				catch(e){
					postMessage(aurora.ERRORS.DATA_UPDATE_PARSE(e));
				}
		    };
		    
		    //Messages from GUI to Server
			onmessage = function(packet) {
				var message = packet.data;
				webSocket.send((typeof(message)!='string')?JSON.stringify(message):message);
			};
		}else{
			LOG.create("Sorry but your browser does not support WebSockets");	
		}
	}
	dataManager.connect(undefined);
	return dataManager;

})(DATA || {}, AURORA);

*/





/*


//This file will maintain a web socket connection with the server and will run most of the flapjax data tree. WIdget behaviours will be passed out to the GUI thread.
var DATA = (function(dataManager, aurora){
	var parent = this;
    dataManager.openE = F.receiverE();
    dataManager.openB = dataManager.openE.startsWith(NOT_READY);
    dataManager.messageE = F.receiverE();
    dataManager.errorE = F.receiverE();
    var reconnectE = F.receiverE();
    reconnectE.delayE(1000).mapE(function(){
    	if("WebSocket" in window){
    	    var webSocket = new WebSocket("ws://localhost:8000", 'aurora_channel');//, ['soap', 'xmpp']
    	    webSocket.onopen = function () {
    	        parent.openE.sendEvent(true);
    	    };
    	    webSocket.onclose = function () { 
    	        parent.openE.sendEvent(false); 
    	        reconnectE.sendEvent(true);
    	    }
    	    webSocket.onerror = function (error) {
    	        parent.errorE.sendEvent(error);
    	    };            
    	    webSocket.onmessage = function (e) {
    	    	if(e.data.contains("chatData")){

    	    	}
    	    	parent.messageE.sendEvent(e);
    	        //document.getElementById("content").innerHTML += e.data+"<br />";
    	    };
    	    parent.send = function(message){
    	        message = (typeof(message)!='string')?JSON.stringify(message):message;
    	         webSocket.send(message);  
    	     }
        }
    });
    reconnectE.sendEvent(true);
    
	return dataManager;
})(DATA || {}, AURORA);
*/