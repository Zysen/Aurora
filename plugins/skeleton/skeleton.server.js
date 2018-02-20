SKELETON = (function(skeleton){
	
	var myChannel = WEBSOCKET.getChannel(skeleton.PLUGIN_NAME, skeleton.CHANNELS.TEST_CHANNEL, function(packet){
		myChannel.send(packet.data);
	});

	return skeleton;
}(SKELETON || {}));
