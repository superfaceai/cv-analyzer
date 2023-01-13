import { BinaryData, SuperfaceClient } from '@superfaceai/one-sdk';
import { inspect } from 'util';

import dotenv from 'dotenv';
import { chooseOne } from './choose-one';
import fetch from 'node-fetch';

dotenv.config();

const ATS_PROVIDER = 'workable';

const WORKABLE_PERFORM_OPTIONS = {
  provider: ATS_PROVIDER,
  parameters: {
    SUBDOMAIN: process.env.WORKABLE_SUBDOMAIN || 'subdomain',
  },
  security: {
    bearer_token: {
      token: process.env.WORKABLE_TOKEN,
    },
  },
};

const sdk = new SuperfaceClient();

async function run() {
  // #1 - List open job positions from your ATS system
  let jobs = [];
  try {
    const listJobsProfile = await sdk.getProfile('recruitment/list-jobs@1.0.0');
    const listJobsResult = await listJobsProfile
      .getUseCase('ListJobs')
      .perform({}, WORKABLE_PERFORM_OPTIONS);
    jobs = (
      listJobsResult.unwrap() as {
        jobs: [
          {
            id: string;
            name: string;
          }
        ];
      }
    ).jobs;
  } catch (error) {
    console.error('Failed to list jobs');
    return;
  }

  if (jobs.length <= 0) {
    console.log('No open job positions.');
    return;
  }

  let jobId = await chooseOne<string>(
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

  let candidates = [];
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
        WORKABLE_PERFORM_OPTIONS
      );
    candidates = (
      listCandidatesResult.unwrap() as {
        candidates: [
          {
            id: string;
            name: string;
          }
        ];
      }
    ).candidates;
  } catch (error) {
    console.error('Failed to list candidates');
    return;
  }

  if (candidates.length <= 0) {
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

  let cvDocumentUrl;
  try {
    const getCVProfile = await sdk.getProfile('recruitment/get-cv@1.0.0');
    const getCVResult = await getCVProfile.getUseCase('GetCV').perform(
      {
        candidateId,
      },
      WORKABLE_PERFORM_OPTIONS
    );
    cvDocumentUrl = (getCVResult.unwrap() as { cv: { documentUrl: string } }).cv
      .documentUrl;
  } catch (error) {
    console.error('Failed to get candidate CV.');
    return;
  }

  // #4 - Convert CV to plain text

  const docToTextProfile = await sdk.getProfile(
    'file-conversion/doc-to-text@1.0.0'
  );

  let cvText;
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
        {
          provider: 'cloudmersive',
          parameters: {
            API_INSTANCE: 'testapi',
          },
          security: {
            apikey: {
              apikey: process.env.CLOUDMERSIVE_API_KEY,
            },
          },
        }
      );

    cvText = (result.unwrap() as { text: string }).text;
  } catch (error) {
    console.error('Failed to convert CV to plain text.');
  }

  // #5 - Analyze the CV

  let analyzeCVOutcome;
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
      {
        provider: 'openai',
        security: {
          bearer: {
            token: process.env.OPENAI_SECRET_KEY,
          },
        },
      }
    );

    analyzeCVOutcome = result.unwrap() as { completions: string[] };
  } catch (error) {
    console.error('Failed to analyze CV.', error);
  }

  if (!analyzeCVOutcome?.completions.length) {
    console.error('No outcome from CV analysis.');
    return;
  }

  // #6 - Parse text completion outcome to JSON

  let analyzedCVJson: {
    firstName: string;
    lastName: string;
    address: string;
    phone: string;
    education: [{ schoolName: string; fieldOfStudy: string }];
    workHistory: [
      {
        companyName: string;
        title: string;
        summary: string;
        startedAt: string;
        endedAt: string;
      }
    ];
  };

  try {
    analyzedCVJson = JSON.parse(analyzeCVOutcome.completions[0]);
  } catch {
    console.error('Failed to parse text completion outcome to JSON');
    return;
  }

  console.log('Analyzed CV: ', inspect(analyzedCVJson, false, 15, true));

  const continueAndUpdateCandidate = await chooseOne<boolean>(
    `Do you want to update candidate data in ${ATS_PROVIDER} ATS`,
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

  try {
    const profile = await sdk.getProfile('recruitment/update-candidate@1.0.0');

    const result = await profile.getUseCase('UpdateCandidate').perform(
      {
        candidateId: candidateId,
        ...analyzedCVJson,
      },
      WORKABLE_PERFORM_OPTIONS
    );

    result.unwrap();
  } catch (error) {
    console.error('Failed to update candidate data.', error);
    return;
  }

  console.log('🎉 Candidate data successfully updated.');
}

run();
