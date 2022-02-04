import * as AWS from 'aws-sdk';
import { EmailData } from '../type/emailType';

export const sendEmail = async (emailData: EmailData) => {
  const SQSConfig = {
    apiversion: process.env.AWS_SES_API_VERSION,
    accessKeyId: process.env.SQS_EMAIL_SERVICE_ACCESS_KEY,
    secretAccessKey: process.env.SQS_EMAIL_SERVICE_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  };

  let sqs = new AWS.SQS(SQSConfig);

  let params = {
    MessageBody: JSON.stringify(emailData),
    QueueUrl: process.env.SQS_QUEUE_URL,
  };

  try {
    let sqsResponse = await sqs.sendMessage(params).promise();
    return sqsResponse;
  } catch (error) {
    return error;
  }
};
