var STATS = (function(stats){
	var osm = require("os-monitor");
	osm.start({
		delay : 333,
		freemem : 1e9,
		critical1 : .7,
		critical5 : .7,
		critical15 : .7
	});
	
	
	var memUsageE = F.receiverE();
	memUsageE.sendToClients(stats.CHANNEL_ID, stats.CHANNELS.memory_usage);
	var upTimeE = F.receiverE();
	upTimeE.sendToClients(stats.CHANNEL_ID, stats.CHANNELS.uptime);
	var loadAvgE = F.receiverE();
	loadAvgE.sendToClients(stats.CHANNEL_ID, stats.CHANNELS.load_average);
	
	osm.on("monitor", function(e){
		memUsageE.sendEvent({
			free : e.freemem,
			total : e.totalmem
		});
		upTimeE.sendEvent(e.uptime);
		loadAvgE.sendEvent(e.loadavg);
	});
	
	
	var delayE = F.receiverE();
	var osMonitorUpdateRateBI = F.liftBI(function(delay){
		delay = delay<9999?(delay>0?delay:500):1000;
		osm.stop();
		osm.config({delay:delay});
		osm.start();
		return delay;
	}, function(delay){delayE.sendEvent(delay);return [delay];}, delayE.startsWith(333));
	osMonitorUpdateRateBI.sendToClients(stats.CHANNEL_ID, stats.CHANNELS.update_rate);
	
	return stats;
})(STATS || {});
