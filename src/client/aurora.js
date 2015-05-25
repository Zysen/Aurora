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
var CKEDITOR = undefined;
var COOKIES = (function(cookieLib){
	cookieLib.getCookie = function(name) {
      var value = "; " + document.cookie;
      var parts = value.split("; " + name + "=");
      if (parts.length == 2) return parts.pop().split(";").shift();
    };
    cookieLib.remove = function( name ) {
    	document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	};
    return cookieLib;
}(COOKIES || {}));

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
		
	//TODO: Deprecated, this is legacy.
	widgets.instantiateWidget = function(widget_name, args){
    	// Find definition
    	if(widgetTypes[widget_name]==undefined){
			LOG.create("Unable to find definition for widget "+widget_name);
			return;
		}
    	widgetInstanceCount[widget_name] = (widgetInstanceCount[widget_name] == undefined) ? 1 : ++widgetInstanceCount[widget_name];
		var widgetType = widgetTypes[widget_name];
		var instanceId = widget_name+widgetInstanceCount[widget_name];
		var cleanup = [];
		var widget = new widgetType(instanceId, arguments, cleanup);
		return {instanceId:instanceId, widget:widget, cleanup:cleanup};
	};
    
	widgets.inflateWidgets = function(element, inflatedWidgetSet){
		if(inflatedWidgetSet==undefined){
			inflatedWidgetSet = [];
		}

		if(element.className!=undefined && typeof(element.className)==="string" && element.className.startsWith("widget_")){
			var widget_name = element.className.replace("widget_", "");
			
			var arguments = {};
	    	if(element.title!=undefined&&element.title.length>0){
	        try{arguments = JSON.parse(element.title.replaceAll("'", '"'));}
			catch(e){LOG.create("Unable to parse JSON from widget title arguments");LOG.create(e);}
			}
			console.log("widgets inflatWidgets");
			var inflated = widgets.instantiateWidget(widget_name, arguments);
			if(inflated===undefined){
				return;
			}

			var wBuild = inflated.widget.build();			
			if(!wBuild){
			 wBuild = DOM.create("span");
			}
			var elementParent = element.parentNode;
			if(typeof(wBuild)=='string'){
				elementParent.replaceChild(DOM.parse("<div>"+wBuild+"</div>")[0], element);
			}else{
				elementParent.replaceChild(wBuild, element);
			}

			widgetInstances[inflated.instanceId] = {widget: inflated.widget, widget_name:widget_name, instanceId:inflated.instanceId, element:elementParent, cleanUp:inflated.cleanUp};
			inflatedWidgetSet.push(widgetInstances[inflated.instanceId]);
		}
		for(var i=0; i<element.children.length;i++){
			widgets.inflateWidgets(element.children[i], inflatedWidgetSet);
		}
		return inflatedWidgetSet;
	};
	widgets.deflateWidgets = function(element){
		for(var instanceId in widgetInstances){
			if(widgetInstances[instanceId].element==element || DOM.elementIsDescendant(element, widgetInstances[instanceId].element)){
				widgetInstanceCount[widgetInstances[instanceId].widget_name]--;
				if(widgetInstances[instanceId].widget.destroy){
					widgetInstances[instanceId].widget.destroy();
				}
				else{
					console.log("Cannot cleanup widget "+instanceId+", no destory method can be found.");
				}
				for(var index in widgetInstances[instanceId].cleanUp){
					widgetInstances[instanceId].cleanUp[index].purge();	
				}
				OBJECT.remove(widgetInstances, instanceId);
			}
		}
	};
	widgets.loadWidgets = function(inflatedWidgetSet){
		if(inflatedWidgetSet==undefined){
			inflatedWidgetSet = widgetInstances;
		}
		for(var index in inflatedWidgetSet){
			if(inflatedWidgetSet[index].widget.load){
				inflatedWidgetSet[index].widget.load();
			}
			else if(inflatedWidgetSet[index].widget.loader){	//Legacy support
				inflatedWidgetSet[index].widget.loader();
			}
		}
	};
	widgets.get = function(key){
		return widgetTypes[key];
	};
	
	return widgets;
}(WIDGETS || {}, OBJECT));

