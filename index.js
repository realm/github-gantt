const express = require('express');
const app = express();
const GitHub = require('octokat');
const Realm = require('realm');
const path = require('path');
const dateFormat = require('dateformat');
const utilities = require('./utilities');
const config = require('./config/config');
const bodyParser = require('body-parser');

// Realm Model Definition
const TaskSchema = {
  name: 'Task',
  primaryKey: 'id',
  properties: {
    text: 'string', // task title
    start_date:  'date', // the date when a task is scheduled to begin
    duration: 'int', // the task duration
    id: 'int', // the task id
    body: 'string',
    url: 'string',
    htmlUrl: 'string',
    number: 'int',
    // Indicates the state of the issues to return. 
    // Can be either open, closed, or all.
    state: 'string',
    isDeleted: 'bool',
    // the task type, available values are stored in the types object:
    //
    // "task" - a regular task (default value).
    //
    // "project" - a task that starts, when its earliest child task starts, and 
    // ends, when its latest child ends. The start_date, end_date, duration 
    // properties are ignored for such tasks.
    //
    // "milestone" - a zero-duration task that is used to mark out important 
    // dates of the project. The duration, progress, end_date properties are 
    // ignored for such tasks.
    type: {type: 'string', optional: true},
    // the id of the parent task. 
    // The id of the root task is specified by the root_id config
    parent: {type: 'int', optional: true},
    // the task's level in the tasks hierarchy (zero-based numbering).
    level: {type: 'int', optional: true},
    // ( number from 0 to 1 ) the task progress.
    progress: {type: 'double', optional: true},
    // specifies whether the task branch will be opened initially 
    // (to show child tasks).
    open: {type: 'bool', optional: true},
    // the date when a task is scheduled to be completed. Used as an alternative
    // to the duration property for setting the duration of a task.
    end_date: {type: 'date', optional: true},
    // the background color of the task bar
    color: {type: 'string', optional: true},
    // the label used to identify the color of the task
    label: {type: 'string', optional: true},
  }
};

const LabelSchema = {
  name: 'Label',
  primaryKey: 'id',
  properties: {
    id: 'int',
    url: 'string',
    name: 'string',
    color: 'string',
    default: 'bool',
  }
}

const MilestoneSchema = {
  name: 'Milestone',
  primaryKey: 'id',
  properties: {
    url: 'string', //api.github.com/repos/octocat/Hello-World/milestones/1"
    htmlUrl: 'string', // https://github.com/octocat/Hello-World/milestones/v1.0"
    id: 'int',
    number: 'int',
    state: 'string',
    title: 'string',
    description: 'string',
    openIssues: 'int',
    closedIssues: 'int',
    createdAt: 'date',
    updatedAt: {type: 'date', optional: true},
    closedAt: {type: 'date', optional: true},
    dueOn: {type: 'date', optional: true},
  }
}

const gh = new GitHub({
  token: config.GITHUB_API_TOKEN
});

var realm;

if (config.RMP_ADMIN_TOKEN != "" &&
    config.RMP_SYNC_URL != "") {
      let adminUser = Realm.Sync.User.adminUser(config.RMP_ADMIN_TOKEN);
      realm = new Realm({
        sync: {
          user: adminUser,
          url: config.RMP_SYNC_URL,
        },
      schema: [TaskSchema, LabelSchema, MilestoneSchema],
    });
}
else {
  realm = new Realm({
    path: 'tasks.realm',
    schema: [TaskSchema, LabelSchema, MilestoneSchema],
  });
}

let repo = gh.repos(config.GITHUB_ORG_NAME, config.GITHUB_REPO_NAME);

function getLabels(completion) {
  repo.labels.fetch()
  .then((labels) => {
    let items = labels.items;
    if (utilities.isArray(items)) {
      realm.write(() => {
        for (index in items) {
          let label = items[index];
          realm.create('Label', {
            id: label.id,
            url: label.url,
            name: label.name,
            color: label.color,
            default: label.default,
          }, true);
        }
      });
    }
    completion();
  });
}

