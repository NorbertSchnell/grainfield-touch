# Grainfield

Version of the [GrainField participative performance](https://github.com/ircam-cosima/grainfield) that uses touch instead of device orientation.

### To install the application (requires node.js and optionally git):

- check out the repository using git or download and unzip the code
- open a shell/terminal and change the current directory to the downloaded (unzipped) project directory
- run `npm install`

### To run the application:

- execute `npm run watch` in the project directory in an open shell/terminal
- start the controller client, open the URL <server address>:<port>/controller in your browser (by default `http://localhost:8000/controller`)
- start the recorder client, open the URL <server address>:<port>/recorder in your browser (by default `http://localhost:8000/controller`)
- start player clients, open the URL <server address>:<port> in your browser (the port used by default is 8000)

In the simplest case the recorder client should run on the same computer as the Node.js server, to avoid the necessity of using a certificate.

The application is based on the Soundworks framework.

### Manual update of soundworks

Due to the latest changes, the soundworks framework needs a manual update. To perform this, switch to the soundworks folder with
`cd node_modules/soundworks` and run `npm install && npm run transpile` - now you're ready to go.
