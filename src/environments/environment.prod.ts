export const environment = {
  production: true,
  env: 'PROD',
  formBlobTokenUrl: 'https://default-webapp-endpoint-d734ecac-f4ftcbfqg4cxbpgb.a03.azurefd.net/api/generateSASToken',
  formBlobUrl: 'https://eformsbuilderforms-ct-cme9ahf4enbshwdr.a03.azurefd.net/',
  formBlobContainerName: 'forms-container',
  msalClientId: 'TBD', // From the app registration in Azure AD
  msalAuthority: 'https://login.microsoftonline.com/TBD', // Your Azure AD tenant ID
  authEnabled: false,
  feature: {
    xhtmlExt: true
  }
};
