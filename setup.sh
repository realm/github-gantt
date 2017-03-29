#!/usr/bin/env bash

echo "Please type in your Github API token: "
read GITHUB_API_TOKEN
if [ -z "${GITHUB_API_TOKEN}" ]; then
	echo "You need to provide a token to connect to your GitHub API"
    exit 1
fi

echo "Please type in your Github org name: "
read GITHUB_ORG_NAME
if [ -z "${GITHUB_ORG_NAME}" ]; then
  echo "You need to provide an org name"
    exit 1
fi

echo "Please type in your Github repo name: "
read GITHUB_REPO_NAME
if [ -z "${GITHUB_REPO_NAME}" ]; then
  echo "You need to provide an repo name"
    exit 1
fi
# copying default configuration file without overwritting
cp -n ./config/config-example.js ./config/config.js
# filling in ./config.js with typed values
sed  -i.bak "s/\(GITHUB_API_TOKEN: \).*$/\1\"${GITHUB_API_TOKEN//\//\\/}\",/" ./config/config.js
sed  -i.bak "s/\(GITHUB_ORG_NAME: \).*$/\1\"${GITHUB_ORG_NAME//\//\\/}\",/" ./config/config.js
sed  -i.bak "s/\(GITHUB_REPO_NAME: \).*$/\1\"${GITHUB_REPO_NAME//\//\\/}\",/" ./config/config.js
rm ./config/config.js.bak
# installing node dependencies
npm install