export const documentFileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/msword' ||
    file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return cb(null, true);
  }
  req.fileValidationError = 'Unsupported file format.';
  return cb(null, false);
};

export const documentFileLimit = {
  files: 1,
  fileSize: 10 * 1024 * 1024, //5mb in bytes
};
