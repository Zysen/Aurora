function createCertificate(attributes, extensions){
	var keys = forge.pki.rsa.generateKeyPair(1024);
	var cert = forge.pki.createCertificate();
	cert.publicKey = keys.publicKey;
	cert.serialNumber = '01';
	cert.validity.notBefore = new Date();
	cert.validity.notAfter = new Date();
	cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
	cert.setSubject(attributes);
	cert.setIssuer(attributes);
	cert.setExtensions(extensions);
	cert.sign(keys.privateKey, forge.md.sha256.create());
	return {
	  privateKey: forge.pki.privateKeyToPem(keys.privateKey),
	  publicKey: forge.pki.publicKeyToPem(keys.publicKey),
	  certificate: forge.pki.certificateToPem(cert)
	};
};

var fs = require("fs");
var path = require("path");
	
console.log("HTTP Build");

var config = JSON.parse(process.argv[2]);
var frameworkBuildDir = process.argv[3]+path.sep+process.argv[4];

if(config.generateCertificates){
	var forge = require('node-forge');
	config.generateCertificates.forEach(function(certGenReq){
		if(certGenReq.keyPath && certGenReq.certificatePath && certGenReq.attributes && certGenReq.extensions){
			console.log("Generating Certificate", certGenReq.keyPath, certGenReq.certificatePath);
			var pem = createCertificate(certGenReq.attributes, certGenReq.extensions);
			fs.writeFileSync(frameworkBuildDir+path.sep+"resources"+path.sep+certGenReq.keyPath, pem.privateKey);
			fs.writeFileSync(frameworkBuildDir+path.sep+"resources"+path.sep+certGenReq.certificatePath, pem.certificate);
		}
	});	
}