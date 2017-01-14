const http = require('http');
const fs = require('fs');
const { graphql, buildSchema } = require('graphql');

const PORT = 8000;
const settings = { colors: true, depth: null };

const readFile = file => new Promise((resolve, reject) =>
  fs.readFile(file, 'utf8', (err, data) =>
    (err) ? reject(err) : resolve(data)));

const getBody = req => new Promise((resolve, reject) => {
  let body = "";
  req.on('data', chunk => body += chunk);
  req.on('end', () => resolve(body));
});

const post = (req, res) => getBody(req).then(raw => {
  const payload = JSON.parse(raw);
  const requestString = payload[Object.keys(payload)[0]];
  const root = {
    hello: () => 'Hello world!',
    bye: () => '10'
  };
  return readFile('./schema.graphql')
    .then(file => buildSchema(file))
    .then(schema => graphql(schema, requestString, root))
    .then(body => ({ body: JSON.stringify(body) }));
});

const get = (req, res) => readFile('./index.html').then(body => ({
  body,
  headers: { 'Content-Type': 'text/html; charset=utf-8' },
}));

const routes = {
  '/graphql': { get, post },
  '#': () => Promise.resolve({ statusCode: 404, body: 'Not Found' })
};

const handler = (req, res) => {
  const { method, url } = req;
  const defaults = {
    body: '',
    headers: { 'Content-Type': 'text/plain' },
    statusCode: 200
  };
  const route = (routes[url]) ? routes[url][method.toLowerCase()] : routes['#'];
  route(req, res).then(data => {
    const { body, headers, statusCode } = Object.assign(defaults, data);
    res.writeHead(statusCode, headers);
    res.write(body);
    res.end();
  });
};

const server = http.createServer(handler);

server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT, () => {
  console.log('Server listening on: %s', PORT);
});
