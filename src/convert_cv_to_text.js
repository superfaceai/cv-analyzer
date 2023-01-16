const fetch = require('node-fetch');
const { BinaryData } = require('@superfaceai/one-sdk');

const { getProviderPerformOptions } = require('./sdk_config');

exports.convertCVToText = async (sdk, provider, cvDocumentUrl) => {
  const docToTextProfile = await sdk.getProfile(
    'file-conversion/doc-to-text@1.0.0'
  );

  try {
    const fetchDocumentResponse = await fetch(cvDocumentUrl);

    if (!fetchDocumentResponse.body) {
      console.error('Failed to fetch CV document.');
      return;
    }

    const result = await docToTextProfile
      .getUseCase('ConvertDocumentToText')
      .perform(
        {
          fileName: 'cv.pdf',
          content: BinaryData.fromStream(fetchDocumentResponse.body),
        },
        getProviderPerformOptions(provider)
      );

    return result.unwrap().text;
  } catch (error) {
    console.error('Failed to convert CV to plain text.', error);
  }
};
