// Hubot V1 by Glenn Plas for OSM.BE
//
// Commands:
// hubot streets <postcode> [partialstring] - searches for streetlist in postcode
// hubot stats  <postcode> - 


//var slackBot = require('slack-bot')('https://hooks.slack.com/services/TT0ANGLKK8/TB0ANVAUH3/SAMsIzvHkcwyzbVEIf6B2aey');

var request = require('request');
var slackBot = require('hubot-matrix');
// So we can calculate things from source API's
var geolib = require('geolib');

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}


// var sdk = require("matrix-js-sdk");
// var client = sdk.createClient("https://matrix.org");

module.exports = function(robot) {
    console.log(robot);
    robot.respond("/streetmap ([0-9]+)(?: (.*))?$/i", function(msg) {
        // Call static map generator http://staticmap.openstreetmap.de/staticmap.php?center=43.714728,5.998672&zoom=14&size=865x512&maptype=mapnik
        // markers=40.702147,-74.015794,lightblue1|40.711614,-74.012318,lightblue2|40.718217,-73.998284,lightblue3
        // maptype=cycle
        //
        //msg.send("ACK for effort: "+msg.match);
        //console.log(msg.envelope.message.rawMessage.channel);
        //console.log(msg.match);

        var cmd ="";
        var d = new Date();
        var maptype="mapnik";

        var searchstring="";
        if(msg.match[2]) {
            var myString = msg.match[2]
            var splits = myString.split(' ', 2);
            if(splits[1]=="cycle") {
                maptype="cycle";
                searchstring=splits[0];
            } else if(splits[1]=="mapnik") {
                maptype="mapnik";
                searchstring=splits[0];
            } else {
                searchstring=myString;
            }
        }

        // return true;
        if(msg.match[1]) {
            if(msg.match[2]) {
                url = "http://grbtiles.byteless.net/streets/?limit=10&postcode=" + msg.match[1] + "&meta=map&search=" + searchstring;
            } else {
                url = "http://grbtiles.byteless.net/streets/?limit=10&postcode=" + msg.match[1] + "&meta=map";
            }

            request({
                url: url,
                json: true
            },function(error,response,body){
                if (!error && response.statusCode === 200) {
                    //console.log(body); // Print the json response
                    //var sdk = require("matrix-js-sdk");
                    //var client = sdk.createClient("https://matrix.org");
                    var obj = body;
                    console.log(obj);

                    if (obj.error) {
                        msg.reply("API reply: " +obj.error);
                        return false;
                    }

                    /*
                    var reply = "\n" + msg.match[1] + " street count: ";

                    Object.keys(obj).forEach(function(key, idx) {
                    //console.log(key + ": " + obj[key]);
                        reply=reply + obj[key]['street_total'] + '\n';
                    });
                    */
                    // http://staticmap.openstreetmap.de/staticmap.php?center=43.714728,5.998672&zoom=14&size=865x512&maptype=mapnik
                    // Calculate the center of both values
                    if (obj.b && obj.t && obj.r && obj.l ) {
                        cmd = "building static map from " + obj.name + " for postcode " +  msg.match[1];
                        msg.send(cmd);

                        var center =geolib.getCenterOfBounds([
                            {latitude: obj.b, longitude: obj.l},
                            {latitude: obj.t, longitude: obj.r},
                        ]);
                        //  {"latitude": centerLat, "longitude": centerLng}
                        var smap = "http://staticmap.openstreetmap.de/staticmap.php?center="+ center.latitude + "," + center.longitude + "&zoom=17&size=1865x1512&maptype=" + maptype;

                        msg.reply(smap);
                    } else {
                        cmd = "Whoops! CRAB street object source has undefined coordinates!" + JSON.stringify(error);
                        msg.reply(cmd);
                    }
                } else {
                    cmd = "Whoops! Houston, we have a problem: " + JSON.stringify(error);
                    msg.reply(cmd);
                }
            });

            return false;
        }
    });

    robot.respond("/stats ([0-9]+)$/i", function(msg) {
        //msg.send("ACK for effort: "+msg.match);
        //console.log(msg.envelope.message.rawMessage.channel);
        //console.log(msg.match);

        var d = new Date();
        var cmd ="";

        // return true;
        if(msg.match[1]) {
            cmd = "Counting streets in postcode " +  msg.match[1];
            url = "http://grbtiles.byteless.net/streets/?limit=10&postcode=" + msg.match[1] + "&stats=true";

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

                    var reply = "\n" + msg.match[1] + " street count: ";

                    Object.keys(obj).forEach(function(key, idx) {
                        //console.log(key + ": " + obj[key]);
                        reply=reply + obj[key]['street_total'] + '\n';
                    });

                    msg.reply(reply);
                }
            });

            return false;
        }
    });

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

                    var reply = "\n";

                    Object.keys(obj).forEach(function(key, idx) {
                        //console.log(key + ": " + obj[key]);
                        reply=reply + obj[key]['sname'] + ' ( ' + obj[key]['dataurl'] + ' )\n';
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
