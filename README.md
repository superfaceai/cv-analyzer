# ats-cv-demo

Demo of ATS (Applicant Trancking System) integration.

This demo:
- loads CVs of Job candidates
- converts CVs to text
- parses CVs - the output is structured candidate data in json format
- updates candidate data in ATS system with data parsed from CV

Providers used in this demo:
- Breezy HR - ATS
- Cloudmersive - CV document conversion to text
- OpenAI - Text to structured candidate data

To run the demo:
1. `yarn install`
2. `cp .env.example .env`
3. set credentials for all providers in .env file
4. `yarn start`
