import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'GaasStorage',
  isDefault: true,
  access: (allow) => ({
    'files/{entity_id}/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ]
  })
});