import { GetValidMeliAccessTokenInteractor } from './GetValidMeliAccessTokenInteractor';

describe('GetValidMeliAccessTokenInteractor', () => {
  const expiredToken = {
    access_token: 'APP_USR-old-token-xxxxxxxxxxxxxxxxxxxx',
    refresh_token: 'TG-old',
    expires_in: 21600,
    expires_at: new Date(Date.now() - 1000),
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('refreshes only once for concurrent requests on the same appKey', async () => {
    const tokenRepository = {
      getToken: jest.fn().mockResolvedValue(expiredToken),
      saveToken: jest.fn(),
      updateToken: jest.fn().mockResolvedValue(undefined),
    };
    const authRepository = {
      refreshToken: jest.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  access_token: 'APP_USR-new-token-xxxxxxxxxxxxxxxxxxxx',
                  refresh_token: 'TG-new',
                  expires_in: 21600,
                  expires_at: new Date(Date.now() + 21600 * 1000),
                }),
              20,
            ),
          ),
      ),
    };

    const interactor = new GetValidMeliAccessTokenInteractor(
      tokenRepository as never,
      authRepository as never,
    );

    const tokens = await Promise.all([
      interactor.execute('default'),
      interactor.execute('default'),
      interactor.execute('default'),
    ]);

    expect(authRepository.refreshToken).toHaveBeenCalledTimes(1);
    expect(tokenRepository.updateToken).toHaveBeenCalledTimes(1);
    expect(new Set(tokens)).toEqual(
      new Set(['APP_USR-new-token-xxxxxxxxxxxxxxxxxxxx']),
    );
  });
});
