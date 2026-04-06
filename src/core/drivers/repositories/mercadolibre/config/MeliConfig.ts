type MeliAuthConfig = {
  url: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
};

const toEnvSegment = (appKey: string): string =>
  appKey.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();

const getEnv = (name: string): string | undefined => {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : undefined;
};

export const MeliConfig = {
  getAuthConfig(appKey = 'default'): MeliAuthConfig {
    if (appKey === 'default') {
      return {
        url: process.env.MELI_AUTH_URL!,
        clientId: process.env.MELI_CLIENT_ID!,
        clientSecret: process.env.MELI_CLIENT_SECRET!,
        redirectUri: process.env.MELI_REDIRECT_URI,
      };
    }

    const envSegment = toEnvSegment(appKey);
    const authUrl =
      getEnv(`MELI_${envSegment}_AUTH_URL`) ?? process.env.MELI_AUTH_URL!;
    const clientId = getEnv(`MELI_${envSegment}_CLIENT_ID`);
    const clientSecret = getEnv(`MELI_${envSegment}_CLIENT_SECRET`);
    const redirectUri =
      getEnv(`MELI_${envSegment}_REDIRECT_URI`) ?? process.env.MELI_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      throw new Error(
        `Missing Mercado Libre credentials for app "${appKey}". Expected envs MELI_${envSegment}_CLIENT_ID and MELI_${envSegment}_CLIENT_SECRET`,
      );
    }

    return {
      url: authUrl,
      clientId,
      clientSecret,
      redirectUri,
    };
  },
  api: {
    baseUrl: 'https://api.mercadolibre.com',
    timeout: 30000,
  },
};
