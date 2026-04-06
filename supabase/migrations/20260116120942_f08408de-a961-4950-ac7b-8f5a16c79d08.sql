
-- Delete non-founder users from auth.users
DELETE FROM auth.users WHERE id IN (
  '0e51e7b7-0ec8-4fb3-8198-d50bc9b31ca1',
  '069a2f1f-c050-4851-b30f-e0338318b9e5',
  '498547b8-4eb1-4b73-ae84-afef3db22399',
  'e094ae18-3f4f-464e-8a6b-8311cd29330e'
);
