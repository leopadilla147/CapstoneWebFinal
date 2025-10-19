import { supabase } from '../connect-supabase.js';

// Fetch colleges from college_department table
export const fetchColleges = async () => {
  try {
    const { data, error } = await supabase
      .from('college_department')
      .select('department_id, department_name, department_code')
      .order('department_name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching colleges:', error);
    return [];
  }
};

// Fetch courses by department_id
export const fetchCoursesByDepartment = async (departmentId) => {
  if (!departmentId) return [];
  
  try {
    const { data, error } = await supabase
      .from('course')
      .select('course_id, course_name, course_code')
      .eq('department_id', departmentId)
      .order('course_name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
};

// Create notification
export const createNotification = async (notificationData) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};