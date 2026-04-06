const toEnvSegment = (appKey: string): string =>
  appKey.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();

export const getMeliSellerId = (appKey = 'default'): string => {
  const sellerId =
    appKey === 'default'
      ? process.env.MELI_SELLER_ID
      : process.env[`MELI_${toEnvSegment(appKey)}_SELLER_ID`];

  if (!sellerId) {
    if (appKey === 'default') {
      throw new Error('MELI_SELLER_ID is not defined');
    }

    throw new Error(
      `MELI_${toEnvSegment(appKey)}_SELLER_ID is not defined for app "${appKey}"`,
    );
  }

  return sellerId;
};
