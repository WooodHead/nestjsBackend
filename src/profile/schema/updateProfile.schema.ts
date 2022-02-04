import * as Yup from 'yup';

const updateProfileSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, 'Firstname is too short - should me atleast 3 char minimum.')
    .max(50, 'Firstname is too long.')
    .required('Firstname is required.'),
  lastName: Yup.string()
    .min(2, ' Lastname is too short - should me atleast 3 char minimum.')
    .max(50, 'Lastname is too long.')
    .required('Lastname is required.'),
  dob: Yup.date().required('Date of birth is required.'),
  mobile: Yup.string()
    .min(10, `Mobile number can't be less that 10 digits.`)
    .max(20, `Mobile number can't be greater than 20 digits.`)
    .required('Mobile number is required.'),
  address1: Yup.string().required('Address1 is required.'),
  address2: Yup.string()
    .transform(function (value, orginalValue) {
      return value == '' ? null : value;
    })
    .notRequired()
    .nullable(),
  city: Yup.string().required('City is required'),
  zip: Yup.string().notRequired(),
  state: Yup.string().notRequired(),
  country: Yup.string().required('Country is required.'),
  // payRate: Yup.number()
  //   .typeError('The pay rate must be a valid number.')
  //   .default(0),
  totalEmployees: Yup.number(),
});

export default updateProfileSchema;
