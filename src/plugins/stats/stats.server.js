var fs = require("fs");

var osm = require("os-monitor");
osm.start({
	delay : 333,
	freemem : 1e9,
	critical1 : .7,
	critical5 : .7,
	critical15 : .7
});


var memUsageE = F.receiverE();
memUsageE.sendToClients("AURORA_MEM_USAGE", AURORA.DATATYPE.UTF8);
var upTimeE = F.receiverE();
upTimeE.sendToClients("AURORA_UPTIME", AURORA.DATATYPE.UTF8);
var loadAvgE = F.receiverE();
loadAvgE.sendToClients("AURORA_LOAD_AVERAGE", AURORA.DATATYPE.UTF8);

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
osMonitorUpdateRateBI.sendToClients("STATS_RATE", AURORA.DATATYPE.UTF8);

STORAGE.createTableBI("names", "index", {index:{name: "Index", type: "number"}, name:{name: "Name", type: "string"}, value:{name: "Value", type: "number"}}).sendToClients("TEST_TABLE", AURORA.DATATYPE.UTF8);