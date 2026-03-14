import { supabase } from '../supabase/client';

export const uploadFile = async (bucket, path, file) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { data: null, error };
  }
};

export const deleteFile = async (bucket, path) => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { error };
  }
};

export const getPublicUrl = (bucket, path) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

export const uploadClientLogo = async (file, clientId) => {
  if (!file || !clientId) {
    return { data: null, error: new Error('File and clientId are required') };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${clientId}/${fileName}`;

  const { data, error } = await uploadFile('client-logos', filePath, file);

  if (error) {
    return { data: null, error };
  }

  const publicUrl = getPublicUrl('client-logos', filePath);
  return { data: { path: filePath, url: publicUrl }, error: null };
};

export const deleteClientLogo = async (logoUrl) => {
  if (!logoUrl) return { error: null };

  try {
    const urlParts = logoUrl.split('/client-logos/');
    if (urlParts.length < 2) {
      return { error: new Error('Invalid logo URL format') };
    }

    const path = urlParts[1];
    return await deleteFile('client-logos', path);
  } catch (error) {
    console.error('Error deleting client logo:', error);
    return { error };
  }
};

export const getLogoUrl = (path) => {
  if (!path) return null;

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return getPublicUrl('client-logos', path);
};

export const validateImageFile = (file) => {
  const maxSize = 2 * 1024 * 1024; // 2MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 2MB' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File must be PNG, JPEG, SVG, or WebP' };
  }

  return { valid: true, error: null };
};