import * as v from 'valibot';

export const ActivateSchema = v.object({
  RegistrationGUID: v.pipe(v.string(), v.uuid('Invalid RegistrationGUID')),
  Secret: v.pipe(v.string(), v.minLength(1, 'Secret is required')),
  UserGUID: v.pipe(v.string(), v.uuid('Invalid UserGUID')),
});