var AURORA = (function(aurora, F, cookies){
	aurora.settings = {scriptPath: parent.window.location.origin+"/"};
	var sendToServerE = F.receiverE();
	var changePageE = F.receiverE();
	var cookie = cookies.getCookie("sesh").split("-");
    aurora.token = cookie[0];
	
	aurora.sendToClientE = F.receiverE();
	
	aurora.windowLoadE = F.extractEventE(window, 'load').mapE(function(){
		LOG.create("Starting Aurora version "+aurora.VERSION);
	});
	//Create a documents and a window behaviour. That is NOT_READY until onload fires.

	aurora.pageNameE = F.mergeE(changePageE, 
		F.extractEventE(window, 'popstate').skipFirstE().mapE(function(ev){	//TODO: Check skipFirst doesn't effect Firefox.
			var pageName = document.URL.replace(aurora.settings.scriptPath, '');
			return (ev.state && ev.state.page) ? ev.state.page : pageName;
		})
	).mapE(function(pageName){
		return pageName.length ? pageName : aurora.settings.defaultPage;
	});	
	
	aurora.pageNameB = aurora.pageNameE.startsWith(window.location.pathname.substring(1));
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

	aurora.widgetsLoadedE = F.liftB(function(windowLoaded, socketConnected){
		if(!good() || socketConnected==false){
			return chooseSignal();
		}
		if(socketConnected==true){
			LOG.create("Page Loaded and socket connected. Inflating widgets "+socketConnected);
			WIDGETS.loadWidgets(WIDGETS.inflateWidgets(document.body));
		}
		return true;
	}, aurora.windowLoadE.startsWith(SIGNALS.NOT_READY), aurora.connectedE.onceE().startsWith(false)).changes();

	
	var firstRawPageB = F.liftB(function(windowLoaded, socketConnected){
		if(!good() || socketConnected==false){
			return chooseSignal();
		}
		LOG.create("Page Loaded and socket connected. Inflating widgets "+socketConnected);
		var rawPage = DOM.get('content').innerHTML;
		WIDGETS.loadWidgets(WIDGETS.inflateWidgets(document.body));
		return rawPage;
	}, aurora.windowLoadE.startsWith(SIGNALS.NOT_READY), aurora.connectedE.onceE().startsWith(false));

	aurora.pageBuiltE = aurora.sendToClientE.filterE(function(message){
		return message.command==aurora.RESPONSES.PAGE;
	}).mapE(function(response){
		if(CKEDITOR!=null && CKEDITOR.instances.content){
			CKEDITOR.instances.content.destroy();
		}
		WIDGETS.deflateWidgets(DOM.get("content"));
		DOM.get("content").innerHTML = response.data;
		WIDGETS.loadWidgets(WIDGETS.inflateWidgets(DOM.get("content")));
		return response.data;
	});	
	
	aurora.rawPageB = F.liftB(function(firstPage, updatedPage){
		if(!good(updatedPage)){
			return firstPage;
		}
		return updatedPage;
	}, firstRawPageB,aurora.pageBuiltE.startsWith(SIGNALS.NOT_READY));
	//Catch login cookie updates.	
	
	aurora.sendToServer = function(message){
		sendToServerE.sendEvent(message);
	};
	aurora.sendToClient = function(message){
		aurora.sendToClientE.sendEvent(message);
	};

	aurora.sendEvent = function(channelID, data){
		aurora.sendToServer({command: AURORA.COMMANDS.UPDATE_DATA,key:channelID, data: data});
	};
	
	aurora.changePage = function(page){
		//if(history){
			//history.pushState(page, page, page);
		//}
		//console.log("Changing page to "+page);
		window.location = page;
		//changePageE.sendEvent(page);
		return false;
	};

	return aurora;
}(AURORA || {}, F, COOKIES));


