import * as AWS from 'aws-sdk';

export const sendGreetingEmail = async (args: {
  firstName: string;
  lastName: string;
  email: string;
  activationURL: string;
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
            <div style="padding: 0 5% 1%;font-size: 1.1rem;letter-spacing: 0.5px;">
            <p>Dear ${args.firstName} ${args.lastName},  </p>
            <p>Welcome to Sakchha!</p>
            <p>You have successfully created a Sakchha account. To activate your account, please click "Activate Account" as below and begin your exciting journey with Sakchha. </p>
             <p style="text-align:center;cursor:pointer;"><a href=${args.activationURL}><input type="button" value="Activate Account" style="padding:0.5rem;background-color: #c19534;color:#ffffff;border:2px solid #c19534;border-radius: 7px;font-size: 1.2rem;"></a></p>
            <p>Thank You</p>
            <p>Sakchha Team</p>
            <p style="font-size:0.9rem;color:#808080">This email is an automated notification, which is unable to receive replies. Please reach out to us at <a href="mailto:info@sakchha.com">info@sakchha.com</a> should you have any questions or concerns.</p>
            </div>
        </div>
                `,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Activate Your Account',
      },
    },
  };
  try {
    await new AWS.SES(SESConfig).sendEmail(params).promise();
  } catch (err) {
    console.error('err at sending welcome email: ', err.message);
  }
};
