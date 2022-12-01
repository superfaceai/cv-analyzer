const { SuperfaceClient } = require('@superfaceai/one-sdk');
const fs = require('fs');
const { inspect } = require('util');
require('dotenv').config();

const sdk = new SuperfaceClient();

async function run() {
  //******************* Get Breezy HR access token *******************

  const authProfile = await sdk.getProfile(
    'authentication/username-password-login'
  );

  const authResult = await authProfile
    .getUseCase('GetAccessTokenByUsernamePassword')
    .perform(
      {
        username: process.env.BREEZY_HR_USERNAME,
        password: process.env.BREEZY_HR_PASSWORD,
      },
      {
        provider: 'breezy-hr',
      }
    );

  let accessToken;
  try {
    accessToken = authResult.unwrap().accessToken;
  } catch (error) {
    console.error('Failed to get access token', error);

    return;
  }

  //****************** List companies ******************

  const atsCompanyProfile = await sdk.getProfile('ats/company');

  const listCompaniesResult = await atsCompanyProfile
    .getUseCase('ListCompanies')
    .perform(
      {},
      {
        provider: 'breezy-hr',
        parameters: {
          ACCESS_TOKEN: accessToken,
        },
      }
    );

  let companies = [];
  try {
    companies = listCompaniesResult.unwrap().companies;
    console.log('companies:', companies);
  } catch (error) {
    console.error('Failed to list companies', error);

    return;
  }

  const companyId = companies[0].id;

  //****************** List jobs ******************

  const atsJobProfile = await sdk.getProfile('ats/job');

  const listJobsResult = await atsJobProfile.getUseCase('ListJobs').perform(
    {},
    {
      provider: 'breezy-hr',
      parameters: {
        ACCESS_TOKEN: accessToken,
        COMPANY_ID: companyId,
      },
    }
  );

  let jobs = [];
  try {
    jobs = listJobsResult.unwrap().jobs;
    console.log('jobs:', jobs);
  } catch (error) {
    console.error('Failed to list jobs', error);

    return;
  }

  const jobId = jobs[0].id;

  //****************** List candidates ******************

  const atsCandidateProfile = await sdk.getProfile('ats/candidate');

  const listCandidatesResult = await atsCandidateProfile
    .getUseCase('ListCandidates')
    .perform(
      {
        jobId: jobId,
      },
      {
        provider: 'breezy-hr',
        parameters: {
          ACCESS_TOKEN: accessToken,
          COMPANY_ID: companyId,
        },
      }
    );

  let candidates = [];
  try {
    candidates = listCandidatesResult.unwrap().candidates.map(candidate => {
      return {
        entity: candidate,
      };
    });
    console.log('candidates:', candidates);
  } catch (error) {
    console.error('Failed to list candidates', error);
  }

  //****************** Get candidate CVs ******************

  candidates = await Promise.all(
    candidates.map(async candidate => {
      const candidateCVResult = await atsCandidateProfile
        .getUseCase('GetCV')
        .perform(
          {
            jobId: jobId,
            candidateId: candidate.entity.id,
          },
          {
            provider: 'breezy-hr',
            parameters: {
              ACCESS_TOKEN: accessToken,
              COMPANY_ID: companyId,
            },
          }
        );

      try {
        candidate.cv = await candidateCVResult.unwrap();
      } catch (error) {
        console.error('Failed to get candidate CV', error);
      }

      return candidate;
    })
  );

  //****************** Convert candidate CVs to text ******************

  const convertDocToTextProfile = await sdk.getProfile(
    'conversion/doc-to-text'
  );

  candidates = await Promise.all(
    candidates.map(async candidate => {
      const cvTextResult = await convertDocToTextProfile
        .getUseCase('ConvertDocumentToText')
        .perform(
          {
            content: candidate.cv.fileContent,
            name: candidate.cv.fileName,
          },
          {
            provider: 'cloudmersive',
          }
        );

      try {
        candidate.cv.text = cvTextResult.unwrap().text.replace('\r\n', ' ');

        return candidate;
      } catch (error) {
        console.error('Failed to convert candidate CV', error);
      }
      return candidate;
    })
  );

  //****************** Get structured candidate CV ******************

  const completionProfile = await sdk.getProfile('ai/completion');

  const promptCommand =
    'Parse following job applicant resume and return json object with properties { "firstName", "lastName", "address", "phone", "education": [{"schoolName", "fieldOfStudy"}] , "workHistory": [{"companyName", "title", "summary", "startDate":{"month": number, "year": number}, "endDate":{"month":number, "year":number}}] }. ';
  candidates = await Promise.all(
    candidates.map(async candidate => {
      try {
        if (candidate.cv.text) {
          const promptResult = await completionProfile
            .getUseCase('CreateCompletion')
            .perform(
              {
                model: 'text-davinci-003',
                maxTokens: 2000,
                prompt: promptCommand + candidate.cv.text,
              },
              {
                provider: 'openai',
              }
            );
          candidate.cv.jsonString = promptResult.unwrap().text;
          candidate.cv.json = JSON.parse(candidate.cv.jsonString);
        } else {
          console.error('Cadidate CV text not found');
        }
      } catch (error) {
        console.error('Failed to parse candidate CV', error);
      }

      return candidate;
    })
  );

  //****************** Update candidates in Breezy HR ATS ******************

  await Promise.all(
    candidates.map(async candidate => {
      try {
        const candidateToUpdate = {
          id: candidate.entity.id,
          ...candidate.cv.json,
        };
        console.debug(
          'Updating candidate',
          inspect(
            candidateToUpdate,
            (showHidden = false),
            (depth = 3),
            (colorize = true)
          )
        );
        const updateCandidateResult = await atsCandidateProfile
          .getUseCase('UpdateCandidate')
          .perform(
            {
              jobId: jobId,
              candidate: candidateToUpdate,
            },
            {
              provider: 'breezy-hr',
              parameters: {
                ACCESS_TOKEN: accessToken,
                COMPANY_ID: companyId,
              },
            }
          );

        const updatedCandidate = await updateCandidateResult.unwrap();

        console.debug(
          'Candidate updated',
          inspect(
            updatedCandidate,
            (showHidden = false),
            (depth = 3),
            (colorize = true)
          )
        );
      } catch (error) {
        console.error('Failed to get candidate CV', error);
      }
    })
  );
}

run();
