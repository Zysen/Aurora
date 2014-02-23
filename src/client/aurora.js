/*
 * Copyright (c) 2013-2016, The Aurora Team.  All Rights Reserved.
 *  
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 * 
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */

goog['require']("LOG");

var WIDGETS = (function(widgets, OBJECT){
	
	if(widgets.renderers==undefined){
		widgets.renderers = {};
	}
	
	var widgetTypes = {};
	var widgetInstanceCount = {};
	var widgetInstances = {};
	widgets.register = function(key, obj){
		widgetTypes[key] = obj;
		return obj;
	};
	widgets.inflateWidgets = function(element, inflatedWidgetSet){
		if(inflatedWidgetSet==undefined){
			inflatedWidgetSet = [];
		}

		if(element.className!=undefined && typeof(element.className)==="string" && element.className.startsWith("widget_")){
			var widgetName = element.className.replace("widget_", "");
			if(widgetTypes[widgetName]==undefined){
				LOG.create("Unable to find definition for widget "+widgetName);
				return;
			}
			if(widgetInstanceCount[widgetName]==undefined){
				widgetInstanceCount[widgetName] = 0;
			}
			widgetInstanceCount[widgetName]++;
	    	
	    	var instanceId = widgetName+widgetInstanceCount[widgetName];
	    	var arguments = {};
	    	if(element.title!=undefined&&element.title.length>0){
	        try{arguments = JSON.parse(element.title.replaceAll("'", '"'));}
			catch(e){LOG.create("Unable to parse JSON from widget title arguments");LOG.create(e);}
			}
			var widgetType = widgetTypes[widgetName];
			
			var cleanUp = [];
			var widget = new widgetType(instanceId, arguments, cleanUp);	
			
			var wBuild = widget.build();			
			if(!wBuild){
			 wBuild = DOM.create("span");
			}
			var elementParent = element.parentNode;
			if(typeof(wBuild)=='string'){
				elementParent.replaceChild(DOM.parse("<div>"+wBuild+"</div>")[0], element);
			}else{
				elementParent.replaceChild(wBuild, element);
			}

			widgetInstances[instanceId] = {widget: widget, widgetName:widgetName, instanceId:instanceId, element:elementParent, cleanUp:cleanUp};
			inflatedWidgetSet.push(widgetInstances[instanceId]);
		}
		for(var i=0; i<element.children.length;i++){
			widgets.inflateWidgets(element.children[i], inflatedWidgetSet);
		}
		return inflatedWidgetSet;
	};
	widgets.deflateWidgets = function(element){
		for(var instanceId in widgetInstances){
			if(widgetInstances[instanceId].element==element || DOM.elementIsDescendant(element, widgetInstances[instanceId].element)){
				widgetInstanceCount[widgetInstances[instanceId].widgetName]--;
				widgetInstances[instanceId].widget.destroy();
				for(var index in widgetInstances[instanceId].cleanUp){
					widgetInstances[instanceId].cleanUp[index].purge();	
				}
				OBJECT.delete(widgetInstances, instanceId);
			}
		}
	};
	widgets.loadWidgets = function(inflatedWidgetSet){
		if(inflatedWidgetSet==undefined){
			inflatedWidgetSet = widgetInstances;
		}
		for(var index in inflatedWidgetSet){
			inflatedWidgetSet[index].widget.load();
		}
	};
	return widgets;
}(WIDGETS || {}, OBJECT));

var AURORA = (function(aurora, F){
	aurora.settings = {scriptPath: parent.window.location.origin+"/"};
	var sendToServerE = F.receiverE();

	
	aurora.sendToClientE = F.receiverE();
	
	aurora.windowLoadE = F.extractEventE(window, 'load').mapE(function(){
		LOG.create("Starting Aurora version "+aurora.VERSION);
	});
	//Create a documents and a window behaviour. That is NOT_READY until onload fires.

	aurora.pageNameE = F.extractEventE(window, 'popstate').skipFirstE().mapE(function(ev){
		var pageName = document.URL.replace(aurora.settings.scriptPath, '');
		return (ev.state && ev.state.page)?ev.state.page:(pageName.length==0?aurora.settings.defaultPage:pageName);
	});	

	aurora.dataUpdateE = F.mergeE(sendToServerE, aurora.pageNameE.mapE(function(pageName){return {command: aurora.COMMANDS.REQUEST_PAGE, data: pageName};}));
	
	aurora.connectionStatusE = aurora.sendToClientE.filterE(function(packet){
		return packet.command==aurora.COMMANDS.CONNECTION_STATUS;
	});
	aurora.connectedE = aurora.connectionStatusE.mapE(function(packet){
		return packet.data==aurora.STATUS.CONNECTED;
	});

	aurora.connectedB = aurora.connectedE.startsWith(SIGNALS.NOT_READY);
	aurora.connectionErrorB = aurora.connectionStatusE.mapE(function(packet){
		return packet.data==aurora.STATUS.ERRORED;
	}).startsWith(SIGNALS.NOT_READY);

	aurora.serverVersionE = aurora.sendToClientE.filterE(function(packet){
		return packet.command==aurora.COMMANDS.VERSION;
	}).mapE(function(packet){
		return packet.data;
	});
	
	aurora.serverVersionE.filterRepeatsE().mapE(function(version){
		LOG.create("Server is running version "+version);
		return version;
	}).skipFirstE().mapE(function(version){
		LOG.create("Client and Server versions do not match. Reloading page.");
		location.reload();
	});

	F.liftB(function(windowLoaded, socketConnected){
		if(!good() || socketConnected==false){
			return chooseSignal();
		}
		if(socketConnected==true){
			LOG.create("Page Loaded and socket connected. Inflating widgets "+socketConnected);
			WIDGETS.loadWidgets(WIDGETS.inflateWidgets(document.body));
		}
	}, aurora.windowLoadE.startsWith(SIGNALS.NOT_READY), aurora.connectedE.onceE().startsWith(false));


	aurora.pageBuiltE = aurora.sendToClientE.filterE(function(message){
		return message.command==aurora.RESPONSES.PAGE;
	}).mapE(function(response){
		WIDGETS.deflateWidgets(DOM.get("content"));
		DOM.get("content").innerHTML = response.data;
		WIDGETS.loadWidgets(WIDGETS.inflateWidgets(DOM.get("content")));
	});
	
	//Catch login cookie updates.	
	
	aurora.sendToServer = function(message){
		sendToServerE.sendEvent(message);
	};
	aurora.sendToClient = function(message){
		aurora.sendToClientE.sendEvent(message);
	};
	return aurora;
}(AURORA || {}, F));


