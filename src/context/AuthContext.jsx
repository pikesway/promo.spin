import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brandPermissions, setBrandPermissions] = useState({});

  useEffect(() => {
    const initAuth = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error.message);
        }

        const sessionUser = data?.session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          await fetchProfile(sessionUser.id);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          await fetchProfile(sessionUser.id);
        } else {
          setProfile(null);
          setBrandPermissions({});
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        setProfile(null);
        return;
      }
      setProfile(data);

      if (data?.role === 'client_user' || data?.role === 'staff' || data?.role === 'client_admin') {
        await fetchBrandPermissions(userId);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  const fetchBrandPermissions = async (userId) => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('user_brand_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true);

      const map = {};
      (data || []).forEach(p => { map[p.brand_id] = p; });
      setBrandPermissions(map);
    } catch (err) {
      console.error('Error fetching brand permissions:', err);
      setBrandPermissions({});
    }
  };

  const refreshBrandPermissions = async () => {
    if (user?.id) await fetchBrandPermissions(user.id);
  };

  const getPermittedBrandIds = () => Object.keys(brandPermissions);

  const canAddCampaign = (brandId) => {
    if (!brandId || brandId === 'all') {
      return Object.values(brandPermissions).some(p => p.can_add_campaign);
    }
    return brandPermissions[brandId]?.can_add_campaign === true;
  };

  const canEditCampaign = (brandId) => {
    if (!brandId || brandId === 'all') {
      return Object.values(brandPermissions).some(p => p.can_edit_campaign);
    }
    return brandPermissions[brandId]?.can_edit_campaign === true;
  };

  const canDeleteCampaign = (brandId) => {
    if (!brandId || brandId === 'all') {
      return Object.values(brandPermissions).some(p => p.can_delete_campaign);
    }
    return brandPermissions[brandId]?.can_delete_campaign === true;
  };

  const canActivatePause = (brandId) => {
    if (!brandId || brandId === 'all') {
      return Object.values(brandPermissions).some(p => p.can_activate_pause_campaign);
    }
    return brandPermissions[brandId]?.can_activate_pause_campaign === true;
  };

  const canViewStats = (brandId) => {
    if (!brandId || brandId === 'all') {
      return Object.values(brandPermissions).some(p => p.can_view_stats);
    }
    return brandPermissions[brandId]?.can_view_stats === true;
  };

  const signUp = async (email, password, fullName, role = 'client_user') => {
    if (!supabase) return { data: null, error: new Error('Supabase is not configured') };

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    if (!supabase) return { data: null, error: new Error('Supabase is not configured') };

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    if (!supabase) {
      setProfile(null);
      setBrandPermissions({});
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setProfile(null);
      setBrandPermissions({});
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updateProfile = async (updates) => {
    if (!supabase) return { data: null, error: new Error('Supabase is not configured') };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const isAdmin = () => {
    return profile?.role === 'admin' || profile?.role === 'super_admin';
  };

  const isSuperAdmin = () => {
    return profile?.role === 'super_admin';
  };

  const isClientAdmin = () => {
    return profile?.role === 'client_admin' || profile?.role === 'client';
  };

  const isClientUser = () => {
    return profile?.role === 'client_user';
  };

  const isStaff = () => {
    return profile?.role === 'staff';
  };

  const isClient = () => {
    return isClientAdmin() || isClientUser() || isStaff();
  };

  const canManageUsers = () => {
    return isAdmin() || isClientAdmin();
  };

  const canManageStaff = () => {
    return isAdmin() || isClientAdmin();
  };

  const canManageBrands = () => {
    return isAdmin() || isClientAdmin();
  };

  const getClientId = () => {
    return profile?.client_id ?? null;
  };

  const value = {
    user,
    profile,
    loading,
    brandPermissions,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isAdmin,
    isSuperAdmin,
    isClientAdmin,
    isClientUser,
    isClient,
    isStaff,
    canManageUsers,
    canManageStaff,
    canManageBrands,
    getClientId,
    getPermittedBrandIds,
    canAddCampaign,
    canEditCampaign,
    canDeleteCampaign,
    canActivatePause,
    canViewStats,
    refreshBrandPermissions,
    refreshProfile: () => user ? fetchProfile(user.id) : null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
