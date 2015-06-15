var SKELETON = (function(skeleton, dataManager){
	
	//Channels Example
	var channelE = dataManager.getCommandChannelE(skeleton.CHANNEL_ID, skeleton.CHANNELS.SKELETON_TIME, "Skeleton Time");								//2 Way data channel
	channelE.filterCommandsE(skeleton.COMMANDS.GET_TIME).mapE(function(packet){					//Respond with data when requested
		console.log("Received Time Request Packet");
		console.log(packet.data);
		channelE.send(packet.connection, skeleton.COMMANDS.GET_TIME, {time:new Date()});	//Respond with timestamp
	});
	
	//Behaviour Example
	var timestampB = F.timerB(500).liftB(function(time){			//Send a new timestamp to interested clients every 500ms
		return new Date()+"";
	});
	timestampB.sendToClients(skeleton.CHANNEL_ID, skeleton.CHANNELS.SKELETON_TIMESTAMP, "Skeleton Timestamp");
	
	//Bi-Directional Behaviour Example															//A data object that is both getable and setable through the FRP Tree
	var pushBackE = F.receiverE();						//Push new data to other clients.
	var sliderValueB = F.liftBI(function(serverValue){
		console.log("Slider Value Updated DOWN");
		console.log(serverValue);
		return serverValue;
	},function(clientValue){
		pushBackE.sendEvent(clientValue);
	}, pushBackE.startsWith(10));
	
	sliderValueB.sendToClients(skeleton.CHANNEL_ID, skeleton.CHANNELS.SKELETON_SLIDER, "Skeleton Slider");
	
	return skeleton;
}(SKELETON || {}, DATA));


