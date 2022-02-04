export const saveLogs = (
  logger,
  at: string,
  err: any,
  userId?: string,
  leadId?: string,
) => {
  logger.error({
    time: new Date(),
    at,
    err,
    userId,
    leadId,
  });
};
