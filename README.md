# CV Analyzer Demo

This demo application loads CV of candidate from ATS (Applicant Tracking System) who have applied for a given job, converts it to text, parses it into machine-readable data, and then updates candidate in the ATS with the data obtained from the CV.

Providers used in this demo:

- Workable - for ATS related use cases
- Cloudmersive - for the conversion of document to plain text
- OpenAI - for the GPT text completion

To run the demo:
1. `yarn install`
2. `cp .env.example .env`
3. set credentials and parameters for all providers in .env file
4. `npm start`
