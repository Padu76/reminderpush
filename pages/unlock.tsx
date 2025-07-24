import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';

export default function UnlockPage() {
  const router = useRouter();
  const { pass } = router.query;

  useEffect(() => {
    if (typeof pass === 'string') {
      Cookies.set('beta-access', pass, { expires: 7 });
      router.push('/');
    }
  }, [pass, router]);

  return <p>Verifica accesso...</p>;
}