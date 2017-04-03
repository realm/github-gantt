const GitHub = require('octokat');
const utilities = require('./utilities');
const config = require('./config/config');

const OLD_STRING = "#### 💪 Team:";
const NEW_STRING = "#### 🏷 Label:";

const gh = new GitHub({
  token: config.GITHUB_API_TOKEN
});

let repo = gh.repos(config.GITHUB_ORG_NAME, config.GITHUB_REPO_NAME);

// Change Github Issues To New Config
function fixIssues(issues, oldVal, newVal, completion, issueMap) {
  if (!utilities.isObject(issueMap)) {
    issueMap = {};
  }
  
  for (index in issues.items) {
    let issue = issues.items[index];
    
    // find old value
    if (issue.body != null) {
      var lines = issue.body.split('\r\n');
      var didUpdate = false;
      for (var j = 0; j < lines.length; j++) {
        if (!lines[j].indexOf(oldVal)) {
          lines[j] = lines[j].replace(oldVal, newVal);
          didUpdate = true;
        }
      }
      
      if (didUpdate) {
        let newBody = lines.join('\r\n');
        issueMap[issue.number] = newBody;
      }
    }
  }
  
  if (utilities.isString(issues.nextPageUrl)) {
    issues.nextPage.fetch()
    .then((moreIssues) => {
      fixIssues(moreIssues, oldVal, newVal, completion, issueMap);
    });
  }
  else {
    let keys = Object.keys(issueMap);
    let total = keys.length;
    var completedIssues = [];
    for (index in keys) {
      let key = keys[index];
      let value = issueMap[key];
      console.log("Updating Issue: "+key);
      repo.issues(key).update({
        body: value,
      }).then((issue) => {
        completedIssues.push(key);
        if (completedIssues.length == total) {
          completion();
        }
      });
    }
  }
}

console.log('--> Changing: "'+OLD_STRING+'" to "'+NEW_STRING+'"');

repo.issues.fetch({state: "all", per_page: 100})
.then((issues) => {
  fixIssues(issues, OLD_STRING, NEW_STRING, () => {
    console.log('--> Did Change: "'+OLD_STRING+'" to "'+NEW_STRING+'"');
    process.exit();
  });
});