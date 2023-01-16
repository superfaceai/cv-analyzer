const dotenv = require('dotenv');

dotenv.config();

const WORKABLE_PROVIDER = 'workable';
const OPENAI_PROVIDER = 'openai';
const CLOUDMERSIVE_PROVIDER = 'cloudmersive';

exports.WORKABLE_PROVIDER = WORKABLE_PROVIDER;
exports.OPENAI_PROVIDER = OPENAI_PROVIDER;
exports.CLOUDMERSIVE_PROVIDER = CLOUDMERSIVE_PROVIDER;

exports.getProviderPerformOptions = provider => {
  switch (provider) {
    case WORKABLE_PROVIDER:
      return WORKABLE_PERFORM_OPTIONS;
    case CLOUDMERSIVE_PROVIDER:
      return CLOUDMESIVE_PERFORM_OPTIONS;
    case OPENAI_PROVIDER:
      return OPENAI_PERFORM_OPTIONS;
    default:
      throw new Error(`Provider ${provider} not supported.`);
  }
};

const WORKABLE_PERFORM_OPTIONS = {
  provider: WORKABLE_PROVIDER,
  parameters: {
    SUBDOMAIN: process.env.WORKABLE_SUBDOMAIN || 'subdomain',
  },
  security: {
    bearer_token: {
      token: process.env.WORKABLE_TOKEN,
    },
  },
};

const CLOUDMESIVE_PERFORM_OPTIONS = {
  provider: CLOUDMERSIVE_PROVIDER,
  parameters: {
    API_INSTANCE: 'testapi',
  },
  security: {
    apikey: {
      apikey: process.env.CLOUDMERSIVE_API_KEY,
    },
  },
};

const OPENAI_PERFORM_OPTIONS = {
  provider: OPENAI_PROVIDER,
  security: {
    bearer: {
      token: process.env.OPENAI_SECRET_KEY,
    },
  },
};
