let AWS = require('aws-sdk');

/**
 * To add logs in the cloudwatch. logStreamName should be present in the cloudwatch with right permisions to add logs.
 * @param logEvents logEvents is the log events.
 * @param logGroupName logGroupName is the name of the log group.
 * @param logStreamName logStreamName is the name of the logstream name
 * @returns {Promise<unknown>}
 */
const saveLog = async (
  logEvents,
  logStreamName = 'default',
  logGroupName = process.env.CLOUDWATCH_GROUP_NAME) => {
  return new Promise(async (resolve) => {
    try {

      let cloudwatchlogs = new AWS.CloudWatchLogs({apiVersion: '2014-03-28'});

      let logParams = {
        logGroupName: logGroupName,
        logStreamName: logStreamName
      };


      // check log group exists
      let describeloggroups = await cloudwatchlogs.describeLogGroups({
        logGroupNamePrefix: logGroupName
      }).promise();

      if (describeloggroups.logGroups.length === 0) {
        throw `Log group ${logGroupName} does not exist`;
      }

      // Check if log steam exists
      let describeLog = await cloudwatchlogs.describeLogStreams({
        logGroupName: logParams.logGroupName,
        logStreamNamePrefix: logParams.logStreamName,
        limit: 1
      }).promise();

      //If the log stream exists
      if (describeLog.logStreams && describeLog.logStreams.length > 0) {
        logParams.sequenceToken = describeLog.logStreams[0].uploadSequenceToken;
      } else {
        //create log stream if the log stream is not exists
        let createLogStream = await cloudwatchlogs.createLogStream({
          logGroupName: logParams.logGroupName,
          logStreamName: logParams.logStreamName
        }).promise();
        logParams.sequenceToken = createLogStream.uploadSequenceToken;
      }

      // Send log events to CloudWatch Logs
      let params = {logEvents: logEvents, ...logParams};
      let putLogEvents = await cloudwatchlogs.putLogEvents(params).promise();

      // Check if the log events were successfully sent
      if (putLogEvents.nextSequenceToken) {
        resolve(putLogEvents.nextSequenceToken);
      } else {
        throw putLogEvents.rejectedLogEventsInfo;
      }
      // return resolve(putLogEvents);

    } catch (e) {
      console.log(e);
      resolve();
    }
  });
};

module.exports = {
  saveLog
};
