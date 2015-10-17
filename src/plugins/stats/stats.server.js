var STATS = (function(stats){
	var osm = require("os-monitor");
	osm.start({
		delay : 333,
		freemem : 1e9,
		critical1 : .7,
		critical5 : .7,
		critical15 : .7
	});
	
	var statsR = F.receiverE();
	osm.on("monitor", function(e){
		e.memUsage = {
			free : e.freemem,
			total : e.totalmem
		};
		statsR.sendEvent(e);
	});
	statsR.propertyE("memUsage").sendToClients(stats.CHANNEL_ID, stats.CHANNELS.memory_usage, "Memory Usage");
	statsR.propertyE("uptime").sendToClients(stats.CHANNEL_ID, stats.CHANNELS.uptime, "Uptime");
	statsR.propertyE("loadavg").sendToClients(stats.CHANNEL_ID, stats.CHANNELS.load_average, "Load Average");
	
	
	var delayE = F.receiverE();
	var osMonitorUpdateRateBI = F.liftBI(function(delay){
		delay = delay<9999?(delay>0?delay:500):1000;
		osm.stop();
		osm.config({delay:delay});
		osm.start();
		return delay;
	}, function(delay){delayE.sendEvent(delay);return [delay];}, delayE.startsWith(333));
	osMonitorUpdateRateBI.sendToClients(stats.CHANNEL_ID, stats.CHANNELS.update_rate, "Update Rate");
	
	return stats;
}(STATS || {}));
