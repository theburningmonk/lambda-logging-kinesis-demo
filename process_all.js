const Promise = require('bluebird')
const AWS = require('aws-sdk')

// CONFIGURE THESE!!!
// ============================================
const region = "us-east-1" // change this to your region
const arn = "" // insert ARN of the LogsKinesisStream resource in serverless.yml
const roleArn = "" // insert ARN of the CloudWatchLogsRole resource in serverless.yml
const shipLogsFunction = "" // insert the function name of the ship-logs-to-logzio function
const retentionDays = 7 // change this if you want
const prefix = '/aws/lambda'  // use '/' if you want to process every log group
// ============================================

AWS.config.region = region
const cloudWatchLogs = new AWS.CloudWatchLogs()

const listLogGroups = async (acc, nextToken) => {
  const req = {
    limit: 50,
    logGroupNamePrefix: prefix,
    nextToken: nextToken
  }
  const resp = await cloudWatchLogs.describeLogGroups(req).promise()

  const newAcc = acc.concat(resp.logGroups.map(x => x.logGroupName))
  if (resp.nextToken) {
    return await listLogGroups(newAcc, resp.nextToken)
  } else {
    return newAcc
  }
}

const subscribe = async (logGroupName) => {
  const options = {
    destinationArn : arn,
    logGroupName   : logGroupName,
    filterName     : 'ship-logs',
    filterPattern  : '[timestamp=*Z, request_id="*-*", event]',
    roleArn        : roleArn
  }

  try {
    await cloudWatchLogs.putSubscriptionFilter(options).promise()
  } catch (err) {
    console.log(`FAILED TO SUBSCRIBE [${logGroupName}]`)
    console.error(JSON.stringify(err))

    if (err.retryable === true) {
      const retryDelay = err.retryDelay || 1000
      console.log(`retrying in ${retryDelay}ms`)
      await Promise.delay(retryDelay)
      await subscribe(logGroupName)
    }
  }
}

const setRetentionPolicy = async (logGroupName) => {
  const params = {
    logGroupName    : logGroupName,
    retentionInDays : retentionDays
  }

  await cloudWatchLogs.putRetentionPolicy(params).promise()
}

const processAll = async () => {
  const logGroups = await listLogGroups([])
  for (let logGroupName of logGroups) {
    if (logGroupName.endsWith(shipLogsFunction))
    {
      console.log(`skipping [${logGroupName}] as it will create cyclic events when log shipper generates its own logs`)
      continue
    }

    console.log(`subscribing [${logGroupName}]...`)
    await subscribe(logGroupName)

    console.log(`updating retention policy for [${logGroupName}]...`)
    await setRetentionPolicy(logGroupName)
  }
}

processAll().then(_ => console.log("all done"))