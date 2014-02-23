npm install mime
npm install websocket
npm install websockets
npm install os-monitor

npm install jsmin2
npm install node-jslint
npm install jsdoc2
npm install exec
npm install openssl

mkdir data

echo -e "{\n\"httpPort\": 80,\n\"sslPort\": 443,\n\"forceSSL\": false\n, \"theme\":\"aurora\", \"directoryBrowsing\":true, \"defaultPage\":\"home\"}" > config.json
echo -e "[{\"permissionId\":1,\"dataSource\":\"AURORA_USERS\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":2,\"dataSource\":\"AURORA_GROUPS\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":3,\"dataSource\":\"AURORA_DATASOURCESADMIN\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":4,\"dataSource\":\"AURORA_DATAPERMISSIONS\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":5,\"dataSource\":\"AURORA_ACTIVE_USERS\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":6,\"dataSource\":\"AURORA_PAGES\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":7,\"dataSource\":\"AURORA_SETTINGS\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":8,\"dataSource\":\"AURORA_MEM_USAGE\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":9,\"dataSource\":\"AURORA_UPTIME\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":10,\"dataSource\":\"AURORA_LOAD_AVERAGE\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":11,\"dataSource\":\"STATS_RATE\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"permissionId\":12,\"dataSource\":\"AURORA_DATASOURCES\",\"groupId\":3,\"userId\":\"\",\"access\":\"RW\"},{\"dataSource\":\"checklist.categories\",\"groupId\":\"1\",\"userId\":\"\",\"access\":\"R\",\"permissionId\":13},{\"dataSource\":\"checklist.categories\",\"groupId\":\"3\",\"userId\":\"\",\"access\":\"RW\",\"permissionId\":14},{\"dataSource\":\"STATS_RATE\",\"groupId\":\"1\",\"userId\":\"\",\"access\":\"R\",\"permissionId\":15},{\"dataSource\":\"AURORA_UPTIME\",\"groupId\":\"1\",\"userId\":\"\",\"access\":\"R\",\"permissionId\":16},{\"dataSource\":\"AURORA_MEM_USAGE\",\"groupId\":\"1\",\"userId\":\"\",\"access\":\"R\",\"permissionId\":17}]" > data/aurora.datapermissions.json
echo -e "[{\"userId\":1,\"firstname\":\"root\",\"lastname\":\"user\",\"emailaddress\":\"root\",\"username\":\"root\",\"password\":\"0192023a7bbd73250516f069df18b500\",\"groupId\":3}]" > data/aurora.users.json
echo -e "[{\"groupId\":1,\"description\":\"Public\",\"locked\":true},{\"groupId\":2,\"description\":\"Members\",\"locked\":false},{\"groupId\":3,\"description\":\"Administrators\",\"locked\":true}]" > data/aurora.groups.json

cd data
openssl genrsa -out privatekey.pem 1024 
openssl req -new -key privatekey.pem -out certrequest.csr 
openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
cd ..

build.bat