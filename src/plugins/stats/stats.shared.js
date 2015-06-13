var STATS = (function(stats, aurora){
	stats.CHANNEL_ID = "stats";
	stats.CHANNELS = {uptime: 0, load_average:1, memory_usage:2, update_rate:3};
	return stats;
})(STATS || {}, AURORA);
