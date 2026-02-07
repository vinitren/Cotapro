import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { Login, Signup, Dashboard, Customers, Quotes, QuoteCreate, QuoteDetail, Catalog, Settings } from './pages';
import { Toaster } from './components/ui/toaster';
import { useStore } from './store';
import { supabase, getProfile, isSupabaseConfigured } from './lib/supabase';

const MOBILE_BREAKPOINT = 768;

function setViewportHeight() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

function App() {
  const { setSessionFromUser, clearSession } = useStore();

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
    if (!isSupabaseConfigured) return;

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
            });
        } else {
          clearSession();
        }
      })
      .catch(() => {
        clearSession();
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/quotes/new" element={<QuoteCreate />} />
          <Route path="/quotes/:id" element={<QuoteDetail />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
