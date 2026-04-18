import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useSubscriptionCheck() {
  const [hasAccess, setHasAccess] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAccess = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status, trial_end_date, subscription_end_date')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setSubscriptionStatus(profile.subscription_status);
      const now = new Date();
      let access = false;
      let days = 0;

      if (profile.subscription_status === 'trial') {
        const end = new Date(profile.trial_end_date);
        days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        access = end > now;
      } else if (profile.subscription_status === 'active') {
        const end = new Date(profile.subscription_end_date);
        days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        access = end > now;
      }

      setHasAccess(access);
      setDaysRemaining(Math.max(0, days));
    } catch (error) {
      console.error('Subscription check error:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();
    const interval = setInterval(checkAccess, 3600000);
    return () => clearInterval(interval);
  }, []);

  return { hasAccess, daysRemaining, subscriptionStatus, loading, refresh: checkAccess };
}
