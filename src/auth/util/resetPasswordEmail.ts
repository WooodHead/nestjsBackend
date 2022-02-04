import * as AWS from 'aws-sdk';

export const resetPasswordEmail = async (args: {
  firstName: string;
  lastName: string;
  email: string;
  resetURL: string;
}) => {
  const SESConfig = {
    apiversion: process.env.AWS_SES_API_VERSION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  };

  let params = {
    Source: 'no-reply@sakchha.com',
    Destination: {
      ToAddresses: [args.email],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `
     <div
        style="
        max-width:75%;
        background-color: rgba(243, 240, 236, 0.4);
        margin:0 auto;
        ">
            <div style="background-color: #782b8f;">
                <img
                src='https://sakchha.com/wp-content/uploads/2021/03/sakchha-logo.png'
                style="display:block;margin: 0 auto;height: 10%; width: 15%; padding: 1% 0 0.5% 0%;"
                alt="Sakchha Logo"
                />
            </div>
            <h1 style="text-align: center; color: #782b8f;font-size: 1.8rem;">Reset Password</h1>
            <div style="padding: 0 5% 1%;font-size: 1.1rem;letter-spacing: 0.5px;">
            <p>Hi ${args.firstName} ${args.lastName},  </p>
            <p>Please click on the button below to reset your password.</p>
            <p style="text-align: center;"><a href=${args.resetURL}><input type="button" value="Reset password" style="padding:0.5rem;background-color: #c19534;color:#ffffff;border:2px solid #c19534;border-radius: 7px;font-size: 1.2rem;"></a></p>
            <h4>If you didn&apos;t requested to reset your password, please change your password immediately.</h4>
            <p>-Sakchha Team</p>
            <p>* Please do not reply directly to this email.</br>
            For general questions about the Sakchha, visit <a href="https://sakchha.com" target="_blank">www.sakchha.com</a></p>
            </div>
        </div>
                `,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Sakchha - Password Reset',
      },
    },
  };
  try {
    await new AWS.SES(SESConfig).sendEmail(params).promise();
  } catch (err) {
    console.error('err at sending welcome email: ', err.message);
  }
};