var DATA = (function(dataManager, F, aurora){
	var referenceCount = {};
	var requests = {};	
	
	dataManager.sendToServer = aurora.sendEvent; 
	
	dataManager.receiveE = function(instanceId, objectName){
		return aurora.sendToClientE.filterE(function(message){
			return message.command===aurora.COMMANDS.UPDATE_DATA && message.key===objectName;
		}).mapE(function(messagePacket){return messagePacket.data;});
	};
	
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
	};
	
	dataManager.requestTableBI = function(instanceId, key){
		var initialTable = SIGNALS.NOT_READY;
		var channelE = dataManager.getChannelE(instanceId, key);
		
		channelE.collectE(initialTable, function(newState, state){
			if(newState.command==="update"){	//Whole table
				state = newState.data;
			}
			//else if(newState==="chunk"){		//Chunk of table
				//TODO: Add new chunks to state
			//}
			//else if(newState==="change"){		//Changeset for table
				//TODO: Run through change set add changes to state
			//}
			return state;
		});
		
		return F.liftBI(function(newState){
			return newState;
		}, function(newState){
			//TODO: check for and handle cases of changesets or chunks 
			channelE.send("update", newState);
		}, channelE.startsWith(SIGNALS.NOT_READY));
	};
	
	/*
	dataManager.requestChunkedB = function(instanceId, objectName){
       
        var inputB = DATA.requestE(instanceId, objectName).chunkedCollectE().mapE(function(object){
            //LOG.create(Object.keys(object["$.get"]));
            var firstKey = Object.keys(object["$.get"])[0];
            return object["$.get"][firstKey];
        }).startsWith(SIGNALS.NOT_READY); 

        return F.liftBI(function(newData){return newData;}, function(newData){
            //aurora.sendToServer({command: aurora.COMMANDS.UPDATE_DATA, key: objectName, data:newData});
            LOG.create("Error - Chunked data upstream is not implemented.");
            return [newData];
        }, inputB);

    };
    */
	
	dataManager.release = function(instanceId, objectName){
		referenceCount[objectName] = (referenceCount[objectName]==undefined||referenceCount[objectName]<=0)?0:(referenceCount[objectName]-1);
		if(referenceCount[objectName]<=0){
			aurora.sendToServer({command: aurora.COMMANDS.DEREGISTER_DATA, key: objectName});
		}
		if(referenceCount[objectName]<0){
			LOG.create("Object "+objectName+" has been released too many times. Count dropped below 0");
		}
		
		requests[instanceId].purge();	
		OBJECT.remove(requests[instanceId]);
	};
	dataManager.reregisterAll = function(){
		for(var objectName in referenceCount){
			aurora.sendToServer({command: aurora.COMMANDS.REGISTER_DATA, key: objectName});
		}
	};
	
	dataManager.getChannelE = function(instanceId, channelId){
		 var channelE = dataManager.receiveE(instanceId, channelId);
		 channelE.filterCommandsE = function(){
			 var args = arguments;
			 return channelE.filterE(function(packet){
				 for(var index in args){
					 if(args[index]===packet.command){
						 return true;
					 }
				 }
				 return false;
			}).mapE(function(packet){
				return {data: packet.data};
			});
		 };
		 channelE.send = function(command, data){
			 dataManager.sendToServer(channelId, {command: command, data: data});
		 };
		 return channelE;
	};
	
	function extractData(str){
		//This is for extracting data from a binary stream back to JSON
	    var qCount = 0;
	    var key = "";
	    var command = "";
	    var data = "";
	    var end = "";
	    var textMarkerFound = false;
	    
	    
	    
	    for(var index=0;index<str.length;index++){
	        if(str.charCodeAt(index)===0){
	            continue;
	        }
	        var ch = str.charAt(index);
	        
	        if(qCount>=6){
                data+=ch;
            }
	        else if(ch==='"'){
                qCount++;
            }
	        else if(qCount===1){
	           command += ch;
	        }
	        else if(qCount===3){
	            key+=ch;
	        }
	        else if(qCount===5){
                end+=ch;
            }
	    }
	    //LOG.create({command:parseInt(command), key:key, data: data, end: end==="true"});
	    //LOG.create(key);
	    //LOG.create(data);
	    //LOG.create("");
	    return {command:parseInt(command), key:key, data: {data:data, end: end==="true"}};
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
			webSocket = new WebSocket((location.protocol==="https:"?"wss":"ws")+'://'+location.hostname+(location.port ? ':'+location.port: '')+'/ie10fix', 'aurora_channel');	//IE10 requires something after the main address.
		    dataManager.webSocket = webSocket;
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
		    };
		    webSocket.onerror = function (error) {
		        aurora.sendToClient({command: aurora.COMMANDS.CONNECTION_STATUS, data: aurora.STATUS.ERRORED});
		    };
		    //Messages from server to GUI
		    webSocket.onmessage = function (packet) {
		    //	try{
		    	    if(packet.data instanceof Blob){
                        var fileReader = new FileReader();
                        fileReader.onload = function() {
                            //console.log("");
                            //console.log(this.result);
                            aurora.sendToClient(extractData(this.result));
                        };
                        //fileReader.readAsArrayBuffer(packet.data);
                        
                        
                       // LOG.create(packet.data);
                        
                        fileReader.readAsBinaryString(packet.data, "utf8");
                        //fileReader.readAsText(packet.data, "utf8");
                        //console.log(packet.data);
		    	    }
		    	    else{
		    	    	
		    	        aurora.sendToClient(JSON.parse(packet.data));
		    	    }
			/*
		    	}
				catch(e){
					aurora.sendToClient(aurora.ERRORS.DATA_UPDATE_PARSE(e));
					console.log("WebSocket onmessage Error");
					LOG.create(e);
					console.log(packet.data);
				}
				*/
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
		webSocket.send(JSON.stringify({token: aurora.token, message:packet}));
    });
	dataManager.connect();
	return dataManager;
}(DATA || {}, F, AURORA));
