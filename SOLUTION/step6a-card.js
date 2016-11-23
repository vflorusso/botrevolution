require('dotenv-extended').load();
var builder      = require('botbuilder');
var restify      = require('restify');
var githubClient = require('./github-client.js');
var connector    = new builder.ChatConnector({appId: process.env.MICROSOFT_APP_ID, appPassword: process.env.MICROSOFT_APP_PASSWORD});
var bot          = new builder.UniversalBot(connector);
var intents      = new builder.IntentDialog();

bot.dialog('/', intents);

intents.matches(/^search/i, [
    function (session, args, next) {
        if (session.message.text.toLowerCase() == 'search') {
            builder.Prompts.text(session, 'Who are you looking for?');
        } else {
            var query = session.message.text.substring(7);
            next({ response: query });
        }
    },
    function (session, result, next) {
        var query = result.response;
        if (!query) {
            session.endDialog('Request cancelled');
        } else {
            githubClient.executeSearch(query, function (profiles) {
                var totalCount = profiles.total_count;
                if (totalCount == 0) {
                    session.endDialog('Sorry, no results found.');
                } else if (totalCount > 10) {
                    session.endDialog('More than 10 results were found. Please provide a more restrictive query.');
                } else {
                    session.dialogData.property = null;
                    var usernames = profiles.items.map(function (item) { return item.login });    
                    builder.Prompts.choice(session, 'What user do you want to load?', usernames);
                }
            });
        }
    }, function (session, result, next) {
        var username = result.response.entity;
        githubClient.loadProfile(username, function (profile) {
            var card = new builder.ThumbnailCard(session);

            card.title(profile.login);

            card.images([builder.CardImage.create(session, profile.avatar_url)]);

            if (profile.name) card.subtitle(profile.name);

            var text = '';
            if (profile.company) text += profile.company + ' \n';
            if (profile.email)   text += profile.email + ' \n';
            if (profile.bio)     text += profile.bio;
            card.text(text);

            card.tap(new builder.CardAction.openUrl(session, profile.html_url));
            
            var message = new builder.Message(session).attachments([card]);
            session.send(message);
        });
    }
]).onDefault([
        function (session, results, next) {
            builder.Prompts.text(session, 'Hi, type "search <someone>" to start.');
            next();
        }
]);

/* LISTEN IN THE CHAT CONNECTOR */
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
server.post('/api/messages', connector.listen());