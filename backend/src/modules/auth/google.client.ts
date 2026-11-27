import { createHash, randomBytes } from 'node:crypto'

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

export interface GoogleProfile {
  // Identificador permanente da conta Google ("sub").
  googleId: string
  email: string
  emailVerified: boolean
  name: string | null
  picture: string | null
}

// Fluxo "authorization code" com PKCE. Os testes usam uma versão falsa.
export interface GoogleOAuthClient {
  buildAuthorizationUrl(params: { state: string; codeVerifier: string }): string
  fetchProfile(params: {
    code: string
    codeVerifier: string
  }): Promise<GoogleProfile>
}

export class GoogleOAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoogleOAuthError'
  }
}

export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url')
}

function codeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export interface GoogleClientOptions {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function createGoogleOAuthClient(
  options: GoogleClientOptions,
): GoogleOAuthClient {
  return {
    buildAuthorizationUrl({ state, codeVerifier }) {
      const url = new URL(AUTHORIZE_URL)
      url.search = new URLSearchParams({
        client_id: options.clientId,
        redirect_uri: options.redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        code_challenge: codeChallenge(codeVerifier),
        code_challenge_method: 'S256',
        prompt: 'select_account',
      }).toString()

      return url.toString()
    },

    async fetchProfile({ code, codeVerifier }) {
      // Troca o código pelo access token. A resposta vem direto do Google por
      // HTTPS e exige o client secret, então o perfil retornado é confiável.
      const tokenResponse = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: options.clientId,
          client_secret: options.clientSecret,
          redirect_uri: options.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        }),
      })

      if (!tokenResponse.ok) {
        throw new GoogleOAuthError(
          `Falha ao trocar o código do Google (HTTP ${tokenResponse.status}).`,
        )
      }

      const { access_token: accessToken } = (await tokenResponse.json()) as {
        access_token?: string
      }

      if (!accessToken) {
        throw new GoogleOAuthError('O Google não devolveu o access token.')
      }

      const profileResponse = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!profileResponse.ok) {
        throw new GoogleOAuthError(
          `Falha ao ler o perfil do Google (HTTP ${profileResponse.status}).`,
        )
      }

      const profile = (await profileResponse.json()) as {
        sub?: string
        email?: string
        email_verified?: boolean
        name?: string
        picture?: string
      }

      if (!profile.sub || !profile.email) {
        throw new GoogleOAuthError('O perfil do Google veio incompleto.')
      }

      return {
        googleId: profile.sub,
        email: profile.email.trim().toLowerCase(),
        emailVerified: profile.email_verified === true,
        name: profile.name?.trim() || null,
        picture: profile.picture || null,
      }
    },
  }
}
