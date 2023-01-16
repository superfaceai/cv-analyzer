const { getProviderPerformOptions } = require('./sdk_config');

exports.listJobs = async (sdk, provider) => {
  try {
    const listJobsProfile = await sdk.getProfile('recruitment/list-jobs@1.0.0');
    const listJobsResult = await listJobsProfile
      .getUseCase('ListJobs')
      .perform({}, getProviderPerformOptions(provider));
    return listJobsResult.unwrap().jobs;
  } catch (error) {
    console.error('Failed to list jobs');
    return;
  }
};
