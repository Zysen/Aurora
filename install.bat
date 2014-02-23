call npm install mime
call npm install websocket
call npm install os-monitor

call npm install jsmin2
call npm install node-jslint
call npm install jsdoc2
call npm install exec
call npm install openssl

mkdir data

echo {"httpPort": 80,"sslPort": 443,"forceSSL": false, "theme":"aurora", "directoryBrowsing":true, "defaultPage":"home"} > config.json
cd data
echo [{"permissionId":1,"dataSource":"AURORA_USERS","groupId":3,"userId":"","access":"RW"},{"permissionId":2,"dataSource":"AURORA_GROUPS","groupId":3,"userId":"","access":"RW"},{"permissionId":3,"dataSource":"AURORA_DATASOURCESADMIN","groupId":3,"userId":"","access":"RW"},{"permissionId":4,"dataSource":"AURORA_DATAPERMISSIONS","groupId":3,"userId":"","access":"RW"},{"permissionId":5,"dataSource":"AURORA_ACTIVE_USERS","groupId":3,"userId":"","access":"RW"},{"permissionId":6,"dataSource":"AURORA_PAGES","groupId":3,"userId":"","access":"RW"},{"permissionId":7,"dataSource":"AURORA_SETTINGS","groupId":3,"userId":"","access":"RW"},{"permissionId":8,"dataSource":"AURORA_MEM_USAGE","groupId":3,"userId":"","access":"RW"},{"permissionId":9,"dataSource":"AURORA_UPTIME","groupId":3,"userId":"","access":"RW"},{"permissionId":10,"dataSource":"AURORA_LOAD_AVERAGE","groupId":3,"userId":"","access":"RW"},{"permissionId":11,"dataSource":"STATS_RATE","groupId":3,"userId":"","access":"RW"},{"permissionId":12,"dataSource":"AURORA_DATASOURCES","groupId":3,"userId":"","access":"RW"},{"dataSource":"checklist.categories","groupId":"1","userId":"","access":"R","permissionId":13},{"dataSource":"checklist.categories","groupId":"3","userId":"","access":"RW","permissionId":14},{"dataSource":"STATS_RATE","groupId":"1","userId":"","access":"R","permissionId":15},{"dataSource":"AURORA_UPTIME","groupId":"1","userId":"","access":"R","permissionId":16},{"dataSource":"AURORA_MEM_USAGE","groupId":"1","userId":"","access":"R","permissionId":17}] > aurora.datapermissions.json
echo [{"userId":1,"firstname":"root","lastname":"user","emailaddress":"admin","username":"admin","password":"21232f297a57a5a743894a0e4a801fc3","groupId":3}] > aurora.users.json
echo [{"groupId":1,"description":"Public","locked":true},{"groupId":2,"description":"Members","locked":false},{"groupId":3,"description":"Administrators","locked":true}] > aurora.groups.json
echo [{"permissionId":1,"dataSource":"AURORA_USERS","groups":{"3":"RW"}},{"permissionId":2,"dataSource":"AURORA_GROUPS","groups":{"3":"RW"}},{"permissionId":3,"dataSource":"AURORA_DATASOURCESADMIN","groups":{"3":"RW"}},{"permissionId":4,"dataSource":"AURORA_DATAPERMISSIONS","groups":{"3":"RW"}},{"permissionId":5,"dataSource":"AURORA_ACTIVE_USERS","groups":{"3":"RW"}},{"permissionId":6,"dataSource":"AURORA_PAGES","groups":{"1":"R","3":"RW"}},{"permissionId":7,"dataSource":"AURORA_SETTINGS","groups":{"3":"RW"}},{"permissionId":8,"dataSource":"AURORA_MEM_USAGE","groups":{"3":"RW"}},{"permissionId":9,"dataSource":"AURORA_UPTIME","groups":{"3":"RW"}},{"permissionId":10,"dataSource":"AURORA_LOAD_AVERAGE","groups":{"3":"RW"}},{"permissionId":11,"dataSource":"STATS_RATE","groups":{"3":"RW"}},{"permissionId":12,"dataSource":"AURORA_DATASOURCES","groups":{"3":"RW"}},{"dataSource":"checklist.categories","groups":{"1":"RW"},"permissionId":13},{"dataSource":"checklist.categories","groups":{"3":"RW"},"permissionId":14},{"dataSource":"STATS_RATE","groups":{"1":"RW"},"permissionId":15},{"dataSource":"AURORA_UPTIME","groups":{"1":"RW"},"permissionId":16},{"dataSource":"AURORA_MEM_USAGE","groups":{"1":"RW"},"permissionId":17},{"permissionId":18,"dataSource":"AURORA_PERSISTENT_SESSIONS","groups":{"3":"RW"}}, {"permissionId":19,"dataSource":"CSR_ENTITY_TABLE","groups":{"3":"RW", "1":"RW"}}] > aurora.datapermissions.json

C:\OpenSSL-Win32\bin\openssl genrsa -out privatekey.pem 1024 
C:\OpenSSL-Win32\bin\openssl req -new -key privatekey.pem -out certrequest.csr 
C:\OpenSSL-Win32\bin\openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
cd ..

build.bat