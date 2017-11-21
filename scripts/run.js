// Commands:
// hubot active [now|today] - shows the active 10 mappers of the moment or by total of the day
// hubot streets <postcode> [partialstring] - searches for streetlist in postcode
// hubot streetmap <postcode> [partialstring] [cycle|mapnik] - creates a static image given by the bounds of the street we search
// hubot stats <postcode> - Shows you a count for the number of streets in that postcode
// hubot changeset <number> - Blame someone
//
// author Glenn Plas for OSM.BE


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


//var slackBot = require('slack-bot')('https://hooks.slack.com/services/TT0ANGLKK8/TB0ANVAUH3/SAMsIzvHkcwyzbVEIf6B2aey');
// var sdk = require("matrix-js-sdk");
// var client = sdk.createClient("https://matrix.org");
//
//

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

module.exports = function(robot) {
    //console.log(robot);

    robot.respond(/who is @?([\w .\-]+)\?*$/i, function(res, done) {
        name = res.match[1].trim();
        users = robot.brain.usersForFuzzyName(name);

        if(users.length >= 1) {
            var user = users[0]
            // Do something interesting here.. 
            res.send(name + " is user " + user, done);
        }
    });

    robot.respond("/active(?: (.*))?$/i", function(msg) {

        function parseOutput(changes_json) {
            console.log("processing retrieval ...");
            //console.dir(changes_json);

            if(typeof changes_json == 'object' && changes_json !== null) {
                console.log("IF object");
                //console.error(changes_json, null);
                //process.exit(1);

                var uarray = {};
                // var sodasHad = robot.brain.get('totalSodas') * 1 || 0;
                Object.keys(changes_json).forEach(function(key, idx) {
                    //console.log(key);
                    // console.log("OK ROW");
                    //console.error(changes_json[key], null);
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

                    //console.error(changes_json[key], null);
                    //process.exit(1);
                    // console.log(key + ": " + idx);
                    /*
                     *   '6781225': 
                     *      { counter: 3,
                     *        changesets: [ '53957855', '53957617', '53957033' ],
                     *        profile: 
                     *        { id: '53957855',
                        *        user: 'Juvan',
                        *        uid: '6781225',
                        *       created_at: '2017-11-20T19:03:45Z',
                        *      closed_at: '2017-11-20T19:03:45Z',
                        *     open: 'false',
                     *    min_lat: '50.7067433',
                     *   min_lon: '5.6036214',
                     *  max_lat: '50.7186163',
                     *                                                                                              max_lon: '5.6211756',
                     *                                                                                                      comments_count: '0' } },
                     *
                     */
                });

                // Extend object to support sort method
                function sortObj(obj) {
                    "use strict";

                    function Obj2Array(obj) {
                        var newObj = [];
                        for (var key in obj) {
                            if (!obj.hasOwnProperty(key)) return;
                            var value = [key, obj[key]];
                            newObj.push(value);
                        }
                        return newObj;
                    }

                    var sortedArray = Obj2Array(obj).sort(function(a, b) {
                        if (a[1] < b[1]) return -1;
                        if (a[1] > b[1]) return 1;
                        return 0;
                    });

                    function recreateSortedObject(targ) {
                        var sortedObj = {};
                        for (var i = 0; i < targ.length; i++) {
                            sortedObj[targ[i][0]] = targ[i][1];
                        }
                        return sortedObj;
                    }
                    return recreateSortedObject(sortedArray);
                }

                var sortedObj = sortObj(uarray);

                Object.invert = function (obj) {

                    var new_obj = {};

                    for (var prop in obj) {
                        if(obj.hasOwnProperty(prop)) {
                            new_obj[obj[prop]] = prop;
                        }
                    }

                    return new_obj;
                };
                // var invertedList = Object.invert(uarray);


                var reply="";
                Object.keys(uarray).forEach(function(key, idx) {
                    var uid = uarray[key]['profile']['uid'];
                    var name = uarray[key]['profile']['user'];
                    var counts = uarray[key]['counter'];
                    var sets = uarray[key]['changsets'];

                    reply=reply + "User: " + name + " # changesets: " + counts +'\n';
                });
                msg.reply(reply); 
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
            	parseOutput(response);
	    } else{
            	console.log("Weird stuff shit");
	    }
        }).catch(function (error) {
            console.log("Cache miss");
            rp(options).then(function (repos) {
                console.log('%d long response', repos.length);
                //var client = sdk.createClient("https://matrix.org");
                parseString(repos, function (err, mresult) {
                    console.log("Parsing results");
                    memcached.set( "changesets", mresult['osm']['changeset'] , 120, function( err, mresult2 ) {
                        if ( err ) {
                            console.error( err );
                            console.log("Error storing in cache");
                        } else {
                            console.log("Stored in cache");
                        }
                    });
                    parseOutput(mresult['osm']['changeset']);
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
        //
        // Call static map generator http://staticmap.openstreetmap.de/staticmap.php?center=43.714728,5.998672&zoom=14&size=865x512&maptype=mapnik
        // markers=40.702147,-74.015794,lightblue1|40.711614,-74.012318,lightblue2|40.718217,-73.998284,lightblue3
        // maptype=cycle

        //msg.send("ACK for effort: "+msg.match);
        //console.log(msg.envelope.message.rawMessage.channel);
        //console.log(msg.match);
        //
        var obj = {};

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
