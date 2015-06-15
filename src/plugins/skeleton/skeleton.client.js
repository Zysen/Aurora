var SKELETON = (function(skeleton, dataManager, widgets, aurora){
	
	widgets.register("ServerTime", function(instanceId, data, purgeData) {
		var container = DOM.create("div");
		var timeContainer = DOM.create('div');
		var updatingTimeContainer = DOM.create('div');
		var getTimeButton = DOM.create('button', undefined, undefined, "Get Time");
		var slider = DOM.create("input");
		slider.type = "range";
		slider.min = 0;
		slider.max = 100;
		
		container.appendChild(timeContainer);
		container.appendChild(getTimeButton);
		container.appendChild(updatingTimeContainer);
		container.appendChild(slider);
		
		return {
		    build : function() {
			    return container;			//This can be an HTML_Element or a string containing HTML
		    },
		    load : function() {
		    	//Channels Example

		    	var channelE = dataManager.getChannelE(instanceId, skeleton.CHANNEL_ID, skeleton.CHANNELS.MAIN);
		    	
		    	var dailyTableB = channelE.filterCommandsE(skeleton.COMMANDS.GET_TIME).mapE(function(packet){
		    		timeContainer.innerHTML = packet.data.time;
				});
		    	
		    	F.clicksE(getTimeButton).mapE(function(){
		    		channelE.send(skeleton.COMMANDS.GET_TIME, {some_name: "some_data"});
		    	});
		    	
		    	//Behaviour Example    	
		    	DATA.requestB(instanceId, skeleton.CHANNEL_ID, skeleton.CHANNELS.SKELETON_TIME).liftB(function(date){
		    		updatingTimeContainer.innerHTML = date;
		    	});
		    	
		    	//Bi-Directional Behaviour Example
		    	
		    	var sliderBI = DATA.requestB(instanceId, skeleton.CHANNEL_ID, skeleton.CHANNELS.SKELETON_SLIDER);
		    	sliderBI.liftB(function(value){
		    		slider.value = value;
		    	});
		    	
		    	var sliderValueB = F.extractValueB(slider).liftB(function(value){
		    		sliderBI.sendEvent(slider.value);
		    	});
		    	
		    	
		    },
		    destroy : function() {
			    DOM.remove(container);
		    }
		};
	});
	
	return skeleton;
}(SKELETON || {}, DATA, WIDGETS, AURORA));

//To use this widget add the following to an html file in resources/pages/ <div class="widget_ServerTime">&nbsp;</div>"