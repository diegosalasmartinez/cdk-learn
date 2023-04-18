const express = require('express');
const app = express();
const PORT = 80;

app.get('/', function (_req, res) {
  res.send('Hello World!');
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}!`));

// This causes the process to respond to "docker stop" faster
process.on('SIGTERM', function () {
  console.log('Received SIGTERM, shutting down');
  app.close();
});