const core = require('@actions/core');
const {graphql} = require('@octokit/graphql');

const issueByNumber = `query issueByNumber($repo_owner: String!, $repo_name: String!, $issue_number: Int!) {
  repository(owner: $repo_owner, name: $repo_name) {
    issue(number:$issue_number){
      id
      projectCards(first:100){
        totalCount
        nodes{
          id
          column{
            id
            name
            project{
              id
              number
              name
            }
          }
          project{
            id
            name
            number
          }
        }
      }
      labels(first:100){
        totalCount
        nodes {
          id
          name
          isDefault
          color
        }
      }
    }
  }
}
`
async function getIssueByNumber(repo, issueNumber) {
  const queryVariables = Object.assign({},{
      repo_owner: repo.owner, 
      repo_name: repo.name,
      headers: {
          authorization: `Bearer ` + repo.token,
          accept: `application/vnd.github.bane-preview+json`,
          },   
      },
      { issue_number: issueNumber}
  );
  try {
      const response = await Promise.resolve(graphql(
                  issueByNumber,
                  queryVariables 
                  )
      );
      return response.repository.issue;
  } catch (err) {
      console.log("failed", err.request);
      console.log(err.message);
      return null;
  }
}

async function getColumnByName(columns, name) {
  // console.log("get "+name+" from "+JSON.stringify(columns));
  for(const column of columns){
      // console.log(column.name);
      if (column.name.toLowerCase() === name.toLowerCase()){
          // console.log("matched: \n",JSON.stringify(column));
          return column;
      } 
  };
  console.log(name+" not found");
  return null;
}

const projectByNumber = `query projectByNumber($repo_owner: String!, $repo_name: String!, $project_number: Int!) {
  repository(owner: $repo_owner, name: $repo_name) {
    project(number:$project_number){
      id
      columns(first: 100){
        totalCount
        nodes{
          id
          name
        }
      }
    }
  }
}
`

async function getProjectByNumber(repo, projectNumber) {
  const queryVariables = Object.assign({},{
      repo_owner: repo.owner, 
      repo_name: repo.name,
      headers: {
          authorization: `Bearer ` + repo.token,
          accept: `application/vnd.github.bane-preview+json`,
          },   
      },
      { project_number: projectNumber }
  );

  try {
      const response = await graphql(
         projectByNumber,
         queryVariables 
      );
      return response.repository.project;
  } catch (err) {
      console.log("failed", err.request)
      console.log(err.message)
      return null;
  }
}

const moveCard = `mutation moveCard($card_id: ID!, $column_id: ID!) {
  moveProjectCard(input: {cardId: $card_id, columnId:$column_id}) {
    cardEdge {
      node {
        id
        note
        column {
              project{
              name
          }
          name
          purpose
        }
      }
    }
  }
}
`

async function setCardColumn(repo, cardId, columnId) {
  const queryVariables = Object.assign({}, {
      repo_owner: repo.owner, 
      repo_name: repo.name,
      headers: {
          authorization: `Bearer ` + repo.token,
          accept: `application/vnd.github.bane-preview+json`,
          },   
      },
      { card_id: cardId, column_id: columnId }
  );

  try {
      const response = await graphql(
        moveCard,
         queryVariables 
      );
      return response.moveProjectCard.cardEdge.node;
  } catch (err) {
      console.log("failed", err.request)
      console.log(err.message)
      return null;
  }
}

async function action (){
  var repoConfig = {
    id: null,
    name: 'empty',
    owner: 'you',
    token: null
  };

  try {
    repoConfig.id = core.getInput('repo-id', {required: true});
    repoConfig.name = core.getInput('repo-name', {required: true});
    repoConfig.owner = core.getInput('repo-owner', {required: true});
    repoConfig.token = core.getInput('repo-token', {required: true});
    console.log("config: " + JSON.stringify(repoConfig));

    var issueNumber = core.getInput('issue-number', {required: true});
    issueNumber = JSON.parse(issueNumber);
    var stageLabel = core.getInput('new-label', {required: true});

    var issue = await getIssueByNumber(repoConfig, issueNumber);
    console.log("Issue is:\n",JSON.stringify(issue));
    if (issue.projectCards.totalCount > 0) {
      // - if card does not exist, throw error becasue issue is not assigned to a project
      // @todo-later:
      // - 2a: for each label throw error on incorrect design stage and state labels
      // - mavenlink integration
      const cards = issue.projectCards.nodes;
      for(const card of cards){
          const project = await getProjectByNumber(repoConfig, card.project.number);
          // console.log("Card is: \n",JSON.stringify(card));
          // console.log("Project is: \n",JSON.stringify(project));

          const column = await getColumnByName(project.columns.nodes, stageLabel);
          
          const check = await setCardColumn(repoConfig, card.id, column.id);
          console.log("Move result:\n", JSON.stringify(check));
      }
    }  
    // @todo: go through stage labels and remove other stages if they exist. 
  } catch (error) {
    core.setFailed(error.message);
  }
}

action();