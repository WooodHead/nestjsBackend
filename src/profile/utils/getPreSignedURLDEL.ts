import { S3 } from 'aws-sdk';

export const getPreSignedURLForDel = async ({
  bucketName,
  key,
}: {
  bucketName: string;
  key: string;
}) => {

  const s3 = new S3({
    endpoint: `s3-us-east-2.amazonaws.com`,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    signatureVersion: 'v4',
    region: 'us-east-2',
  });
  
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  try {
    await s3.deleteObject(params).promise();
  } catch (err) {
    if (err) {
      return err;
    }
  }
};
