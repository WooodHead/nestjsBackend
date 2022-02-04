import * as Yup from 'yup';

export const createLeadSchema = Yup.object().shape({
  lead_title: Yup.string()
    .min(10, 'Must be greater than 10 characters')
    .max(200, 'Max character exceeded, must be of less than 100 characters')
    .required('Title is required'),
  lead_description: Yup.string()
    .min(100, 'Must be greater than 100 characters')
    .max(
      100000,
      'Max character exceeded, must be of less than 100000 characters',
    )
    .required('Description is required'),
  payRate: Yup.number().required('Pay Rate is required'),
  payType: Yup.string().oneOf(['Hourly', 'Bulk']).required('Please Select one'),
  payCurrency: Yup.string().oneOf(['NPR', 'USD']).required('Please Select one'),
  skills: Yup.array()
    .of(
      Yup.object().shape({
        category: Yup.object().shape({
          name: Yup.string().required('Category is required'),
        }),
        subCategory: Yup.object().shape({
          name: Yup.string().required('Sub Category is required'),
        }),
        proficiency: Yup.object().shape({
          name: Yup.string().required('Proficiency is required'),
        }),
      }),
    )
    .min(1, 'Please add atleast 1 skill'),
  documents: Yup.array()
    .of(
      Yup.object().shape({
        document: Yup.string().notRequired(),
      }),
    )
    .max(10, 'You can upload upto 10 documents per lead only.'),
  referenceURL: Yup.string()
    .url('Must be a valid URL, for example https://example.com')
    .notRequired()
    .nullable(),
});
