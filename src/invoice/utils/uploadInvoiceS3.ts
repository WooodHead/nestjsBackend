import * as AWS from 'aws-sdk';

export async function uploadInvoice(file: any, keyName: string, generateBuyerInvoice: boolean): Promise<any> {

    const S3Config = {
        apiversion: process.env.AWS_SES_API_VERSION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
    };

    try {
        let uploadParams = {
            Key: generateBuyerInvoice ? 'BuyerLeadInvoices/' + keyName : 'UserInvoices/' + keyName,
            Body: file,
            Bucket:  process.env.INVOICE_BUCKET ,
            ContentType: 'application/pdf'
        }
        return await new AWS.S3(S3Config).upload(uploadParams).promise()
        
    } catch (error) {
        console.log(error);
        return error;
    }

}


export async function downloadInvoice(keyName: string) {

    const S3Config = {
        apiversion: process.env.AWS_SES_API_VERSION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
    };

    try {
        let getSignedUrlParams = {
            Bucket: process.env.INVOICE_BUCKET,
            Key: keyName,
            Expires: 60 * 5
        }
        // return await new AWS.S3(S3Config).getObject(uploadParams).promise()
        return new AWS.S3(S3Config).getSignedUrl('getObject', getSignedUrlParams);

    } catch (error) {
        console.log(error);
        return error;
    }
}