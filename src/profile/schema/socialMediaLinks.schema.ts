import * as yup from 'yup';

export const socialMediaLinks = yup.object().shape({
  linkedin: yup.string().notRequired(),
  facebook: yup.string().notRequired(),
  instagram: yup.string().notRequired(),
  github: yup.string().notRequired(),
});
