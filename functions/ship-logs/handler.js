const zlib = require('zlib')
const { processAll } = require('./lib')

function parsePayload (record) {
  // return Buffer.from(record.kinesis.data, 'base64').toString('utf8')
  const payload = new Buffer(record.kinesis.data, 'base64')
  const json = (zlib.gunzipSync(payload)).toString('utf8')
  return JSON.parse(json)
}

const getRecords = (event) => event.Records.map(parsePayload)

module.exports.handler = async (event, context) => {
  try {
    const records = getRecords(event)
    // once decoded, the records look like this:
    // [
    //   {
    //       "messageType": "DATA_MESSAGE",
    //       "owner": "374852340823",
    //       "logGroup": "/aws/lambda/aws-nodejs-canary-hello",
    //       "logStream": "2018/07/22/[$LATEST]a235f57406e549ddbdafef612a132f10",
    //       "subscriptionFilters": [
    //           "ship-logs"
    //       ],
    //       "logEvents": [
    //           {
    //               "id": "34171444540218436632646872141176220045501709937990762496",
    //               "timestamp": 1532300568255,
    //               "message": "2018-07-22T23:02:48.255Z\t5a1483a7-8e03-11e8-bf3a-e53040dff403\twoot woot\n",
    //               "extractedFields": {
    //                   "event": "woot woot\n",
    //                   "request_id": "5a1483a7-8e03-11e8-bf3a-e53040dff403",
    //                   "timestamp": "2018-07-22T23:02:48.255Z"
    //               }
    //           },
    //           {
    //               "id": "34171444574739990199972276764273511931561373549248446468",
    //               "timestamp": 1532300569803,
    //               "message": "2018-07-22T23:02:49.803Z\t5b048930-8e03-11e8-94b7-a5decfdefa72\twoot woot\n",
    //               "extractedFields": {
    //                   "event": "woot woot\n",
    //                   "request_id": "5b048930-8e03-11e8-94b7-a5decfdefa72",
    //                   "timestamp": "2018-07-22T23:02:49.803Z"
    //               }
    //           }
    //       ]
    //   }
    // ]

    for (let { logGroup, logStream, logEvents } of records) {
      await processAll(logGroup, logStream, logEvents)
    }
  } catch (err) {
    // swallow exception so the stream can move on
    console.error(err)
  }
}