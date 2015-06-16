call npm install mime
call npm install websocket
call npm install os-monitor
call npm install multiparty
call npm install slow-stream
call npm install jsmin2
call npm install node-jslint
call npm install jsdoc2
call npm install exec
call npm install openssl

call npm install closurecompiler

mkdir data

echo {"httpPort": 80,"sslPort": 443,"forceSSL": false, "theme":"aurora", "directoryBrowsing":true, "defaultPage":"home", "compile":true} > config.json
cd data
echo [{"userId":1,"firstname":"root","lastname":"user","emailaddress":"admin","username":"admin","password":"21232f297a57a5a743894a0e4a801fc3","groupId":3}] > aurora.users.json
echo [{"groupId":1,"description":"Public","locked":true},{"groupId":2,"description":"Members","locked":false},{"groupId":3,"description":"Administrators","locked":true}] > aurora.groups.json
echo [{"key":"aurora_5","pluginId":0,"channelId":5,"description":"Data Sources","plugin":"aurora","groups":{"3":"RW"}},{"key":"aurora_0","pluginId":0,"channelId":0,"description":"Channel Registration","plugin":"aurora","groups":{"1":"RW","2":"RW","3":"RW"}},{"key":"aurora_6","pluginId":0,"channelId":6,"description":"Data Sources Admin","plugin":"aurora","groups":{"3":"RW"}},{"key":"aurora_1","pluginId":0,"channelId":1,"description":"User Groups","plugin":"aurora","groups":{"3":"RW"}},{"key":"aurora_2","pluginId":0,"channelId":2,"description":"Users","plugin":"aurora","groups":{"3":"RW"}},{"key":"aurora_3","pluginId":0,"channelId":3,"description":"Aurora Sessions","plugin":"aurora","groups":{"3":"RW"}},{"key":"aurora_4","pluginId":0,"channelId":4,"description":"Data Permissions","plugin":"aurora","groups":{"3":"RW"}},{"key":"skeleton_2","pluginId":9,"channelId":2,"description":"Skeleton Time","plugin":"skeleton","groups":{"3":"R"}},{"key":"skeleton_0","pluginId":9,"channelId":0,"description":"Skeleton Timestamp","plugin":"skeleton","groups":{"3":"R"}},{"key":"skeleton_1","pluginId":9,"channelId":1,"description":"Skeleton Slider","plugin":"skeleton","groups":{"3":"R"}},{"key":"stats_2","pluginId":10,"channelId":2,"description":"Memory Usage","plugin":"stats","groups":{"2":"R","3":"R"}},{"key":"stats_0","pluginId":10,"channelId":0,"description":"Uptime","plugin":"stats","groups":{"2":"R","3":"R"}},{"key":"stats_1","pluginId":10,"channelId":1,"description":"Load Average","plugin":"stats","groups":{"2":"R","3":"R"}},{"key":"stats_3","pluginId":10,"channelId":3,"description":"Update Rate","plugin":"stats","groups":{"3":"RW"}}] > aurora.datapermissions.json

C:\OpenSSL-Win32\bin\openssl genrsa -out privatekey.pem 1024 
C:\OpenSSL-Win32\bin\openssl req -new -key privatekey.pem -out certrequest.csr 
C:\OpenSSL-Win32\bin\openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
cd ..

build.bat