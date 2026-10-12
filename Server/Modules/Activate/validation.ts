import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

export const ActivateSchema = v.object({
  RegistrationGUID: v.pipe(v.string(), v.uuid(message('validation_registration_guid'))),
  Secret: v.pipe(v.string(), v.minLength(1, message('validation_secret_required'))),
  UserGUID: v.pipe(v.string(), v.uuid(message('validation_user_guid'))),
});
