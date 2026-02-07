import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('[admin-users] Starting request processing');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: { schema: 'app_bizgamez_agency' }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log('[admin-users] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-users] User authenticated:', user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      console.log('[admin-users] Forbidden - role:', profile?.role);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { method } = req;
    const url = new URL(req.url);

    if (method === 'POST' && url.pathname.endsWith('/create')) {
      const body = await req.json();
      const { email, password, full_name, role, client_id } = body;

      console.log('[admin-users] Creating user with:', { email, full_name, role, client_id: client_id || 'none' });

      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role
        }
      });

      if (createError) {
        console.error('[admin-users] Auth createUser error:', {
          message: createError.message,
          status: createError.status,
          name: createError.name,
          code: (createError as any).code,
          details: JSON.stringify(createError)
        });
        return new Response(
          JSON.stringify({
            error: `Auth error: ${createError.message}`,
            details: {
              code: (createError as any).code,
              status: createError.status
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[admin-users] Auth user created successfully:', authData.user.id);

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', authData.user.id)
        .maybeSingle();

      console.log('[admin-users] Profile check:', {
        exists: !!existingProfile,
        profileCheckError: profileCheckError?.message,
        profile: existingProfile
      });

      if (!existingProfile) {
        console.log('[admin-users] Creating profile directly');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email,
            full_name: full_name || '',
            role: role || 'client',
            client_id: client_id || null,
            is_active: true
          });

        if (insertError) {
          console.error('[admin-users] Profile insert error:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint
          });
          return new Response(
            JSON.stringify({
              error: `Profile creation failed: ${insertError.message}`,
              details: {
                code: insertError.code,
                hint: insertError.hint
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.log('[admin-users] Profile created successfully');
      } else {
        console.log('[admin-users] Updating existing profile');
        const updateData: { role?: string; client_id?: string | null } = {};
        if (role) updateData.role = role;
        if (client_id !== undefined) updateData.client_id = client_id || null;

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', authData.user.id);

          if (updateError) {
            console.error('[admin-users] Profile update error:', {
              message: updateError.message,
              code: updateError.code
            });
          } else {
            console.log('[admin-users] Profile updated successfully');
          }
        }
      }

      return new Response(
        JSON.stringify({ data: authData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'DELETE') {
      const userId = url.pathname.split('/').pop();

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[admin-users] Unhandled error:', error);
    return new Response(
      JSON.stringify({
        error: `Server error: ${error.message}`,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
