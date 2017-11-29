// Commands:
// hubot (changes|hotshots)|motd - shows the active mappers of the moment with number of changesets (about 1 to 2 days data) - motd : mapper of the day, hands you the top 3
// hubot (events|calendar) - shows the meetup event page link and (hardcoded) upcoming events (API implementation pending)
// hubot changeset <number> - shows links on the changeset to analyse it ( ahavi, osmhv, osm , ...)
// hubot streets <postcode> [partialstring] - searches for streetlist in postcode
// hubot streetmap <postcode> [partialstring] [cycle|mapnik] - creates a static image given by the bounds of the street we search
// hubot stats <postcode> - Shows you a count for the number of streets in that postal code
// hubot who is <username/name/osmname> - I will tell you what I know about this person with twist
// hubot what is crab|grb - When you want to know about crab/grb and receive some links
// hubot wtf <search term> - search for <search term> via DuckDuckGo Instant Search
// hubot duck me <search term> - search for <search term> via DuckDuckGo Instant Search
//
// Author:
// Glenn Plas for OSM.BE

// var slackBot = require('slack-bot')('https://hooks.slack.com/services/TT0ANGLKK8/TB0ANVAUH3/SAMsIzvHkcwyzbVEIf6B2aey');
// var sdk = require("matrix-js-sdk");
// var client = sdk.createClient("https://matrix.org");

// hubot lost - When you are lost and want to find the way

var config, parseConfig;

parseConfig = require('hubot-config');

config = parseConfig('hello', {
    message: 'world',
    friendlyMessage: null
});


//console.log(parseConfig);
//process.exit(1);

var request = require('request');
var rp = require('request-promise');

var slackBot = require('hubot-matrix');
// So we can calculate things from source API's
var geolib = require('geolib');
var parseString = require('xml2js').parseString;

// const util = require('util');
// alternative shortcut
// console.log(util.inspect(myObject, false, null))

var Memcached = require('memcached');
var memcached = new Memcached('127.0.0.1:11211');

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

String.prototype.lpad = function(padString, length) {
    var str = this;
    while (str.length < length)
        str = padString + str;
    return str;
}


function getcache() {
    return mpromise = new Promise(function(resolve, reject) {
        memcached.get( "changesets", function( err, result ){
            if(err) {
                console.log( err );
                reject(Error(err)); 
            } else {
                if(typeof result =='object' && result) {
                    //console.log(result);
                    console.log("Loading data from cache");
                    //msg.send('Loaded changeset data from memcache');
                    resolve(result);
                    //} else {
                    //reject(Error('No hit')); 
                } else {
                    reject(Error(err));
                }
                //msg.reply("OK");
            }
        });
    });
}

//process.exit(1);
//


