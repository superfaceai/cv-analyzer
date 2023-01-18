const { SuperfaceClient } = require('@superfaceai/one-sdk');
const { inspect } = require('util');

const { chooseOne } = require('./choose_one');
const {
  WORKABLE_PROVIDER,
  CLOUDMERSIVE_PROVIDER,
  OPENAI_PROVIDER,
} = require('./sdk_config');
const {
  getCVUrl,
  analyzeCV,
  updateCandidate,
  listCandidates,
  listJobs,
  convertCVToText,
} = require('./use_cases');

const sdk = new SuperfaceClient();
const atsProvider = WORKABLE_PROVIDER;
const convertDocToTextProvider = CLOUDMERSIVE_PROVIDER;
const textCompletionProvider = OPENAI_PROVIDER;

async function run() {
  // #1 - List open job positions from your ATS system

  let jobs = await listJobs(sdk, atsProvider);

  if (!jobs) return;

  if (jobs.length === 0) {
    console.log('No open job positions.');
    return;
  }

  let jobId = await chooseOne(
    'Pick job position',
    jobs.map(job => {
      return {
        name: job.name,
        value: job.id,
      };
    })
  );

  if (!jobId) {
    return;
  }

  // #2 - List candidates that applied to the open job position

  let candidates = await listCandidates(sdk, atsProvider, jobId);

  if (!candidates) return;

  if (candidates.length === 0) {
    console.log('No candidates applied for the job position.');
    return;
  }

  let candidateId = await chooseOne(
    'Pick candidate',
    candidates.map(candidate => {
      return {
        name: candidate.name,
        value: candidate.id,
      };
    })
  );

  if (!candidateId) {
    return;
  }

  // #3 - Get candidate CV

  let cvDocumentUrl = await getCVUrl(sdk, atsProvider, candidateId);

  if (!cvDocumentUrl) {
    return;
  }

  // #4 - Convert CV to plain text

  let cvText = await convertCVToText(
    sdk,
    convertDocToTextProvider,
    cvDocumentUrl
  );
  cvText = cvText.replace(/(?:\r\n|\r|\n)/g, ' ');

  if (!cvText) {
    return;
  }

  // #5 - Analyze the CV

  const analyzedCV = await analyzeCV(sdk, textCompletionProvider, cvText);

  if (!analyzedCV) {
    return;
  }

  console.log('Analyzed CV: ', inspect(analyzedCV, false, 15, true));

  const continueAndUpdateCandidate = await chooseOne(
    `Do you want to update candidate data in ${atsProvider} ATS`,
    [
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ]
  );

  if (!continueAndUpdateCandidate) {
    console.debug('Candidate data not updated.');
    return;
  }

  // #7 - Update candidate data in ATS

  const updated = await updateCandidate(sdk, atsProvider, {
    candidateId,
    ...analyzedCV,
  });

  if (updated) {
    console.log('🎉 Candidate data successfully updated.');
  }
}

run();
