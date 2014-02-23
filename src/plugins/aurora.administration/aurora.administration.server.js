

STORAGE.createTableBI("aurora.pages", "pageId", {
	pageId:{name: "Page Id", type: "number"},
	title:{name: "Title", type: "string"},
	owner:{name: "Owner", type: "number"}
}).sendToClients("AURORA_PAGES", AURORA.DATATYPE.UTF8);

STORAGE.createTableBI("aurora.settings", "settingId", {
	settingId:{name: "Setting Id", type: "number"},
	name:{name: "Name", type: "string"},
	description:{name: "Description", type: "string"},
	value:{name: "Value", type: "string"},
	pluginId:{name: "Plugin Id", type: "string"},
	type:{name: "Type", type: "string"},
	metaData:{name: "Meta Data", type: "string"}
}).sendToClients("AURORA_SETTINGS", AURORA.DATATYPE.UTF8);
