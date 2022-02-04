import { createHmac } from 'crypto';
import { RequestHash, ResponseHash } from '../dto/payment.dto';

export const generateRequestHashValue = async (
  requestHashParams: RequestHash,
) => {
  try {
    let paddedAmount: any =
      Math.round(Number(requestHashParams.amount) * 100) / 100;
    paddedAmount = ('000000000000' + paddedAmount * 100).slice(-12);
    let signatureString = String(process.env.PAYMENT_GATEWAY_ID).concat(
      requestHashParams.invoiceNo,
      paddedAmount,
      requestHashParams.currencyCode,
      'N',
    );

    let signedData = createHmac('sha1', process.env.MERCHANT_SECRET_KEY)
      .update(signatureString)
      .digest('hex')
      .toUpperCase();

    return signedData;
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const generateResponseHash = async (
  responseHashParams: ResponseHash,
) => {
  try {
    let signatureString = String(responseHashParams.paymentGatewayID).concat(
      responseHashParams.respCode,
      responseHashParams.fraudCode,
      responseHashParams.Pan,
      responseHashParams.Amount,
      responseHashParams.invoiceNo,
      responseHashParams.tranRef,
      responseHashParams.approvalCode,
      responseHashParams.Eci,
      responseHashParams.dateTime,
      responseHashParams.Status,
    );

    let signedData = createHmac('sha1', process.env.MERCHANT_SECRET_KEY)
      .update(signatureString)
      .digest('hex')
      .toUpperCase();

    return signedData;
  } catch (error) {
    console.log(error);
    return error;
  }
};
