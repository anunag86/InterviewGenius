import { apiRequest } from "./queryClient";

export interface UserProfile {
  id: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profilePictureUrl?: string;
  linkedinProfileUrl?: string;
}

/**
 * Get LinkedIn OAuth authorization URL
 */
export async function getLinkedInAuthUrl(): Promise<string> {
  try {
    const response = await fetch('/api/auth/linkedin/url');
    
    if (!response.ok) {
      throw new Error('Failed to get LinkedIn authorization URL');
    }
    
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error getting LinkedIn auth URL:', error);
    throw new Error('Failed to initiate LinkedIn login');
  }
}

/**
 * Get current authenticated user profile
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });
    
    if (response.status === 401) {
      return null; // Not authenticated
    }
    
    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Log out the current user
 */
export async function logout(): Promise<boolean> {
  try {
    const response = await apiRequest('POST', '/api/auth/logout');
    return response.ok;
  } catch (error) {
    console.error('Error logging out:', error);
    return false;
  }
}