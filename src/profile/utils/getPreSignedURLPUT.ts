import { S3 } from 'aws-sdk';

export const getPreSignedURLForPut = async ({
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
    Expires: 60 * 5,
  };
  try {
    const url: string = await new Promise((res, rej) => {
      return s3.getSignedUrl('putObject', params, (err, url) => {
        err ? rej(err) : res(url);
      });
    });
    return url;
  } catch (err) {
    if (err) {
      return err;
    }
  }
};
