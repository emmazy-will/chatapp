import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User, Mail, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import './App.css'
import './Authpage.css'

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    password: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  // Clear errors when switching between login/signup
  useEffect(() => {
    setError('');
    setValidationErrors({
      password: '',
      confirmPassword: ''
    });
  }, [isSignUp]);

  // Real-time validation
  useEffect(() => {
    if (isSignUp) {
      const errors = {};
      if (formData.password.length > 0 && formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
      setValidationErrors(errors);
    }
  }, [formData.password, formData.confirmPassword, isSignUp]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Final validation check
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords don't match");
        }
        if (formData.password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }

        const { user } = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        // Set display name and default avatar
        await updateProfile(user, {
          displayName: formData.name,
          photoURL: 'https://res.cloudinary.com/dqvnagonh/image/upload/v1620000000/default-avatar.png'
        });

        // Create user document
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: formData.name,
          email: formData.email,
          img: 'https://res.cloudinary.com/dqvnagonh/image/upload/v1620000000/default-avatar.png',
          lastMessage: "New user",
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
          status: "online"
        });

        navigate('/dashboard', { state: { newUser: true } });
      } else {
        const { user } = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        // Update last seen status
        await setDoc(doc(db, 'users', user.uid), {
          lastSeen: serverTimestamp(),
          status: "online"
        }, { merge: true });

        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(mapAuthError(err.code) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const mapAuthError = (code) => {
    const errors = {
      'auth/email-already-in-use': 'Email is already registered',
      'auth/invalid-email': 'Please enter a valid email address',
      'auth/weak-password': 'Password must be at least 6 characters',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/network-request-failed': 'Network error. Please check your connection',
      'auth/too-many-requests': 'Too many attempts. Try again later',
      'auth/user-disabled': 'This account has been disabled',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/invalid-credential': 'Invalid email or password',
    };
    return errors[code] || 'An error occurred. Please try again.';
  };

  const isSubmitDisabled = () => {
    if (loading) return true;
    if (isSignUp) {
      return (
        !formData.name ||
        !formData.email ||
        !formData.password ||
        !formData.confirmPassword ||
        formData.password !== formData.confirmPassword ||
        formData.password.length < 6
      );
    }
    return !formData.email || !formData.password;
  };

  return (
    <div className="auth-container"style={{background: "linear-gradient(to right, rgb(87, 54, 97), white, rgb(192, 53, 134), white)",}}>
      <div className="auth-card"style={{ background: "linear-gradient(to right, #ff9a9e, #fad0c4, #fad0c4, #ffdde1)",}}>
        <div className="auth-header">
          <h1>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
          <p>{isSignUp ? 'Join our community' : 'Sign in to continue'}</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group with-icon">
              <User className="input-icon" size={18} />
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
                minLength="2"
                aria-label="Full name"
              />
            </div>
          )}

          <div className="form-group with-icon">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
              aria-label="Email address"
            />
          </div>

          <div className="form-group with-icon password-field">
            <Lock className="input-icon" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              aria-label="Password"
            />
            <button 
              type="button" 
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {validationErrors.password && (
              <span className="input-error">{validationErrors.password}</span>
            )}
          </div>

          {isSignUp && (
            <div className="form-group with-icon password-field">
              <Lock className="input-icon" size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                aria-label="Confirm password"
              />
              <button 
                type="button" 
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {validationErrors.confirmPassword && (
                <span className="input-error">{validationErrors.confirmPassword}</span>
              )}
            </div>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={isSubmitDisabled()}
            aria-busy={loading}
            aria-live="polite"
          >
            {loading ? (
              <>
                <Loader2 className="spinner-icon" size={20} />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="button-icon" size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              className="toggle-button"
              onClick={toggleAuthMode}
              aria-label={isSignUp ? 'Switch to sign in' : 'Switch to sign up'}
              disabled={loading}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}