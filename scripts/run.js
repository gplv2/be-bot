// Description:
// Runs a command on hubot
// 
// Commands:
// hubot streets <postcode> [date] - runs a stats on hubot host
// hubot last  <imei> - runs a lastseen against the api

// showrec /var/lib/ev_data/all/2015/10/06/Event_357460035633564
// showstats /var/lib/ev_data/all/2015/10/06/Event_357460035633564

//var slackBot = require('slack-bot')('https://hooks.slack.com/services/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');
var request = require('request');
var slackBot = require('hubot-matrix');

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

var sdk = require("matrix-js-sdk");
// var client = sdk.createClient("https://matrix.org");

module.exports = function(robot) {
	robot.respond("/stats (.*)$/i", function(msg) {
		msg.send("ACK for effort: "+msg.match);
		//console.log(msg.envelope.message.rawMessage.channel);
		console.log(msg.match);

		var d = new Date();
		var cmd ="";

		// return true;
		if((msg.match[1]) && (msg.match[2])) {
			var str = msg.match[1] + ' ' + msg.match[2]
			var res = str.match(/stats streets|stats addresses/g);
		} else {
			msg.send("Not implemented, try `stats help me`");
			return false;
		}

		//if(msg.match[1]) {
			// cmd = "/home/glenn/fix_accounts.pl --help";
			var helptext="Use the following stuff works:\n";

			slackBot.send({
				text: 'Let me help you!',
				//channel: msg.envelope.message.rawMessage.channel,
				username: 'Nicolas Cage',
				icon_emoji: ':question:',
			}); 
			return false;
		//}
	});

	// robot.respond("/streets (.*)$/i", function(msg) 
        robot.respond("/streets ([0-9]+)(?: (.*))?$/i", function(msg) {
        	//robot.respond("/streets ([0-9]+)(?: (.*))$/i", function(msg) 
		//console.log(msg.envelope.message.rawMessage.channel);
		//console.log(msg);
		var d = new Date();
		var cmd ="";

		if(msg.match[1]) {
			// cmd = "showstats /var/lib/ev_data/all/"+ msg.match[3] + "/" + msg.match[4] + "/" + msg.match[5]+"/Event_" + msg.match[2];
			// cmd = "showstats /var/lib/ev_data/all/"+ pad(d.getYear(),2) + "/" + pad(d.getMonth(),2) + "/" + pad(d.getDay(),2) + "/Event_" + msg.match[1];
			// cmd = "echo asdfsafdsfd "+ pad(d.getYear()+1900,2) + "/" + pad(d.getMonth()+1,2) + "/" + pad(d.getDate(),2) + "/Event_" + msg.match[1];
			// cmd = "echo asdfsafdsfd "+ pad(d.getYear()+1900,2) + "/" + pad(d.getMonth()+1,2) + "/" + pad(d.getDate(),2) + "/Event_" + msg.match[1];
			var url='';
			if(msg.match[2]) {
				cmd = "searching for streets in postcode " +  msg.match[1] + " matching string: " + msg.match[2];
				url = "http://grbtiles.byteless.net/streets/?limit=10&postcode=" + msg.match[1] + "&search=" + msg.match[2];
			} else {
				cmd = "searching for streets in postcode " +  msg.match[1];
				url = "http://grbtiles.byteless.net/streets/?limit=10&postcode=" + msg.match[1];
			}
			// msg.reply("Searching for streets in postcode `" +  msg.match[1] + "`");
			// http://grbtiles.byteless.net/streets/?postcode=1982msg.match[1] 

			//msg.send(JSON.stringify(url));
			//client.setPresence("online");
			//robot.matrixClient.client.setPresence("online");

			request({
				url: url,
				json: true
			},function(error,response,body){
				if (!error && response.statusCode === 200) {
					console.log(body); // Print the json response
					//var sdk = require("matrix-js-sdk");
					//var client = sdk.createClient("https://matrix.org");
					msg.send(JSON.stringify(cmd));
					var obj = body;

					var reply = "";

					Object.keys(obj).forEach(function(key, idx) {
						//console.log(key + ": " + obj[key]);
						reply=reply + obj[key]['sname'] + " (" + obj[key]['dataurl'] + ' )\n';
					});

					msg.reply(reply);

/*
					slackBot.send({
						//text: 'Put the bunny back in the box.',
						text: '\"I\'m Castor Troy!\" - Face/Off (1997)',
						//channel: msg.envelope.message.rawMessage.channel,
						username: 'Nicolas Cage',
						icon_emoji: ':facepunch:',
						attachments: [
							{
								"fallback": "Results of " + cmd,

								"color": "#36a64f",

								"pretext": "You requested streets ..",

								"author_name": msg.match[1],
								"author_link": "http://flickr.com/bobby/",
								"author_icon": "http://flickr.com/icons/bobby.jpg",

								"title": "OSM search " + msg.match[1],
								"title_link": "https://trac.synctrace.com/frontend/search?q=" + msg.match[1],

								"text": '```'+body+'```',

								"mrkdwn_in": ["text", "pretext"],

								"fields": [
									{
										"title": "Priority",
										"value": "High",
										"short": false
									}
								]
								//,
								//"image_url": "http://my-website.com/path/to/image.jpg",
								//"thumb_url": "http://example.com/path/to/thumb.png"
							}
						]
						// OR 
						//icon_url: 'http://www.internetmonk.com/wp-content/uploads/53513.gif'
					}); 
					*/
				} else {
					msg.send(error);
					msg.send(body);
					console.log(error);
				}
			});
		} else {
			cmd = "No luck searching for streets in postcode " +  msg.match[1];
			msg.reply(cmd);
		}
	}); // robot respond
	// SPLIT
	/*
    var pattern = /acl ([a-z]+) ([a-z]+)(?: (.*)$)$/i
	var result = pattern.test("acl een twee drie");
	console.log(result);
	//  var pattern = /acl ([a-z]+) ([a-z]+)$/i
    robot.respond("/acl ([a-z]+) ([a-z]+)(?: (.*)$/i", function(msg) {
    var pattern = /acl ([a-z]+) ([a-z]+)(?:(.*))$/i;
	var result = pattern.test("acl een twee drie");
	console.log(result);
	console.log(msg.match);
    });
    */

};
