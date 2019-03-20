/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Description:
//   An HTTP Listener for notifications on github pushes
//
// Dependencies:
//   "url": ""
//   "querystring": ""
//   "gitio2": "2.0.0"
//
// Configuration:
//   Just put this url <HUBOT_URL>:<PORT>/hubot/gh-commits?room=<room> into you'r github hooks
//   HUBOT_GITHUB_COMMITS_ONLY -- Only report pushes with commits. Ignores creation of tags and branches.
//
// Commands:
//   None
//
// URLS:
//   POST /hubot/gh-commits?room=<room>[&type=<type]
//
// Authors:
//   nesQuick

const url = require('url');
const querystring = require('querystring');
const gitio = require('gitio2');

module.exports = robot =>

  robot.router.post("/hubot/gh-commits", function(req, res) {
    const query = querystring.parse(url.parse(req.url).query);

    res.send(200);

    const user = {};
    if (query.room) { user.room = query.room; }
    if (query.type) { user.type = query.type; }

    if (req.body.zen != null) { return; } // initial ping
    const push = req.body;

    try {
      if (push.commits !== null && push.commits !== undefined) {
      if (push.commits.length > 0) {
        const commitWord = push.commits.length > 1 ? "commits" : "commit";
        robot.send(user, `Got ${push.commits.length} new ${commitWord} from ${push.commits[0].author.name} on ${push.repository.name}`);
        return Array.from(push.commits).map((commit) =>
          (commit =>
            gitio(commit.url, (err, data) => robot.send(user, `  * ${commit.message} (${err ? commit.url : data})`))
          )(commit));
      } else if (!process.env.HUBOT_GITHUB_COMMITS_ONLY) {
        if (push.created) {
          if (push.base_ref) {
            robot.send(user, `${push.pusher.name} created: ${push.ref}: ${push.base_ref}`);
          } else {
            robot.send(user, `${push.pusher.name} created: ${push.ref}`);
          }
        }
        if (push.deleted) {
          return robot.send(user, `${push.pusher.name} deleted: ${push.ref}`);
        }
      }
      } else if (push.action !== undefined) {
        robot.send(user, `User ${push.project_card.creator.login} ${push.action} a card in https://github.com/gplv2/grbtool/projects/1`);
      }

    } catch (error) {
      return console.log(`github-commits error: ${error}. Push: ${push}`);
    }
  })
;

