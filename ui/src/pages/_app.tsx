import '../../styles/globals.css'
import type { AppProps } from 'next/app'
import Layout from '../components/Layout'
import axios from 'axios'
import { LibrariesContextProvider } from '../contexts/libraries-context'
import { SettingsContextProvider } from '../contexts/settings-context'

axios.defaults.headers.common['Access-Control-Allow-Origin'] = '*'
function CoreApp({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <LibrariesContextProvider>
        <SettingsContextProvider>
          <Component {...pageProps} />
        </SettingsContextProvider>
      </LibrariesContextProvider>
    </Layout>
  )
}

export default CoreApp