const express = require('express');
const app = express();
const GitHub = require('octokat')
const Realm = require('realm');
const path = require('path');
const dateFormat = require('dateformat');
const utilities = require('./utilities');

// Config
const START_DATE_STRING = "StartDate:";
const DUE_DATE_STRING = "ExpectedDate:";
const GITHUB_API_TOKEN = process.env.GITHUB_TOKEN || "<INSERT TOKEN>"

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
    html_url: 'string',
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
  }
};

let realm = new Realm({
  path: 'tasks.realm',
  schema: [TaskSchema]
});

const gh = new GitHub({
  token: GITHUB_API_TOKEN
});

function processIssues(issues, completion, idArray) {
  if (!utilities.isArray(idArray)) {
    idArray = [];
  }
  
  for (index in issues.items) {
    let issue = issues.items[index];
    var startDate = new Date(issue.createdAt);
    var dueDate = null
    
    // find keywords
    if (issue.body != null) {
      var lines = issue.body.split('\r\n')
      for (var j = 0; j < lines.length; j++) {
        if (!lines[j].indexOf(START_DATE_STRING)) {
          startDate = new Date(lines[j].replace(START_DATE_STRING, ''))
        }
        if (!lines[j].indexOf(DUE_DATE_STRING)) {
          dueDate = new Date(lines[j].replace(DUE_DATE_STRING, ''))
        }
      }
    }
    
    realm.write(() => {
      realm.create('Task', {
        text: utilities.sanitizeStringNonNull(issue.title),
        start_date:  startDate,
        duration: 1,
        id: issue.id,
        body: utilities.sanitizeStringNonNull(issue.body),
        url: utilities.sanitizeStringNonNull(issue.url),
        html_url: utilities.sanitizeStringNonNull(issue.htmlUrl),
        number: issue.number,
        state: issue.state,
        isDeleted: false,
        end_date: dueDate,
      }, true);
    });
    
    idArray.push(issue.id);
  }
  
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

app.use('/static', express.static(path.join(__dirname, 'node_modules/dhtmlx-gantt/codebase')));

realm.objects

let html = `<!DOCTYPE html>
<head>
  <meta http-equiv="Content-type" content="text/html; charset=utf-8">
</head>
  <script src="/static/dhtmlxgantt.js" type="text/javascript" charset="utf-8"></script>
  <link rel="stylesheet" href="/static/dhtmlxgantt.css" type="text/css" charset="utf-8">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
  <style type="text/css">
    html, body{ height:100%; padding:0px; margin:0px; overflow: hidden;}
    .weekend{ background: #BD7990!important; color:white !important;}
    .buttonload {
      background-color: #4CAF50;
      border: none;
      color: white;
      padding: 12px 24px;
      font-size: 16px;
      outline:none;
    }

    .fa {
      margin-left: -12px;
      margin-right: 8px;
    }
    </style>
<body onresize="zoomToFit()";onload="myFunction()">
  <div style="text-align: right;height: 40px;line-height: 40px;">
    <button class="buttonload" onclick="refresh(this)" id="refreshButton">
    Refresh
    </button>
  </div>
  <div id="gantt_here" style='width:100%; height:100%;'></div>
  <script type="text/javascript">
    var HttpClient = function() {
      this.get = function(aUrl, aCallback) {
        var anHttpRequest = new XMLHttpRequest();
        anHttpRequest.onreadystatechange = function() { 
        if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
          aCallback(anHttpRequest.responseText);
        }

        anHttpRequest.open( "GET", aUrl, true );            
        anHttpRequest.send( null );
      }
    };
    var client = new HttpClient();
    gantt.config.xml_date = "%m-%d-%Y";
    gantt.config.readonly = true;
    gantt.config.grid_width = 400;
    gantt.config.columns =  [
      {name:"text",
      label:"Task name",  
      tree:true, 
      width:'*' },
    ];
    gantt.attachEvent("onTaskClick", function(id, e) {
      var url = "/getIssueURL?id="+id;
      client.get(url, function(response) {
        window.open(response, "_blank");
      });
    });
        
    gantt.config.scale_unit = "week"; 
    gantt.config.date_scale = "%F, %d";

    gantt.config.subscales = [
      {unit:"month", step:1, date:"%M"}
    ];
    gantt.config.scale_height = 54;

    gantt.init("gantt_here");
    gantt.load("/data");

    refresh(document.getElementById("refreshButton"));
    
    function refresh(toggle) {
      toggle.innerHTML = '<i class="fa fa-refresh fa-spin"></i>Working';
      
      client.get("/refreshData", function(response) {
        gantt.clearAll(); 
        gantt.load("/data");
        toggle.innerText = "Refresh";
      });
    };

    function zoomToFit() {
      var project = gantt.getSubtaskDates();
      var areaWidth = gantt.$task.offsetWidth;

      for (var i = 0; i < scaleConfigs.length; i++) {
        var columnCount = getUnitsBetween(project.start_date, project.end_date, scaleConfigs[i].unit, scaleConfigs[i].step);
        if ((columnCount + 2) * gantt.config.min_column_width <= areaWidth) {
          break;
        }
      }

      if (i == scaleConfigs.length) {
        i--;
      }
      applyConfig(scaleConfigs[i], project);
      gantt.render();
    };
    
    // Zoom to fit functionality
    function applyConfig(config, dates) {
      gantt.config.scale_unit = config.scale_unit;
      if (config.date_scale) {
        gantt.config.date_scale = config.date_scale;
        gantt.templates.date_scale = null;
      }
      else {
        gantt.templates.date_scale = config.template;
      }

      gantt.config.step = config.step;
      gantt.config.subscales = config.subscales;

      if (dates) {
        gantt.config.start_date = gantt.date.add(dates.start_date, -1, config.unit);
        gantt.config.end_date = gantt.date.add(gantt.date[config.unit + "_start"](dates.end_date), 2, config.unit);
      } 
      else {
        gantt.config.start_date = gantt.config.end_date = null;
      }
    };
    
    // get number of columns in timeline
    function getUnitsBetween(from, to, unit, step) {
      var start = new Date(from);
      var end = new Date(to);
      var units = 0;
      while (start.valueOf() < end.valueOf()) {
        units++;
        start = gantt.date.add(start, step, unit);
      }
      return units;
    };
    
    //Setting available scales
    var scaleConfigs = [
      // minutes
      { unit: "minute", step: 1, scale_unit: "hour", date_scale: "%H", subscales: [
        {unit: "minute", step: 1, date: "%H:%i"}
      ]
      },
      // hours
      { unit: "hour", step: 1, scale_unit: "day", date_scale: "%j %M",
        subscales: [
          {unit: "hour", step: 1, date: "%H:%i"}
        ]
      },
      // days
      { unit: "day", step: 1, scale_unit: "month", date_scale: "%F",
        subscales: [
          {unit: "day", step: 1, date: "%j"}
        ]
      },
      // weeks
      {unit: "week", step: 1, scale_unit: "month", date_scale: "%F",
        subscales: [
          {unit: "week", step: 1, template: function (date) {
            var dateToStr = gantt.date.date_to_str("%d %M");
            var endDate = gantt.date.add(gantt.date.add(date, 1, "week"), -1, "day");
            return dateToStr(date) + " - " + dateToStr(endDate);
          }}
        ]},
      // months
      { unit: "month", step: 1, scale_unit: "year", date_scale: "%Y",
        subscales: [
          {unit: "month", step: 1, date: "%M"}
        ]},
      // quarters
      { unit: "month", step: 3, scale_unit: "year", date_scale: "%Y",
        subscales: [
          {unit: "month", step: 3, template: function (date) {
            var dateToStr = gantt.date.date_to_str("%M");
            var endDate = gantt.date.add(gantt.date.add(date, 3, "month"), -1, "day");
            return dateToStr(date) + " - " + dateToStr(endDate);
          }}
        ]},
      // years
      {unit: "year", step: 1, scale_unit: "year", date_scale: "%Y",
        subscales: [
          {unit: "year", step: 5, template: function (date) {
            var dateToStr = gantt.date.date_to_str("%Y");
            var endDate = gantt.date.add(gantt.date.add(date, 5, "year"), -1, "day");
            return dateToStr(date) + " - " + dateToStr(endDate);
          }}
        ]},
      // decades
      {unit: "year", step: 10, scale_unit: "year", template: function (date) {
        var dateToStr = gantt.date.date_to_str("%Y");
        var endDate = gantt.date.add(gantt.date.add(date, 10, "year"), -1, "day");
        return dateToStr(date) + " - " + dateToStr(endDate);
      },
        subscales: [
          {unit: "year", step: 100, template: function (date) {
            var dateToStr = gantt.date.date_to_str("%Y");
            var endDate = gantt.date.add(gantt.date.add(date, 100, "year"), -1, "day");
            return dateToStr(date) + " - " + dateToStr(endDate);
          }}
        ]}
    ];
</script>
</body>`;

app.get('/getIssueURL', function (req, res) {
  let taskId = parseInt(req.query.id);
  let task = realm.objectForPrimaryKey('Task', taskId);
  res.send(task.html_url);
});

app.get('/data', function (req, res) {
  let tasks = realm.objects('Task').filtered('isDeleted = false AND state = "open" AND end_date != null').sorted('start_date', true);
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
    };
    taskData.data.push(formattedTask);
  }
  res.send(taskData);
});

app.get('/refreshData', function (req, res) {
  gh.repos('realm', 'product').issues.fetch({state: "all", per_page: 100})
  .then((issues) => {
    processIssues(issues, () => {
      console.log("--> Finished Processing Issues");
      
      let tasks = realm.objects('Task').filtered('isDeleted = false AND state = "open" AND end_date != null').sorted('start_date', true);
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
        };
        taskData.data.push(formattedTask);
      }
      res.send(taskData);
    });
  });
});

app.get('/', function (req, res) {
  res.send(html);
});

app.listen(process.env.PORT || 3000, function () {
  console.log('Example app listening on port 3000!');
});