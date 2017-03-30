# Github-Gantt
Generate Gantt Charts From Github Issues!

For organizations, especially open-source teams, that spend their day in Github there is no easy way to visualize the time
table on work outlined in issues. Instead, this requires syncing Github issues with other charting or roadmapping tools,
creating an unnecessary burden to use multiple tools.

This project seeks to simplify this disconnect and bring Gantt charting together with Github issues. The initial issue comment
is parsed for specific search strings to identify the start/end dates, which label to use for bar coloring, and progress. The data is aggregated in a Realm accessed by a Node.js Express server.

## Setup
First you will need to configure the server, run:
```
// Mac
sh ./setup.sh

// Linux
bash ./setup.sh
```
This will ask for your Github API token, organization name, and repo name. It will then generate a config file at
```
/config/config.js
```
Additional configuration options are available to customize the strings used to search on in the Github issues:
```
// Your Github Access Token
GITHUB_API_TOKEN: ""
  
// The name of the Github organization
GITHUB_ORG_NAME: ""
// The repo name in the Github organization
GITHUB_REPO_NAME: ""
  
// Configuration for the labels in Github issues to search for
START_DATE_STRING: "#### 🗓 Start Date:"
DUE_DATE_STRING: "#### 🗓 Expected Date:"
LABEL_STRING: "#### 💪 Team:"
PROGRESS_STRING: "#### 📈 Progress (0-1):"
```
## Start the server
```
node index.js

// Specify a port
PORT=80 node index.js
```

### Additional Work
- [x] Support editing in the chart itself, passing back date changes to the Github issue
- [ ] Support listing of dependencies to display in the chart
- [ ] UI improvements to show who the task is assigned to
