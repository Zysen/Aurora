var STATS = (function(stats, widgets, binary) {
	if (stats.WIDGETS == undefined) {
		stats.WIDGETS = {};
	}


	stats.WIDGETS.UpTime = function(instanceId, data, purgeData) {
		var container = document.createElement("div");
		return {
			build : function() {
				return container;
			},
			load : function() {
				DATA.getChannelE(instanceId, stats.CHANNEL_ID, stats.CHANNELS.uptime).mapE(function(uptime) {
					container.innerHTML = "Uptime: " + JSON.parse(binary.arrayBufferToString(uptime));
				});
			},
			destroy : function() {
				DATA.release(instanceId, "AURORA_UPTIME");
				DOM.remove(container);
			}
		};
	};
	widgets.register("UpTime", stats.WIDGETS.UpTime);

	stats.WIDGETS.LoadAverage = function(instanceId, data, purgeData) {
		var container = document.createElement("div");
		return {
			build : function() {
				return container;
			},
			load : function() {
				DATA.getChannelE(instanceId, stats.CHANNEL_ID, stats.CHANNELS.load_average).mapE(function(load) {
					load = JSON.parse(binary.arrayBufferToString(load));
					container.innerHTML = load[0] + " " + load[1] + " " + load[2];
				});
			},
			destroy : function() {
				DATA.release(instanceId, "AURORA_LOAD_AVERAGE");
				DOM.remove(container);
			}
		};
	};
	widgets.register("LoadAverage", stats.WIDGETS.LoadAverage);

	stats.WIDGETS.MousePosition = function(instanceId, data, purgeData) {
		var container = document.createElement("div");
		return {
			build : function() {
				return container;
			},
			load : function() {
				F.mouseB(document).cleanUp(purgeData).liftB(function(mousePos) {
					container.innerHTML = JSON.stringify(mousePos);
				});
			},
			destroy : function() {
				LOG.create("Releasing widget " + instanceId);
				DOM.remove(container);
			}
		};
	};
	widgets.register("MousePosition", stats.WIDGETS.MousePosition);

	stats.WIDGETS.StatisticUpdateRate = function(instanceId, data, purgeData) {
		var slider = document.createElement("input");
		slider.type = "range";
		slider.min = 1;
		slider.max = 2000;
		return {
			build : function() {
				return slider;
			},
			load : function() {
				var rateBI = DATA.requestObjectB(instanceId, stats.CHANNEL_ID, stats.CHANNELS.update_rate);
				rateBI.liftB(function(rate) {
					slider.value = rate;
				});
				F.extractValueE(slider).cleanUp(purgeData).filterRepeatsE().mapE(function(rate) {//.calmE(1000)
					rateBI.sendEvent(parseInt(rate));
				});
			},
			destroy : function() {
				DATA.release(instanceId, "STATS_RATE");
				DOM.remove(slider);
			}
		};
	};
	widgets.register("StatisticUpdateRate", stats.WIDGETS.StatisticUpdateRate);
	return stats;
}(STATS || {}, WIDGETS, BINARY));