function getMilestones(completion) {
  repo.milestones.fetch()
  .then((milestones) => {
    let items = milestones.items;
    if (utilities.isArray(items)) {
      realm.write(() => {
        for (index in items) {
          let milestone = items[index];
          var updatedAt = null;
          var closedAt = null;
          var dueOn = null;
          if (utilities.isString(milestone.updatedAt)) {
            updatedAt = new Date(milestone.updatedAt);
          }
          if (utilities.isString(milestone.closedAt)) {
            closedAt = new Date(milestone.closedAt);
          }
          if (utilities.isString(milestone.dueOn)) {
            dueOn = new Date(milestone.dueOn);
          }
          realm.create('Milestone', {
            url: milestone.url,
            htmlUrl: milestone.htmlUrl,
            id: milestone.id,
            number: milestone.number,
            state: milestone.state,
            title: milestone.title,
            description: milestone.description,
            openIssues: milestone.openIssues,
            closedIssues: milestone.closedIssues,
            createdAt: new Date(milestone.createdAt),
            updatedAt: updatedAt,
            closedAt: closedAt,
            dueOn: dueOn,
          }, true);
        }
      });
    }
    completion();
  });
}

function processIssues(issues, completion, idArray) {
  if (!utilities.isArray(idArray)) {
    idArray = [];
  }
  
  realm.write(() => {
    for (index in issues.items) {
      let issue = issues.items[index];
      var startDate = new Date(issue.createdAt);
      var dueDate = null;
      var labelName = null;
      var color = null;
      var progress = null;
      
      // find keywords
      if (issue.body != null) {
        var lines = issue.body.split('\r\n')
        for (var j = 0; j < lines.length; j++) {
          if (!lines[j].indexOf(config.START_DATE_STRING)) {
            let date = new Date(lines[j].replace(config.START_DATE_STRING, ''));
            if (utilities.isDate(date)) {
              startDate = date;
            }
          }
          if (!lines[j].indexOf(config.DUE_DATE_STRING)) {
            let date = new Date(lines[j].replace(config.DUE_DATE_STRING, ''));
            if (utilities.isDate(date)) {
              dueDate = date;
            }
          }
          if (!lines[j].indexOf(config.LABEL_STRING)) {
            var labelString = lines[j].replace(config.LABEL_STRING, '');
            if (utilities.isString(labelString)) {
              labelString = labelString.trim();
              
              // Find label in realm
              let label = realm.objects('Label').filtered('name = $0', labelString)[0];
              if (utilities.isRealmObject(label)) {
                color = "#"+label.color.toUpperCase();
                labelName = label.name;
              }
            }
          }
          if (!lines[j].indexOf(config.PROGRESS_STRING)) {
            progress = utilities.sanitizeFloat(lines[j].replace(config.PROGRESS_STRING, ''));
          }
        }
      }
      
      realm.create('Task', {
        text: utilities.sanitizeStringNonNull(issue.title),
        start_date:  startDate,
        duration: 1,
        id: issue.id,
        body: utilities.sanitizeStringNonNull(issue.body),
        url: utilities.sanitizeStringNonNull(issue.url),
        htmlUrl: utilities.sanitizeStringNonNull(issue.htmlUrl),
        number: issue.number,
        state: issue.state,
        isDeleted: false,
        end_date: dueDate,
        label: labelName,
        color: color,
        progress: progress,
      }, true);
      
      idArray.push(issue.id);
    }
  });
  
  if (utilities.isString(issues.nextPageUrl)) {
    issues.nextPage.fetch()
    .then((moreIssues) => {
      processIssues(moreIssues, completion, idArray);
    });
  }
  else {
    // Prune the deleted issues
    oldIds = realm.objects('Task').map(function(task) {
      return task.id;
    });
    
    deletedIds = oldIds.filter(function(el) {
      return idArray.indexOf(el) < 0;
    });
    
    realm.write(() => {
      for (index in deletedIds) {
        let deletedId = deletedIds[index];
        let task = realm.objectForPrimaryKey('Task', deletedId);
        task.isDeleted = true;
      }
    });
    
    completion();
  }
}

