import * as Yup from 'yup';

const organizationBuyerSchema = Yup.object().shape({
  name: Yup.string()
    .min(
      3,
      'Organization name is too short - should me atleast 5 char minimum.',
    )
    .max(50, 'Organization name is too long.')
    .required('Organization name is required.')
    .nullable(),
  vatOrPan: Yup.string().required('Vat or Pan number is required.').nullable(),
  officeAddress1: Yup.string()
    .required("Office's primary Address is required.")
    .nullable(),
  officeAddress2: Yup.string().nullable().notRequired(),
  officeContactNumber: Yup.string()
    .min(5, `Office's contact number can't be less that 5 digits.`)
    .max(20, `Office's contact number can't be greater than 20 digits.`)
    .required("Office's contact number is required.")
    .nullable(),
  officeCity: Yup.string().required("Office's city is required").nullable(),
  officeZip: Yup.string().notRequired().nullable(),
  officeState: Yup.string().notRequired().nullable(),
  officeCountry: Yup.string()
    .required("Office's country is required.")
    .nullable(),
  officePayRate: Yup.number()
    .typeError("Office's pay rate must be a valid number.")
    .nullable(),
  officeBio: Yup.string()
    .min(10, 'Office"s bio is required')
    .max(
      5000,
      'Description is too long - should be atmost 5000 character long.',
    )
    // .required("Required.")
    .nullable(),
  firstName: Yup.string()
    .min(3, 'First name is too short - should me atleast 3 char minimum.')
    .max(50, 'First name is too long.')
    .required('First name is required.')
    .nullable(),
  lastName: Yup.string()
    .min(3, ' Last name is too short - should me atleast 3 char minimum.')
    .max(50, 'Last name is too long.')
    .required('Last name is required.')
    .nullable(),
  jobTitle: Yup.string()
    .max(150, 'Job title is too long - should be atmost 150 character long.')
    .required('Job title is required.')
    .nullable(),
  mobile: Yup.string()
    .min(5, `Mobile number can't be less that 5 digits.`)
    .max(20, `Mobile number can't be greater than 20 digits.`)
    .required('Mobile number is required.')
    .nullable(),
  address1: Yup.string().required('Address1 is required.').nullable(),
  address2: Yup.string().nullable().notRequired(),
  city: Yup.string().required('City is required').nullable(),
  zip: Yup.string().notRequired().nullable(),
  state: Yup.string().notRequired().nullable(),
  country: Yup.string().required('Country is required.').nullable(),
});

export default organizationBuyerSchema;
