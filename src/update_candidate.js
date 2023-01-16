const { getProviderPerformOptions } = require('./sdk_config');

exports.updateCandidate = async (sdk, provider, candidate) => {
  try {
    const profile = await sdk.getProfile('recruitment/update-candidate@1.0.0');

    const result = await profile
      .getUseCase('UpdateCandidate')
      .perform(candidate, getProviderPerformOptions(provider));

    result.unwrap();

    return true;
  } catch (error) {
    console.error('Failed to update candidate data.', error);
    return false;
  }
};
