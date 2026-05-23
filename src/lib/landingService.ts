import { supabase } from './supabase';

export interface ContactFormData {
  clubName: string;
  email: string;
  message: string;
}

export const submitContactForm = async (data: ContactFormData) => {
  try {
    const { data: inserted, error } = await supabase
      .from('leads')
      .insert({
        club_name: data.clubName,
        email: data.email,
        message: data.message,
        status: 'new'
      })
      .select('id')
      .single();

    if (error) {
      console.error("Error submitting contact form to Supabase:", error);
      throw error;
    }

    return inserted.id;
  } catch (error) {
    console.error("Error submitting contact form: ", error);
    throw error;
  }
};
