import { validateUser, validateCourse } from '../../src/utils/validators';

describe('Validators', () => {
  describe('validateUser', () => {
    it('should return true for valid user data', () => {
      const userData = { username: 'testuser', email: 'test@example.com', password: 'Password123' };
      expect(validateUser(userData)).toBe(true);
    });

    it('should return false for invalid user data', () => {
      const userData = { username: '', email: 'invalid-email', password: '123' };
      expect(validateUser(userData)).toBe(false);
    });
  });

  describe('validateCourse', () => {
    it('should return true for valid course data', () => {
      const courseData = { title: 'Test Course', description: 'A course for testing', duration: 60 };
      expect(validateCourse(courseData)).toBe(true);
    });

    it('should return false for invalid course data', () => {
      const courseData = { title: '', description: 'No title', duration: -10 };
      expect(validateCourse(courseData)).toBe(false);
    });
  });
});