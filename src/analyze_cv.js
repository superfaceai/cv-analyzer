const { getProviderPerformOptions } = require('./sdk_config');

exports.analyzeCV = async (sdk, provider, cvText) => {
  try {
    const generateTextProfile = await sdk.getProfile('ai/generate-text@1.0.0');

    const promptCommand =
      'Parse following job applicant resume and return json object with properties { "firstName", "lastName", "address", "phone", "education": [{"school", "fieldOfStudy"}] , "workHistory": [{"company", "position", "summary", "startedAt_ISO8601":"YYYY-MM-DD", "endedAt_ISO8601":"YYYY-MM-DD"}] }. ';

    const result = await generateTextProfile.getUseCase('CompleteText').perform(
      {
        prompt: promptCommand + cvText,
        creativity: 0.8,
        approxMaxWords: 1000,
        model: 'large',
      },
      getProviderPerformOptions(provider)
    );

    analyzeCVOutcome = result.unwrap();
  } catch (error) {
    console.error('Failed to analyze CV.', error);
  }

  if (!analyzeCVOutcome?.completions.length) {
    console.error('No outcome from CV analysis.');
    return;
  }

  try {
    return JSON.parse(analyzeCVOutcome.completions[0]);
  } catch {
    console.error('Failed to parse text completion outcome to JSON');
  }
};
