import * as Yup from 'yup';

import { userTypeEnum } from '../type/userType';
import { profileTypeEnum } from '../type/profileType';

const registerSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, 'Firstname is too short - should me atleast 3 char minimum.')
    .max(50, 'Firstname is too long.')
    .required('Firstname is required.'),
  lastName: Yup.string()
    .min(2, ' Lastname is too short - should me atleast 3 char minimum.')
    .max(50, 'Lastname is too long.')
    .required('Lastname is required.'),
  email: Yup.string()
    .email()
    .min(7, 'Email is too short - should be atleast 7 char minimum.')
    .max(46, 'Email is too long.')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password is too short - shoule be atleast 8 char minimum.')
    .max(50, 'Password too long.')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$&+,:;=?@#|'"<>.^*()$[\]{}\_\/\\~%!`-])[A-Za-z\d$&+,:;=?@#|'"<>.^*()$[\]\\{}\_\/~%!`-]{8,50}$/,
      'Password must have one uppercase letter, one lowercase letter, one number and one special character.',
    )
    .required('Password is required'),
  userType: Yup.mixed().oneOf([userTypeEnum.Buyer, userTypeEnum.Provider]),
  profileType: Yup.mixed().oneOf([
    profileTypeEnum.Individual,
    profileTypeEnum.Organization,
  ]),
  organization: Yup.string().when('profileType', {
    is: profileTypeEnum.Organization,
    then: Yup.string()
      .required('Organization name is required.')
      .min(
        4,
        'Organization name is too short - should be atleast 5 char minimum.',
      )
      .max(50, 'Organization name is too long.'),
    otherwise: Yup.string(),
  }),
});

export default registerSchema;
