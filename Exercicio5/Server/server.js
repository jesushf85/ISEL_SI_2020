var fs = require('fs');
var https = require('https');

var options = {
  key: fs.readFileSync('./cert/secure-server.pem'),
  cert: fs.readFileSync('./cert/secure-server-cert.pem'),
  ca: fs.readFileSync('./cert/CA1.pem'),
  requestCert: true,
  rejectUnauthorized: true
};

https.createServer(options, function (req, res) {
  var peerCert = req.socket.getPeerCertificate().subject !== undefined ? req.socket.getPeerCertificate().subject.CN : "# No Peer Certificate #";

  console.log(new Date() + ' ' +
    req.connection.remoteAddress + ' ' +
    peerCert + ' ' +
    req.method + ' ' + req.url);
  res.writeHead(200);
  res.end("Secure Hello World with node.js\n");
}).listen(4433);

console.log('Listening @4433');