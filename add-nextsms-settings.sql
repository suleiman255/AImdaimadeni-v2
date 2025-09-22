-- Add NextSMS credentials to profiles table
ALTER TABLE profiles 
ADD COLUMN nextsms_username TEXT,
ADD COLUMN nextsms_password TEXT,
ADD COLUMN nextsms_sender_id TEXT;
