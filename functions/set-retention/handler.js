const AWS            = require('aws-sdk')
const cloudWatchLogs = new AWS.CloudWatchLogs()
const retentionDays  = process.env.retention_days

const setExpiry = async (logGroupName) => {
  let params = {
    logGroupName    : logGroupName,
    retentionInDays : retentionDays
  }

  await cloudWatchLogs.putRetentionPolicy(params).promise()
}

module.exports.handler = async (event, context) => {
  console.log(JSON.stringify(event))
  
  const logGroupName = event.detail.requestParameters.logGroupName
  console.log(`log group: ${logGroupName}`)

  await setExpiry(logGroupName)
  console.log(`updated [${logGroupName}]'s retention policy to ${retentionDays} days`)
}