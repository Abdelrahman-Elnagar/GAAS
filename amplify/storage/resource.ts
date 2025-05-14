import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'GaasStorage',
  access: (allow) => ({
    'files/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ]
  })
});