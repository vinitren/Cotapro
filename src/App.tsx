import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { Login, Signup, AuthCallback, Dashboard, Customers, Quotes, QuoteCreate, QuoteDetail, PublicQuote, Catalog, Settings, Help } from './pages';
import { Toaster } from './components/ui/toaster';
import { LoadingScreen } from './components/LoadingScreen';
import { useStore } from './store';
import { supabase, getProfile, isSupabaseConfigured } from './lib/supabase';

const MOBILE_BREAKPOINT = 768;

function setViewportHeight() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

function App() {
  const { setSessionFromUser, clearSession } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let mobileListenersActive = false;

    function updateMobileViewport() {
      if (window.innerWidth >= MOBILE_BREAKPOINT) {
        if (mobileListenersActive) {
          window.removeEventListener('resize', setViewportHeight);
          window.removeEventListener('orientationchange', setViewportHeight);
          mobileListenersActive = false;
        }
        return;
      }
      setViewportHeight();
      if (!mobileListenersActive) {
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', setViewportHeight);
        mobileListenersActive = true;
      }
    }

    window.addEventListener('resize', updateMobileViewport);
    updateMobileViewport();

    return () => {
      window.removeEventListener('resize', updateMobileViewport);
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsInitializing(false);
      return;
    }

    setIsInitializing(true);
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          getProfile(session.user.id)
            .then((profile) => {
              setSessionFromUser(session.user.id, session.user.email ?? '', profile);
            })
            .catch(() => {
              setSessionFromUser(session.user.id, session.user.email ?? '', null);
            })
            .finally(() => {
              setIsInitializing(false);
            });
        } else {
          clearSession();
          setIsInitializing(false);
        }
      })
      .catch(() => {
        clearSession();
        setIsInitializing(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        clearSession();
      } else if (session.user) {
        getProfile(session.user.id)
          .then((profile) => {
            setSessionFromUser(session.user.id, session.user.email ?? '', profile);
          })
          .catch(() => {
            setSessionFromUser(session.user.id, session.user.email ?? '', null);
          });
      }
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [setSessionFromUser, clearSession]);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/orcamento/:id" element={<PublicQuote />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/quotes/new" element={<QuoteCreate />} />
          <Route path="/orcamentos/novo" element={<QuoteCreate />} />
          <Route path="/quotes/:id" element={<QuoteDetail />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ajuda" element={<Help />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
