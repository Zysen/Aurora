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

mkdir data

echo -e "{\n\"httpPort\": 80,\n\"sslPort\": 443,\n\"forceSSL\": false\n, \"theme\":\"aurora\", \"directoryBrowsing\":true, \"defaultPage\":\"home\",\"compile\":true}" > config.json
echo -e "[{\"permissionId\":1,\"dataSource\":\"AURORA_USERS\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":2,\"dataSource\":\"AURORA_GROUPS\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":3,\"dataSource\":\"AURORA_DATASOURCESADMIN\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":4,\"dataSource\":\"AURORA_DATAPERMISSIONS\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":5,\"dataSource\":\"AURORA_ACTIVE_USERS\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":6,\"dataSource\":\"AURORA_PAGES\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":7,\"dataSource\":\"AURORA_SETTINGS\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":8,\"dataSource\":\"AURORA_MEM_USAGE\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":9,\"dataSource\":\"AURORA_UPTIME\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":10,\"dataSource\":\"AURORA_LOAD_AVERAGE\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":11,\"dataSource\":\"STATS_RATE\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":12,\"dataSource\":\"AURORA_DATASOURCES\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"dataSource\":\"checklist.categories\",\"groupId\":\"1\",\"userId\":\"\",\"access\":\"R\",\"permissionId\":13},{\"dataSource\":\"checklist.categories\",\"groupId\":\"3\",\"userId\":\"\",\"access\":\"RW\",\"permissionId\":14},{\"dataSource\":\"STATS_RATE\",\"groupId\":\"1\",\"userId\":\"\",\"access\":\"R\",\"permissionId\":15},{\"dataSource\":\"AURORA_UPTIME\",\"groupId\":\"1\",\"userId\":\"\",\"access\":\"R\",\"permissionId\":16},{\"dataSource\":\"AURORA_MEM_USAGE\",\"groupId\":\"1\",\"userId\":\"\",\"access\":\"R\",\"permissionId\":17}]" > data/aurora.datapermissions.json
echo -e "[{\"userId\":1,\"firstname\":\"admin\",\"lastname\":\"user\",\"emailaddress\":\"admin\",\"username\":\"admin\",\"password\":\"21232f297a57a5a743894a0e4a801fc3\",\"groupId\":3}]" > data/aurora.users.json
echo -e "[{\"groupId\":1,\"description\":\"Public\",\"locked\":true},{\"groupId\":2,\"description\":\"Members\",\"locked\":false},{\"groupId\":3,\"description\":\"Administrators\",\"locked\":true}]" > data/aurora.groups.json
echo -e "[{\"permissionId\":1,\"dataSource\":\"AURORA_USERS\",\"groups\":{\"3\":\"RW\"}},{\"permissionId\":2,\"dataSource\":\"AURORA_GROUPS\",\"groups\":{\"3\":\"RW\"}},{\"permissionId\":3,\"dataSource\":\"AURORA_DATASOURCESADMIN\",\"groups\":{\"3\":\"RW\"}},{\"permissionId\":4,\"dataSource\":\"AURORA_DATAPERMISSIONS\",\"groups\":{\"3\":\"RW\"}},{\"permissionId\":5,\"dataSource\":\"AURORA_ACTIVE_USERS\",\"groups\":{\"3\":\"RW\"}},{\"permissionId\":6,\"dataSource\":\"AURORA_PAGES\",\"groups\":{\"1\":\"R\",\"3\":\"RW\"}},{\"permissionId\":7,\"dataSource\":\"AURORA_SETTINGS\",\"groups\":{\"3\":\"RW\"}},{\"permissionId\":8,\"dataSource\":\"AURORA_MEM_USAGE\",\"groups\":{\"3\":\"RW\"}},{\"permissionId\":9,\"dataSource\":\"AURORA_UPTIME\",\"groups\":{\"3\":\"RW\"}},{\"permissionId\":10,\"dataSource\":\"AURORA_LOAD_AVERAGE\",\"groups\":{\"3\":\"RW\"}},{\"permissionId\":11,\"dataSource\":\"STATS_RATE\",\"groups\":{\"3\":\"RW\"}},{\"permissionId\":12,\"dataSource\":\"AURORA_DATASOURCES\",\"groups\":{\"3\":\"RW\"}},{\"dataSource\":\"checklist.categories\",\"groups\":{\"1\":\"RW\"},\"permissionId\":13},{\"dataSource\":\"checklist.categories\",\"groups\":{\"3\":\"RW\"},\"permissionId\":14},{\"dataSource\":\"STATS_RATE\",\"groups\":{\"1\":\"RW\"},\"permissionId\":15},{\"dataSource\":\"AURORA_UPTIME\",\"groups\":{\"1\":\"RW\"},\"permissionId\":16},{\"dataSource\":\"AURORA_MEM_USAGE\",\"groups\":{\"1\":\"RW\"},\"permissionId\":17},{\"permissionId\":18,\"dataSource\":\"AURORA_PERSISTENT_SESSIONS\",\"groups\":{\"3\":\"RW\"}}, {\"permissionId\":19,\"dataSource\":\"CSR_ENTITY_TABLE\",\"groups\":{\"3\":\"RW\", \"1\":\"RW\"}}]" > aurora.datapermissions.json

cd data
openssl genrsa -out privatekey.pem 1024 
openssl req -new -key privatekey.pem -out certrequest.csr 
openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
cd ..

build.sh