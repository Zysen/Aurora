function createCertificate(attributes, extensions) {
    var keys = forge.pki.rsa.generateKeyPair(1024);
    var cert = forge.pki.createCertificate();
    // serial must be unique so use the time in seconds to generate it
    var serial = '0' + Math.round(new Date().getTime()/1000).toString(16); //zero in front of it so the first bit is not set i.e not negative it still should fit in 20 octets
    cert.publicKey = keys.publicKey;
    
    cert.serialNumber = serial.padStart(Math.ceil(serial.length/2)*2, '0'); // ensure even lenth
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
}

var fs = require('fs');
var path = require('path');

var config = JSON.parse(process.argv[2]);
var frameworkBuildDir = process.argv[4];
if (config.generateCertificates) {
	var forge = require('node-forge');
	config.generateCertificates.forEach(function(certGenReq) {
		if (certGenReq.keyPath && certGenReq.certificatePath && certGenReq.attributes && certGenReq.extensions) {
			fs.access(frameworkBuildDir + path.sep + 'resources' + path.sep + certGenReq.keyPath, fs.constants.R_OK | fs.constants.W_OK, (err1) => {
				fs.access(frameworkBuildDir + path.sep + 'resources' + path.sep + certGenReq.certificatePath, fs.constants.R_OK | fs.constants.W_OK, (err2) => {
					if (err1 || err2) {
						console.log('HTTP: Generating Certificate', certGenReq.keyPath, certGenReq.certificatePath);
						var pem = createCertificate(certGenReq.attributes, certGenReq.extensions);
						fs.writeFileSync(frameworkBuildDir + path.sep + 'resources' + path.sep + certGenReq.keyPath, pem.privateKey);
						fs.writeFileSync(frameworkBuildDir + path.sep + 'resources' + path.sep + certGenReq.certificatePath, pem.certificate);
					}
					else {
						console.log('HTTP: Certificates already exist. Skipping generation.');
					}
				});
			});
		}
	});	
}