var DATA = (function(dataManager, F, aurora){
	var referenceCount = {};
	var requests = {};	
	
	dataManager.requestE = function(instanceId, objectName){
		referenceCount[objectName] = referenceCount[objectName]==undefined?1:(referenceCount[objectName]+1);
		if(referenceCount[objectName]===1){
			aurora.sendToServer({command: aurora.COMMANDS.REGISTER_DATA, key: objectName});
		}
		requests[instanceId] = aurora.sendToClientE.filterE(function(message){
			return message.command===aurora.COMMANDS.UPDATE_DATA && message.key===objectName;
		}).mapE(function(messagePacket){return messagePacket.data;});
		return requests[instanceId];
	};
	dataManager.requestB = function(instanceId, objectName){
		return F.liftBI(function(newData){return newData;}, function(newData){
			aurora.sendToServer({command: aurora.COMMANDS.UPDATE_DATA, key: objectName, data:newData});
			return [newData];
		}, dataManager.requestE(instanceId, objectName).startsWith(SIGNALS.NOT_READY));
	}
	dataManager.release = function(instanceId, objectName){
		referenceCount[objectName] = (referenceCount[objectName]==undefined||referenceCount[objectName]<=0)?0:(referenceCount[objectName]-1);
		if(referenceCount[objectName]<=0){
			aurora.sendToServer({command: aurora.COMMANDS.DEREGISTER_DATA, key: objectName});
		}
		if(referenceCount[objectName]<0){
			LOG.create("Object "+objectName+" has been released too many times. Count dropped below 0");
		}
		
		requests[instanceId].purge();	
		OBJECT.delete(requests[instanceId]);
	};
	dataManager.reregisterAll = function(){
		for(var objectName in referenceCount){
			aurora.sendToServer({command: aurora.COMMANDS.REGISTER_DATA, key: objectName});
		}
	}
	
	
	
	var webSocket; 	
	dataManager.connect = function(ws){
		var reconnected = false;
		if(ws!=undefined){
			ws.close();
			ws = undefined;
			reconnected = true;
		}
		if(typeof(WebSocket)!="undefined"){
			webSocket = new WebSocket((location.protocol==="https:"?"wss":"ws")+'://'+location.hostname+(location.port ? ':'+location.port: ''), 'aurora_channel');
		    webSocket.onopen = function () {
		    	LOG.create("Websocket connection established");
		    	aurora.sendToClient({command: aurora.COMMANDS.CONNECTION_STATUS, data: aurora.STATUS.CONNECTED});
		    	if(reconnected){
		    		dataManager.reregisterAll();
		    	}
		    };
		    webSocket.onclose = function () {
		    	LOG.create("Websocket connection closed");
		    	aurora.sendToClient({command: aurora.COMMANDS.CONNECTION_STATUS, data: aurora.STATUS.DISCONNECTED});
		    	setTimeout(function(){
		    		dataManager.connect(webSocket);
		    	}, 4000);
		    }
		    webSocket.onerror = function (error) {
		        aurora.sendToClient({command: aurora.COMMANDS.CONNECTION_STATUS, data: aurora.STATUS.ERRORED});
		    };
		    //Messages from server to GUI
		    webSocket.onmessage = function (packet) {
		        //LOG.create(packet);
		    	//try{
					aurora.sendToClient(JSON.parse(packet.data));
				//}
				//catch(e){
				//	aurora.sendToClient(aurora.ERRORS.DATA_UPDATE_PARSE(e));
				//	console.log(e.message);
				//	LOG.create(e);
				//}
		    };
		}else{
			LOG.create("Sorry but your browser does not support WebSockets");	
		}
	};
	aurora.dataUpdateE.mapE(function(packet){
		if(webSocket==undefined){
			LOG.create("Unabled to send data, WebSocket has not been initialized");
			return;
		}
		webSocket.send((typeof(packet)!='string')?JSON.stringify(packet):packet);
    });
	dataManager.connect();
	
	return dataManager;
}(DATA || {}, F, AURORA));





window.changePage = function(page){
	if(history){
		history.pushState(page, page, page);
	}
	AURORA.sendToServer({command: AURORA.COMMANDS.REQUEST_PAGE, data: page});
	return false;
};