module.exports = function(robot) {
    //console.log(robot);
    robot.respond(/(wtf|duck me) (.*)/i, function(msg) {

        var getDefinition = function(msg, query) {
            return msg.http("http://api.duckduckgo.com/?q=" + query + "&format=json&t=hubotscript").get()(function(err, res, body) {
                var i, len, r, ref, response, results;
                //console.log(body);
                results = JSON.parse(body);
                switch (results.Type) {
                    case "D":
                        response = "That could mean a few things...\n";
                        ref = results.RelatedTopics;
                        for (i = 0, len = ref.length; i < len; i++) {
                            r = ref[i];
                            if (r.Result) {
                                response += r.Text + " " + r.FirstURL + "\n";
                            }
                        }
                        break;
                    case "C":
                        response = "That's a pretty broad topic. Try this website " + results.AbstractURL;
                        break;
                    case "A":
                        response = results.Image + "\n";
                        response += results.AbstractText + "\n";
                        response += "More: " + results.AbstractURL + "\n";
                        response += "[taken from " + results.AbstractSource + " via DuckDuckGo API]";
                        break;
                    default:
                        response = "Sorry. I have no idea what you mean. Try Uncle Google (http://www.google.com/#q=" + query + ")";
                }
                msg.send(response);
            });
        };

        msg.reply(getDefinition(msg, msg.match[2]));
    });

    robot.respond(/hello/, function(msg) {
        console.log("hello");
        msg.reply(config.message);
    });
    robot.respond(/hi/, function(msg) {
        console.log("ho");
        msg.reply(config.friendlyMessage);
    });

    robot.respond(/who is @?([\w .\-]+)\?*$/i, function(msg) {
        name = msg.match[1].trim();
        //users = robot.brain.usersForFuzzyName(name);
        var reply="";
        switch(name) {
            case 'escada':
                reply="Indian name : He who walks with dogs: The Dogwalker, Mapper name: MicroMapper Inc.";
                break;
            case 'glenn':
                reply="Indian name : Overpass boy: The Overpasswhisperer, Mapper name: Tha Validator.";
                break;
            case 'joost':
                reply="Indian name : The OSM planner:  BoardRunner, Mapper name: JOSM what/who?";
                break;
            case 'lodde1949':
                reply="Indian name : He who maps 24/7: The Mapinator, Mapper name: The-mapper-that-never-sleeps";
                break;
            case 'jonathan':
                reply="Indian name : A rising osm.Be-Star: Legoboy,  Mapper name: The tiler. https://github.com/jbelien";
                break;
            case 'xivk':
                reply="Indian name : Dances with OSM: Chief OSMBE,  Mapper name: The Boss Router. https://github.com/xivk";
                break;
            case 'bebot':
                reply="(that's me !!) Indian name : Lord of the Rooms,  Mapper name: He-who-doesnt-map-at-all,  I like to sleep here: https://github.com/gplv2/be-bot";
                break;
            case 'giphy':
                reply="Giphy is that 'other bot', communicates solely with moving pics, a bit like transformers' bumblebee only speaks with recorded sounds.  he's a simple bot, I'm complex!";
                break;
            default:
                reply="Sorry, " + name + " is way too cool to comment on!";
        }

        msg.reply(reply);
    });

    robot.respond(/what is @?([\w .\-]+)\?*$/i, function(msg) {
        name = msg.match[1].trim().toLowerCase();
        //users = robot.brain.usersForFuzzyName(name);
        var reply="";
        switch(name) {
            case 'crab':
                reply=reply+"\nCentraal Referentieadressenbestand (CRAB)\n";
                reply=reply+"https://overheid.vlaanderen.be/producten-diensten/centraal-referentieadressenbestand-crab";
                reply=reply+"\nOSM information on importing crab:\n";
                reply=reply+"https://wiki.openstreetmap.org/wiki/AGIV_CRAB_Import";
                reply=reply+"\nhttps://wiki.openstreetmap.org/wiki/WikiProject_Belgium/Using_AGIV_Crab_data";
                reply=reply+"\nhttp://crab-import.osm.be";
                reply=reply+"\nCRAB data can be merged into OSM using the specific tool.  Please read the wiki first, then the instructions second.\n";
                break;
            case 'grb':
                reply=reply+"\nGrootschalig ReferentieBestand (GRB)\n";
                reply=reply+"\nhttps://overheid.vlaanderen.be/producten-diensten/basiskaart-vlaanderen-grb";
                reply=reply+"\nhttps://wiki.openstreetmap.org/wiki/WikiProject_Belgium/GRB";
                reply=reply+"\nhttps://wiki.openstreetmap.org/wiki/GRBimport";
                reply=reply+"\nGRB data merge is pending the completion of the toolsets and the import case we are setting up.\n";
                break;
            case 'belgium':
                reply="\nhttps://wiki.openstreetmap.org/wiki/WikiProject_Belgium\n";
                reply="Belgian bounding box is: 2.52, 50.64, 5.94, 51.51";
                reply="\nOur talk-be mailing list is here:\n";
                reply="https://lists.openstreetmap.org/listinfo/talk-be";
                break;
            default:
                reply="Sorry, I don't know anything decent to say about " + name + ". ";
        }

        msg.reply(reply);
    });

    robot.respond(/(events|calendar)$/i, function(msg) {
        var reply="OSM Event calendar\n";

        function parseEventOutput(calendar_json,msg) {
            console.log("processing retrieval ...");
            //console.dir(calendar_json);

            if(typeof calendar_json == 'object' && calendar_json !== null) {
                console.log("Is object");

                var uarray = {};
                // var sodasHad = robot.brain.get('totalSodas') * 1 || 0;

                Object.keys(calendar_json).forEach(function(key, idx) {
                    // console.dir(calendar_json[key], { depth: null });
                    // title = title: [ { _: 'Missing Maps Mapathon at IPIS', '$': { type: 'html' } } ]
                    var title = calendar_json[key]['title'][0]['_'];
                    /*
                     *
                     *   published: [ '2017-12-06T00:00:00+00:00' ],
                     *     updated: [ '2017-12-06T00:00:00+00:00' ],
                     *       id: [ 'http://maptime.io/belgium/event/2017/12/06/missing-maps-mapathon-ipis' ]
                     */

                    var event_date = calendar_json[key]['published'][0];
                    var id = calendar_json[key]['id'][0];
                    var eventDate = new Date(event_date);
                    var today = new Date();
                    var dateoptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    // Set them both at zero time so we don't miss out on todays events
                    eventDate.setHours(0,0,0,0);
                    today.setHours(0,0,0,0);

                    var difference = eventDate - today;

                    console.log(difference);
                    if (difference>=0) {
                        reply+= eventDate.toLocaleDateString("en-US",dateoptions) + " - " + title + '\n' + id + '\n';
                    }
                });
                msg.reply(reply); 
                // msg.send("This list is no indication of quality. It's meant to be used along with `changeset` bot command to review changesets"); 
            } else {
                console.log("NO JSON HERE");
            }
            console.log("END");
        }

        // Get Belgian Calendar
        var url = "http://maptime.io/belgium/feed.xml";

        var options = {
            uri: url,
            /*
            qs: {
                access_token: '12434asfdsdfw3' // -> uri + '?access_token=xxxxx%20xxxxx'
            },
            */
            headers: {
                'User-Agent': 'Request-Promise [memcached] - BEBOT osmbe bot https://riot.im/app/?#/room/#osmbe:matrix.org'
            },
            json: false // if true: Automatically parses the JSON string in the response
        };

        rp(options).then(function (repos) {
            console.log('%d length response', repos.length);
            parseString(repos, function (err, mresult) {
                console.log("Parsing results");
                //console.dir(mresult, { depth: null });
                parseEventOutput(mresult['feed']['entry'],msg);
                //console.log("Done parsing string");
            });
        }).catch(function (error) {
            // API call failed...
            console.log(error);
            console.log("Failure with download calendar");
            cmd = "Whoops! Houston, we have a problem: " + JSON.stringify(error);
            console.error(cmd);
        });
    });

    robot.respond("/lost$/i", function(msg) {
        msg.reply("You can go to <https://www.google.com|google> and search.");
    });

    robot.respond("/(changes|hotshots|motd)(?: (.*))?$/i", function(msg) {

        function parseOutput(changes_json,msg) {
            console.log("processing retrieval ...");
            //console.dir(changes_json);

            if(typeof changes_json == 'object' && changes_json !== null) {
                console.log("IF object");

                var uarray = {};
                // var sodasHad = robot.brain.get('totalSodas') * 1 || 0;
                Object.keys(changes_json).forEach(function(key, idx) {
                    //console.log(changes_json[key]['$']['uid']);
                    var uid = changes_json[key]['$']['uid'];
                    var cs_id = changes_json[key]['$']['id'];

                    if(!uarray[uid]) {
                        uarray[uid] = {};
                        uarray[uid]['counter'] = 0;
                        uarray[uid]['changesets'] = [];
                    }

                    if(!uarray[uid]['profile']) {
                        uarray[uid]['profile'] = changes_json[key]['$'];
                    }

                    if(uarray[uid]['counter'] || uarray[uid]['counter'] === 0 ) {
                        uarray[uid]['counter']++;
                        uarray[uid]['changesets'].push(cs_id);
                    }
                });

                var arrObj = [];
                Object.keys(uarray).forEach(function(key, idx) {
                    arrObj.push(uarray[key]);
                });

                //console.dir(arrObj, null);

                // use slice() to copy the array and not just make a reference
                var byTotal = arrObj.slice(0);
                byTotal.sort(function(a,b) {
                    return b.counter - a.counter;
                });

                console.log('by total:');
                console.dir(byTotal);

                var sortedObj = byTotal.reduce(function(acc, cur, i) {
                    acc[i] = cur;
                    return acc;
                }, {});

                console.log('sortedObj:');
                //console.dir(sortedObj, null);
                // console.log(msg);
                mycmd = msg.match[1].trim();

                var base = "http://www.openstreetmap.org/changeset/";
                var reply = "";
                if (mycmd == 'motd') {
                    reply="Top 3 Mappers Of The Day are: \n";
                } else {
                    reply="Top mappers of last 24hrs sorted by # changsets: \n";
                }

                Object.keys(sortedObj).forEach(function(key, idx) {
                    var uid = sortedObj[key]['profile']['uid'];
                    var name = sortedObj[key]['profile']['user'];
                    var counts = sortedObj[key]['counter'].toString();
                    var sets = sortedObj[key]['changesets'];

                    var closed = sortedObj[key]['profile']['closed_at'];
                    var newDate = new Date(closed);
                    var urls = [];

                    for (var i = 0; i < sets.length; i++) {
                        //urls.push(base + sets[i]);
                        urls.push(sets[i]);
                    }

                    var allurls= urls.join(' ');

                    //console.log(sortedObj[key]);
                    //process.exit(1);

                    if (mycmd == 'motd') {
                        if (idx<3) {
                            reply=reply //+ newDate.toGMTDateString() 
                                + " # changesets: " + counts.lpad(" ", 2) 
                                + " :  User: " + name 
                                + " ( " +allurls+" ) " + '\n';
                        }
                    }  else {
                        reply=reply //+ newDate.toGMTDateString() 
                            + " # changesets: " + counts.lpad(" ", 2) 
                            + " :  User: " + name 
                            + " ( " +allurls+" ) " + '\n';
                    }

                });
                msg.reply(reply); 
                msg.send("This list is no indication of quality. It's meant to be used along with `changeset` bot command to review changesets"); 
            } else {
                console.log("NO JSON HERE");
            }
            console.log("END");
        }

        // Get Belgian changesets
        var url = "http://api.openstreetmap.org/api/0.6/changesets?bbox=2.52,50.64,5.94,51.51";

        var options = {
            uri: url,
            /*
            qs: {
                access_token: '12434asfdsdfw3' // -> uri + '?access_token=xxxxx%20xxxxx'
            },
            */
            headers: {
                'User-Agent': 'Request-Promise [memcached] - BEBOT osmbe bot https://riot.im/app/?#/room/#osmbe:matrix.org'
            },
            json: false // if true: Automatically parses the JSON string in the response
        };

        getcache().then(function(response) {
            if (response) {
                console.log("Cache hit");
                parseOutput(response,msg);
            } else{
                console.log("Weird stuff shit");
            }
        }).catch(function (error) {
            console.log("Cache miss");
            msg.send("Changeset list not cached, contacting OSM API...");
            rp(options).then(function (repos) {
                console.log('%d long response', repos.length);
                //var client = sdk.createClient("https://matrix.org");
                parseString(repos, function (err, mresult) {
                    console.log("Parsing results");
                    memcached.set( "changesets", mresult['osm']['changeset'] , 300, function( err, mresult2 ) {
                        if ( err ) {
                            console.error( err );
                            console.log("Error storing in cache");
                        } else {
                            console.log("Stored in cache");
                        }
                    });
                    parseOutput(mresult['osm']['changeset'],msg);
                    console.log("Done parsing string");
                });
            }).catch(function (error) {
                // API call failed...
                console.log(error);
                console.log("Failure with download changeset");
                cmd = "Whoops! Houston, we have a problem: " + JSON.stringify(error);
                console.error(cmd);
            });
        });
    });

    robot.respond("/changeset ([0-9]+)(?: (.*))?$/i", function(msg) {
        // BBOX changeset // Belgum : 2.52, 50.64, 5.94, 51.51
        // http://api.openstreetmap.org/api/0.6/changesets?bbox=2.52,50.64,5.94,51.51&output=json
        // http://osmhv.openstreetmap.de/changeset.jsp?id=53964940
        set = msg.match[1].trim();

        var cmd ="Yeah. Lets play the blame game!\n";
        msg.send(cmd);

        osmhv_url = "http://osmhv.openstreetmap.de/changeset.jsp?id=" + set;
        achav_url_dev = "http://nrenner.github.io/achavi/?changeset=" + set;
        achav_url = "https://overpass-api.de/achavi/?changeset=" + set;
        osm_url = "http://www.openstreetmap.org/browse/changeset/" + set;

        var reply = "\nChangeset OSM: " + osm_url + "\n"
            + "Achavi diff   : " + achav_url + "\n"
            + "OSM Hist view : " + osmhv_url + "\n";

        msg.reply(reply);
        //url = "http://grbtiles.byteless.net/streets/?limit=10&postcode=" + msg.match[1] + "&meta=map";
    });

    robot.respond("/streetmap ([0-9]+)(?: (.*))?$/i", function(msg) {
        // Call static map generator http://staticmap.openstreetmap.de/staticmap.php?center=43.714728,5.998672&zoom=14&size=865x512&maptype=mapnik
        // markers=40.702147,-74.015794,lightblue1|40.711614,-74.012318,lightblue2|40.718217,-73.998284,lightblue3
        // maptype=cycle

        //msg.send("ACK for effort: "+msg.match);
        //console.log(msg.envelope.message.rawMessage.channel);
        //console.log(msg.match);

        var cmd ="";
        var d = new Date();
        var maptype="mapnik";

        var searchstring="";
        // Pick off last stuff / space separated
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

                    // Calculate the center of both values from crab api
                    if (obj.b && obj.t && obj.r && obj.l ) {
                        // http://staticmap.openstreetmap.de/staticmap.php?center=43.714728,5.998672&zoom=14&size=865x512&maptype=mapnik
                        cmd = "building static map from " + obj.name + " for postcode " +  msg.match[1];
                        msg.send(cmd);

                        var center =geolib.getCenterOfBounds([
                            {latitude: obj.b, longitude: obj.l},
                            {latitude: obj.t, longitude: obj.r},
                        ]);
                        //  returns {"latitude": centerLat, "longitude": centerLng}
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

    //memcached.end(); 
};
