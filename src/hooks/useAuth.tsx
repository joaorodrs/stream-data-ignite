import { makeRedirectUri, revokeAsync, startAsync } from 'expo-auth-session';
import React, { useEffect, createContext, useContext, useState, ReactNode } from 'react';
import { generateRandom } from 'expo-auth-session/build/PKCE';

import { api } from '../services/api';

interface User {
  id: number;
  display_name: string;
  email: string;
  profile_image_url: string;
}

interface AuthContextData {
  user: User;
  isLoggingOut: boolean;
  isLoggingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthProviderData {
  children: ReactNode;
}

const AuthContext = createContext({} as AuthContextData);

const twitchEndpoints = {
  authorization: 'https://id.twitch.tv/oauth2/authorize',
  revocation: 'https://id.twitch.tv/oauth2/revoke'
};

function AuthProvider({ children }: AuthProviderData) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState({} as User);
  const [userToken, setUserToken] = useState('');

  const { CLIENT_ID } = process.env
  // get CLIENT_ID from environment variables

  async function signIn() {
    try {
      // set isLoggingIn to true
      setIsLoggingIn(true)

      const REDIRECT_URI = makeRedirectUri({ useProxy: true })
      const RESPONSE_TYPE = 'token'
      const SCOPE = encodeURI('openid user:read:email user:read:follows')
      const FORCE_VERIFY = true
      const STATE = generateRandom(30)
      // REDIRECT_URI - create OAuth redirect URI using makeRedirectUri() with "useProxy" option set to true
      // RESPONSE_TYPE - set to "token"
      // SCOPE - create a space-separated list of the following scopes: "openid", "user:read:email" and "user:read:follows"
      // FORCE_VERIFY - set to true
      // STATE - generate random 30-length string using generateRandom() with "size" set to 30

      const authUrl = twitchEndpoints.authorization + 
        `?client_id=${CLIENT_ID}` + 
        `&redirect_uri=${REDIRECT_URI}` + 
        `&response_type=${RESPONSE_TYPE}` + 
        `&scope=${SCOPE}` + 
        `&force_verify=${FORCE_VERIFY}` +
        `&state=${STATE}`;
      // assemble authUrl with twitchEndpoint authorization, client_id, 
      // redirect_uri, response_type, scope, force_verify and state

      const response = await startAsync({ authUrl })
      // call startAsync with authUrl

      if (response.type === 'success' && response.params.error !== 'access_denied') {
        if (response.params.state !== STATE) {
          throw new Error('Invalid state value')
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${response.params.access_token}`

        const userResponse = await api.get('/users');

        setUser(userResponse)
        setUserToken(response.params.access_token)
      }
      // verify if startAsync response.type equals "success" and response.params.error differs from "access_denied"
      // if true, do the following:

        // verify if startAsync response.params.state differs from STATE
        // if true, do the following:
          // throw an error with message "Invalid state value"

        // add access_token to request's authorization header

        // call Twitch API's users route

        // set user state with response from Twitch API's route "/users"
        // set userToken state with response's access_token from startAsync
    } catch (error) {
      throw new Error()
    } finally {
      // set isLoggingIn to false
      setIsLoggingIn(false)
    }
  }

  async function signOut() {
    try {
      // set isLoggingOut to true
      setIsLoggingOut(true)

      await revokeAsync({ token: userToken, clientId: CLIENT_ID }, { revocationEndpoint: twitchEndpoints.revocation })
      // call revokeAsync with access_token, client_id and twitchEndpoint revocation
    } catch (error) {
    } finally {
      setUser({})
      // set user state to an empty User object
      setUserToken('')
      // set userToken state to an empty string

      delete api.defaults.headers.common['Authorization']
      // remove "access_token" from request's authorization header

      setIsLoggingOut(false)
      // set isLoggingOut to false
    }
  }

  useEffect(() => {
    // add client_id to request's "Client-Id" header
    api.defaults.headers.common['Client-Id'] = CLIENT_ID
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoggingOut, isLoggingIn, signIn, signOut }}>
      { children }
    </AuthContext.Provider>
  )
}

function useAuth() {
  const context = useContext(AuthContext);

  return context;
}

export { AuthProvider, useAuth };
