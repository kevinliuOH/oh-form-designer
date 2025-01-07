// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: true,
  env: 'CT',
  formBlobTokenUrl: 'https://default-webapp-endpoint-d734ecac-f4ftcbfqg4cxbpgb.a03.azurefd.net/api/generateSASToken',
  formBlobUrl: 'https://eformsbuilderforms-ct-cme9ahf4enbshwdr.a03.azurefd.net/',
  formBlobContainerName: 'forms-container',
  msalClientId: '67527f69-8a2c-4ff4-a03d-37a4cfa36ae5', // From the app registration in Azure AD
  msalAuthority: 'https://login.microsoftonline.com/4ef96c5c-d83f-466b-a478-816a5bb4af62', // Your Azure AD tenant ID
  authEnabled: true,
  feature: {
    xhtmlExt: true
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
