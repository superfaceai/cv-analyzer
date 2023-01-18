const { SuperfaceClient } = require('@superfaceai/one-sdk');
const dotenv = require('dotenv');
const { inspect } = require('util');

const { chooseOne } = require('./choose_one');
const {
  getCVUrl,
  analyzeCV,
  updateCandidate,
  listCandidates,
  listJobs,
  convertCVToText,
} = require('./use_cases');

dotenv.config();

const sdk = new SuperfaceClient();

const atsProviderOptions = {
  provider: 'workable',
  parameters: {
    SUBDOMAIN: process.env.WORKABLE_SUBDOMAIN || 'subdomain',
  },
  security: {
    bearer_token: {
      token: process.env.WORKABLE_TOKEN,
    },
  },
}

const textCompletionProviderOptions = {
  provider:  'openai',
  security: {
    bearer: {
      token: process.env.OPENAI_SECRET_KEY,
    },
  },
};

const convertDocToTextProviderOptions = {
  provider: 'cloudmersive',
  parameters: {
    API_INSTANCE: 'testapi',
  },
  security: {
    apikey: {
      apikey: process.env.CLOUDMERSIVE_API_KEY,
    },
  },
};



async function run() {
  // #1 - List open job positions from your ATS system

  let jobs = await listJobs(sdk, atsProviderOptions);

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

  let candidates = await listCandidates(sdk, atsProviderOptions, jobId);

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

  let cvDocumentUrl = await getCVUrl(sdk, atsProviderOptions, candidateId);

  if (!cvDocumentUrl) {
    return;
  }

  // #4 - Convert CV to plain text

  let cvText = await convertCVToText(
    sdk,
    convertDocToTextProviderOptions,
    cvDocumentUrl
  );
  cvText = cvText.replace(/(?:\r\n|\r|\n)/g, ' ');

  if (!cvText) {
    return;
  }

  // #5 - Analyze the CV

  const analyzedCV = await analyzeCV(sdk, textCompletionProviderOptions, cvText);

  if (!analyzedCV) {
    return;
  }

  console.log('Analyzed CV: ', inspect(analyzedCV, false, 15, true));

  const continueAndUpdateCandidate = await chooseOne(
    `Do you want to update candidate data in ${atsProviderOptions.provider} ATS`,
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

  const updated = await updateCandidate(sdk, atsProviderOptions, {
    candidateId,
    ...analyzedCV,
  });

  if (updated) {
    console.log('🎉 Candidate data successfully updated.');
  }
}

run();
