import { Amplify } from 'aws-amplify';
import { parseAmplifyConfig } from "aws-amplify/utils";
import outputs from '../amplify_outputs.json';

const amplifyConfig = parseAmplifyConfig(outputs);

Amplify.configure({
  ...amplifyConfig,
  Interactions: {
    LexV2: {
      'TaskManagerBot': {
        aliasId: 'dev',
        botId: '91XOFTPOTQ',
        localeId: 'en_GB',
        region: 'eu-central-1'
      }
    }
  }
}); 