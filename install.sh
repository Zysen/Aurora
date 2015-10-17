#!/bin/bash
npm install mime
npm install websocket
npm install os-monitor
npm install multiparty
npm install slow-stream
npm install jsmin2
npm install node-jslint
npm install jsdoc2
npm install exec
npm install openssl
npm install closurecompiler
npm install mysql

mkdir data

echo -e "{\n\t\"httpPort\": 80,\n\t\"sslPort\": 443,\n\t\"forceSSL\": false\n\t,\"theme\":\"aurora\",\n\t\"directoryBrowsing\":true,\n\t\"defaultPage\":\"home\",\n\t\"compile\":true,\n\t\"ignorePlugins\":[\n\t\t\"skeleton\"\n\t]\n\t}" > config.json
echo -e "[{\"userId\":1,\"firstname\":\"admin\",\"lastname\":\"user\",\"emailaddress\":\"admin\",\"username\":\"admin\",\"password\":\"21232f297a57a5a743894a0e4a801fc3\",\"groupId\":3}]" > data/aurora.users.json
echo -e "[{\"groupId\":1,\"description\":\"Public\",\"locked\":true},{\"groupId\":2,\"description\":\"Members\",\"locked\":false},{\"groupId\":3,\"description\":\"Administrators\",\"locked\":true}]" > data/aurora.groups.json
echo -e "[{\"key\":\"aurora_5\",\"channelId\":5,\"description\":\"Data Sources\",\"plugin\":\"aurora\",\"groups\":{\"3\":\"RW\"}},{\"key\":\"aurora_0\",\"channelId\":0,\"description\":\"Channel Registration\",\"plugin\":\"aurora\",\"groups\":{\"1\":\"RW\",\"2\":\"RW\",\"3\":\"RW\"}},{\"key\":\"aurora_6\",\"channelId\":6,\"description\":\"Data Sources Admin\",\"plugin\":\"aurora\",\"groups\":{\"3\":\"RW\"}},{\"key\":\"aurora_1\",\"channelId\":1,\"description\":\"User Groups\",\"plugin\":\"aurora\",\"groups\":{\"3\":\"RW\"}},{\"key\":\"aurora_2\",\"channelId\":2,\"description\":\"Users\",\"plugin\":\"aurora\",\"groups\":{\"3\":\"RW\"}},{\"key\":\"aurora_3\",\"channelId\":3,\"description\":\"Aurora Sessions\",\"plugin\":\"aurora\",\"groups\":{\"3\":\"RW\"}},{\"key\":\"aurora_4\",\"channelId\":4,\"description\":\"Data Permissions\",\"plugin\":\"aurora\",\"groups\":{\"3\":\"RW\"}},{\"key\":\"skeleton_2\",\"channelId\":2,\"description\":\"Skeleton Time\",\"plugin\":\"skeleton\",\"groups\":{\"3\":\"R\"}},{\"key\":\"skeleton_0\",\"channelId\":0,\"description\":\"Skeleton Timestamp\",\"plugin\":\"skeleton\",\"groups\":{\"3\":\"R\"}},{\"key\":\"skeleton_1\",\"channelId\":1,\"description\":\"Skeleton Slider\",\"plugin\":\"skeleton\",\"groups\":{\"3\":\"R\"}},{\"key\":\"stats_2\",\"channelId\":2,\"description\":\"Memory Usage\",\"plugin\":\"stats\",\"groups\":{\"2\":\"R\",\"3\":\"R\"}},{\"key\":\"stats_0\",\"channelId\":0,\"description\":\"Uptime\",\"plugin\":\"stats\",\"groups\":{\"2\":\"R\",\"3\":\"R\"}},{\"key\":\"stats_1\",\"channelId\":1,\"description\":\"Load Average\",\"plugin\":\"stats\",\"groups\":{\"2\":\"R\",\"3\":\"R\"}},{\"key\":\"stats_3\",\"channelId\":3,\"description\":\"Update Rate\",\"plugin\":\"stats\",\"groups\":{\"3\":\"RW\"}}]" > data/aurora.datapermissions.json

cd data
openssl genrsa -out privatekey.pem 1024 
openssl req -new -key privatekey.pem -out certrequest.csr 
openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
cd ..

chmod 770 build.sh
./build.sh