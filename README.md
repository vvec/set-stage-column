# vvec-org/add-project
This action adds a project to the current repo with a defined set of columns

## inputs
This action requires the following inputs:

input | description
---- | ----
repo-id | the (node) ID of the repository 
repo-name | name of the repository
repo-owner | owner of the repository
repo-token | authorization token to access the repository
issue-number | the number of the issue being moved
label-name | the name of the new stage

## outputs
none

## dependencies
This action uses:
- the GitHub GraphQL API
- the workflow run context.
- the @action/core package.

*NOTE* This is action is in development and is subject to change

