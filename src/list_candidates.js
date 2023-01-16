const { getProviderPerformOptions } = require('./sdk_config');

exports.listCandidates = async (sdk, provider, jobId) => {
  try {
    const listCandidatesProfile = await sdk.getProfile(
      'recruitment/list-candidates@1.0.0'
    );
    const listCandidatesResult = await listCandidatesProfile
      .getUseCase('ListCandidates')
      .perform(
        {
          jobId,
        },
        getProviderPerformOptions(provider)
      );
    return listCandidatesResult.unwrap().candidates;
  } catch (error) {
    console.error('Failed to list candidates');
    return;
  }
};
