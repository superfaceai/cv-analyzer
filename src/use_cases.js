const fetch = require('node-fetch');
const { BinaryData } = require('@superfaceai/one-sdk');

exports.listCandidates = async (sdk, providerOptions, jobId) => {
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
        providerOptions
      );
    return listCandidatesResult.unwrap().candidates;
  } catch (error) {
    console.error('Failed to list candidates', error);
    return;
  }
};

exports.listJobs = async (sdk, providerOptions) => {
  try {
    const listJobsProfile = await sdk.getProfile('recruitment/list-jobs@1.0.0');
    const listJobsResult = await listJobsProfile
      .getUseCase('ListJobs')
      .perform({}, providerOptions);
    return listJobsResult.unwrap().jobs;
  } catch (error) {
    console.error('Failed to list jobs');
    return;
  }
};

exports.getCVUrl = async (sdk, providerOptions, candidateId) => {
  try {
    const getCVProfile = await sdk.getProfile('recruitment/get-cv@1.0.0');
    const getCVResult = await getCVProfile.getUseCase('GetCV').perform(
      {
        candidateId,
      },
      providerOptions
    );
    return getCVResult.unwrap().cv.documentUrl;
  } catch (error) {
    console.error('Failed to get candidate CV.');
    return;
  }
};

exports.convertCVToText = async (sdk, providerOptions, cvDocumentUrl) => {
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
        providerOptions
      );

    return result.unwrap().text;
  } catch (error) {
    console.error('Failed to convert CV to plain text.', error);
  }
};

exports.analyzeCV = async (sdk, providerOptions, cvText) => {
  try {
    const generateTextProfile = await sdk.getProfile('ai/generate-text@1.0.0');

    const promptCommand =
      'Parse following job applicant resume and return json object with properties { "firstName", "lastName", "address", "phone", "education": [{"school", "fieldOfStudy", "studiedFrom_ISO8601":"YYYY-MM-DD", "studiedTill_ISO8601":"YYYY-MM-DD"}] , "workHistory": [{"company", "position", "summary", "workedFrom_ISO8601:"YYYY-MM-DD"", "workedTill_ISO8601":"YYYY-MM-DD"}] }. ';

    const result = await generateTextProfile.getUseCase('CompleteText').perform(
      {
        prompt: promptCommand + cvText,
        creativity: 0.8,
        approxMaxWords: 1000,
        model: 'large',
      },
      providerOptions
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
    const parsedCV = JSON.parse(analyzeCVOutcome.completions[0]);
    const mappedCV = {
      ...parsedCV,
      education: parsedCV.education?.map(school => {
        return {
          school: school.school,
          degree: school.degree,
          fieldOfStudy: school.fieldOfStudy,
          startedAt: school.studiedFrom_ISO8601,
          endedAt: school.studiedTill_ISO8601,
        };
      }),
      workHistory: parsedCV.workHistory?.map(work => {
        return {
          company: work.company,
          position: work.position,
          summary: work.summary,
          startedAt: work.workedFrom_ISO8601,
          endedAt: work.workedTill_ISO8601,
        };
      }),
    };

    return mappedCV;
  } catch (error) {
    console.error('Failed to parse text completion outcome to JSON', error);
  }
};

exports.updateCandidate = async (sdk, providerOptions, candidate) => {
  try {
    const profile = await sdk.getProfile('recruitment/update-candidate@1.0.0');

    const result = await profile
      .getUseCase('UpdateCandidate')
      .perform(candidate, providerOptions);

    result.unwrap();

    return true;
  } catch (error) {
    console.error('Failed to update candidate data.', error);
    return false;
  }
};
