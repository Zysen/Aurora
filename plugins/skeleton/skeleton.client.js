SKELETON = (function(skeleton){
	
	WIDGETS.register("Skeleton", function(id, args){
		var container = document.createElement("div");
		container.innerHTML = "Skeleton Widget";
		var buttonElement = document.createElement("button");
		buttonElement.innerHTML = "Click";
		container.appendChild(buttonElement);
		return {
			build: function(){
				return container;
			},
			load: function(){
				var myChannel = WEBSOCKET.getChannel(skeleton.PLUGIN_NAME, skeleton.CHANNELS.TEST_CHANNEL, function(packet){
					console.log(packet.data);
				});
				
				buttonElement.onclick = function(){
					myChannel.send({
						message: "Client Message"
					});
				};
			}
		};
	});
	
	return skeleton;
}(SKELETON || {}));
