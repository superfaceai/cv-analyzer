const { getProviderPerformOptions } = require('./sdk_config');

exports.getCVUrl = async (sdk, provider, candidateId) => {
  try {
    const getCVProfile = await sdk.getProfile('recruitment/get-cv@1.0.0');
    const getCVResult = await getCVProfile.getUseCase('GetCV').perform(
      {
        candidateId,
      },
      getProviderPerformOptions(provider)
    );
    return getCVResult.unwrap().cv.documentUrl;
  } catch (error) {
    console.error('Failed to get candidate CV.');
    return;
  }
};