function getTaskChartData() {
  let tasks = realm.objects('Task').filtered('isDeleted = false AND state = "open" AND end_date != null').sorted('label', true);
  var taskData = {data: []};
  for (index in tasks) {
    let task = tasks[index];
    let formattedTask = {
      id: task.id,
      text: task.text,
      start_date: dateFormat(task.start_date, "mm-dd-yyyy"),
      duration: task.duration,
      end_date: dateFormat(task.end_date, "mm-dd-yyyy"),
      url: task.url,
      progress: task.progress,
      color: task.color,
      htmlUrl: task.htmlUrl,
    };
    taskData.data.push(formattedTask);
  }
  
  return taskData;
}

app.use('/static', express.static(path.join(__dirname, 'node_modules/dhtmlx-gantt/codebase')));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname+'/index.html'));
});

app.get('/data', function (req, res) {
  var taskData = getTaskChartData();
  res.send(taskData);
});

app.get('/additionalData', function (req, res) {
  var data = {};
  
  // Handle milestones
  let milestones = realm.objects('Milestone').filtered('dueOn != null');
  data.milestones = milestones.map((object) => {
    return JSON.stringify(object);
  });
  
  // Handle labels
  var hash = {},labels = [];
  realm.objects('Task').filtered('isDeleted = false AND state = "open" AND end_date != null AND label != null').sorted('label', true).forEach((object, index) => {
    if (!hash[object.label]) {
      hash[object.label] = true; 
      labels.push({
        name: object.label,
        color: object.color,
      }); 
    }
  });
  data.labels = labels;
  
  res.send(data);
});

app.get('/refreshData', function (req, res) {
  getLabels(() => {
    console.log("--> Retrieved Labels");
  });
  getMilestones(() => {
    console.log("--> Retrieved Milestones");
  });
  repo.issues.fetch({state: "all", per_page: 100})
  .then((issues) => {
    processIssues(issues, () => {
      console.log("--> Finished Processing Issues");
      var taskData = getTaskChartData();
      res.send(taskData);
    });
  });
});

app.post('/updateIssue', bodyParser.json(), function (req, res) {
  if (!req.body || utilities.isObject(req.body)) {
    return res.sendStatus(400);
  }
  let chartTask = req.body;
  var task = realm.objectForPrimaryKey('Task', chartTask.id);
  if (utilities.isRealmObject(task)) {
    // Write to Realm first
    realm.write(() => {
      task.start_date = new Date(chartTask.start_date);
      task.end_date = new Date(chartTask.end_date);
      task.duration = utilities.sanitizeInt(chartTask.duration);
      task.progress = utilities.sanitizeFloat(chartTask.progress);
      
      var lines = task.body.split('\r\n');
      for (var j = 0; j < lines.length; j++) {
        if (!lines[j].indexOf(config.START_DATE_STRING)) {
          lines[j] = config.START_DATE_STRING + " " + dateFormat(task.start_date, "mm-dd-yyyy");
        }
        if (!lines[j].indexOf(config.DUE_DATE_STRING)) {
          lines[j] = config.DUE_DATE_STRING + " " + dateFormat(task.end_date, "mm-dd-yyyy");
        }
        if (!lines[j].indexOf(config.PROGRESS_STRING && utilities.isNumber(task.progress))) {
          lines[j] = config.PROGRESS_STRING + " " + task.progress.toFixed(2);
        }
      }
      let newBody = lines.join('\r\n');
      task.body = newBody;
    });
    // Now post to Github
    repo.issues(task.number).update({
      body: task.body,
    }).then((issue) => {
      res.send("Success");
    });
  }
});

app.listen(process.env.PORT || 3000, function () {
  let port = (process.env.PORT || 3000);
  console.log('Github-Gantt listening on port ' + port);
});
