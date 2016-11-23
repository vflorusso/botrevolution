var builder = require('botbuilder');
var restify = require('restify');

var connector = new builder.ChatConnector();
var bot = new builder.UniversalBot(connector);

bot.dialog('/', [
    function(session) {
        session.send('Hello World');
    },
]);

/* LISTEN IN THE CHAT CONNECTOR */
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
server.post('/api/messages', connector.listen());