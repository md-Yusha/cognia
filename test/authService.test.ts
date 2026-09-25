import { isAuthorizedCaregiver, getAuthorizedCaregiverEmails } from '../src/services/authService';

describe('Caregiver Auth Service Whitelist', () => {
  const originalEnv = process.env.EXPO_PUBLIC_AUTHORIZED_CAREGIVERS;

  afterEach(() => {
    process.env.EXPO_PUBLIC_AUTHORIZED_CAREGIVERS = originalEnv;
  });

  it('should read authorized caregiver emails from environment variable', () => {
    process.env.EXPO_PUBLIC_AUTHORIZED_CAREGIVERS = 'doctor@cognia.org,nurse@hospital.com';
    const list = getAuthorizedCaregiverEmails();
    expect(list).toContain('doctor@cognia.org');
    expect(list).toContain('nurse@hospital.com');
  });

  it('should accept authorized emails in case-insensitive manner', () => {
    process.env.EXPO_PUBLIC_AUTHORIZED_CAREGIVERS = 'CareGiver@Cognia.Org';
    expect(isAuthorizedCaregiver('caregiver@cognia.org')).toBe(true);
    expect(isAuthorizedCaregiver('CAREGIVER@COGNIA.ORG')).toBe(true);
  });

  it('should strictly reject unauthorized emails', () => {
    process.env.EXPO_PUBLIC_AUTHORIZED_CAREGIVERS = 'authorized@cognia.org';
    expect(isAuthorizedCaregiver('hacker@unknown.com')).toBe(false);
    expect(isAuthorizedCaregiver('random_user@gmail.com')).toBe(false);
    expect(isAuthorizedCaregiver('')).toBe(false);
  });
});

describe('Family Caregiver Registration with Patient Code', () => {
  const { registerFamilyCaregiverWithCode, signInWithEmailService } = require('../src/services/authService');

  it('rejects registration with empty patient code', async () => {
    await expect(
      registerFamilyCaregiverWithCode({
        patientCode: '',
        name: 'Priya Sharma',
        relationship: 'Daughter',
        phone: '+91 9876543210',
        email: 'priya@test.com',
        password: 'password123',
      })
    ).rejects.toThrow('Please enter the Patient Access Code');
  });

  it('rejects registration with short phone number', async () => {
    await expect(
      registerFamilyCaregiverWithCode({
        patientCode: 'TEA-204',
        name: 'Priya Sharma',
        relationship: 'Daughter',
        phone: '123',
        email: 'priya@test.com',
        password: 'password123',
      })
    ).rejects.toThrow('valid phone number');
  });

  it('rejects registration with invalid email or short password', async () => {
    await expect(
      registerFamilyCaregiverWithCode({
        patientCode: 'TEA-204',
        name: 'Priya Sharma',
        relationship: 'Daughter',
        phone: '+91 9876543210',
        email: 'priya',
        password: '123',
      })
    ).rejects.toThrow('valid email address');

    await expect(
      registerFamilyCaregiverWithCode({
        patientCode: 'TEA-204',
        name: 'Priya Sharma',
        relationship: 'Daughter',
        phone: '+91 9876543210',
        email: 'priya@test.com',
        password: '123',
      })
    ).rejects.toThrow('at least 6 characters');
  });

  it('rejects clinical email login for unauthorized email', async () => {
    process.env.EXPO_PUBLIC_AUTHORIZED_CAREGIVERS = 'official_clinic@cognia.org';
    await expect(
      signInWithEmailService('unauthorized_clinic@test.com', 'clinic123', 'clinical')
    ).rejects.toThrow('Access Denied');
  });
});

